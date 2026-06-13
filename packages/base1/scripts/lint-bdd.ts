#!/usr/bin/env tsx
/**
 * check-bdd-comments.ts — Check all test files for BDD comment compliance.
 *
 * Every `it()` call must have a preceding comment block containing
 * lines that start with "Given", "When", "Then".
 *
 * Uses native ts.createSourceFile() instead of ts-morph for fast startup.
 *
 * Usage: npx tsx scripts/lint-bdd.ts
 */

import * as fs from 'fs';
import * as path from 'path';
import * as ts from 'typescript';

const CWD = process.cwd();

// ── File discovery ─────────────────────────────────────────────────────────

function collect_test_files(dir: string): string[] {
  const results: string[] = [];
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  for (const entry of entries) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      // skip node_modules
      if (entry.name === 'node_modules') continue;
      results.push(...collect_test_files(full));
    } else if (entry.name.endsWith('.test.ts')) {
      results.push(full);
    }
  }
  return results;
}

// ── AST walk ───────────────────────────────────────────────────────────────

type ItCall = {
  pos: number;
  desc: string | null;
};

/** Recursively visit all CallExpression nodes and collect `it()` calls. */
function collect_it_calls(node: ts.Node, source_file: ts.SourceFile): ItCall[] {
  const results: ItCall[] = [];

  function walk(n: ts.Node): void {
    if (ts.isCallExpression(n)) {
      const desc = is_it_call(n);
      if (desc !== false) {
        results.push({ pos: n.pos, desc });
      }
    }
    ts.forEachChild(n, walk);
  }

  walk(node);
  return results;
}

/**
 * Check if a CallExpression is an `it(...)` family call.
 * Returns the description string if yes, false otherwise.
 */
function is_it_call(node: ts.CallExpression): string | false {
  const callee = node.expression;

  // it('desc', fn)
  if (
    ts.isIdentifier(callee) &&
    callee.text === 'it'
  ) {
    return get_string_arg(node);
  }

  // it.skip('desc', fn)
  if (
    ts.isPropertyAccessExpression(callee) &&
    ts.isIdentifier(callee.expression) &&
    callee.expression.text === 'it'
  ) {
    return get_string_arg(node);
  }

  // it.each([...])('desc', fn) / it.each``('desc', fn)
  if (
    ts.isCallExpression(callee) &&
    ts.isPropertyAccessExpression(callee.expression) &&
    ts.isIdentifier(callee.expression.expression) &&
    callee.expression.expression.text === 'it'
  ) {
    return get_string_arg(node);
  }

  return false;
}

/** Extract first string literal argument from a call. */
function get_string_arg(node: ts.CallExpression): string | null {
  const args = node.arguments;
  if (args.length === 0) return null;
  const first = args[0];
  if (ts.isStringLiteral(first)) {
    return first.text;
  }
  // template literal like `desc`
  if (ts.isNoSubstitutionTemplateLiteral(first)) {
    return first.text;
  }
  return null;
}

// ── BDD comment check ──────────────────────────────────────────────────────

/** Check if comment line contains a BDD keyword. */
function line_has_keyword(line: string, keyword: string): boolean {
  const t = line.trim();
  return t.startsWith('* ' + keyword) || t.startsWith('// ' + keyword);
}

/** Check if comments before `position` contain Given / When / Then. */
function has_bdd_comments(full_text: string, position: number): boolean {
  const ranges = ts.getLeadingCommentRanges(full_text, position);
  if (!ranges || ranges.length === 0) return false;

  let has_given = false;
  let has_when = false;
  let has_then = false;

  for (const r of ranges) {
    const text = full_text.slice(r.pos, r.end);
    for (const line of text.split('\n')) {
      if (line_has_keyword(line, 'Given')) has_given = true;
      if (line_has_keyword(line, 'When')) has_when = true;
      if (line_has_keyword(line, 'Then')) has_then = true;
    }
  }

  return has_given && has_when && has_then;
}

// ── Main ───────────────────────────────────────────────────────────────────

const src_dir = path.join(CWD, 'src');
const test_files = collect_test_files(src_dir);

interface Violation {
  file: string;
  line: number;
  desc: string;
}
const violations: Violation[] = [];
let total_it_calls = 0;

for (const file_path of test_files) {
  const content = fs.readFileSync(file_path, 'utf-8');
  const source_file = ts.createSourceFile(
    file_path,
    content,
    ts.ScriptTarget.Latest,
    false,
  );

  const rel_path = path.relative(CWD, file_path).replace(/\\/g, '/');
  const it_calls = collect_it_calls(source_file, source_file);
  total_it_calls += it_calls.length;

  for (const call of it_calls) {
    if (call.desc === null) continue; // no description string

    const line =
      content.slice(0, call.pos).split('\n').length;

    if (!has_bdd_comments(content, call.pos)) {
      console.log(
        `[FAIL] ${rel_path}:${line}  it('${call.desc}') — missing BDD comment (Given/When/Then)`,
      );
      violations.push({
        file: rel_path,
        line,
        desc: call.desc,
      });
    }
  }
}

// ── Report ─────────────────────────────────────────────────────────────────

if (violations.length === 0) {
  console.log(`[PASS] All ${total_it_calls} test cases have proper BDD comments.`);
} else {
  console.log(`\n${violations.length} violation(s) found.`);
}

process.exit(violations.length > 0 ? 1 : 0);

