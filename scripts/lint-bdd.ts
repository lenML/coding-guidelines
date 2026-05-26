#!/usr/bin/env tsx
/**
 * lint-bdd.ts — Check all test files for BDD comment compliance.
 *
 * Every `it()` call must have a preceding comment block containing
 * lines that start with "Given", "When", "Then".
 *
 * Usage: npx tsx tools/lint-bdd.ts
 */

import type { CallExpression, PropertyAccessExpression } from 'ts-morph';
import { Project, SyntaxKind } from 'ts-morph';
import ts from 'typescript';

const project = new Project({ tsConfigFilePath: 'tsconfig.json' });
const CWD = process.cwd().replace(/\\/g, '/');

// ── Helpers ────────────────────────────────────────────────────────────────

/** Is this CallExpression an `it(...)` family call? */
function is_it_call(node: CallExpression): boolean {
  const callee = node.getExpression();
  const kind = callee.getKind();

  if (kind === SyntaxKind.Identifier) {
    return callee.getText() === 'it';
  }

  if (kind === SyntaxKind.PropertyAccessExpression) {
    const prop = callee as PropertyAccessExpression;
    const obj = prop.getExpression();
    return obj.getKind() === SyntaxKind.Identifier && obj.getText() === 'it';
  }

  // Handle it.each([...])('desc', fn)
  if (kind === SyntaxKind.CallExpression) {
    return is_it_call(callee as CallExpression);
  }

  return false;
}

/** Get the description string if first arg is a string literal, else null. */
function get_description(node: CallExpression): string | null {
  const args = node.getArguments();
  if (args.length === 0) {return null;}
  const first = args[0];
  if (first.getKind() === SyntaxKind.StringLiteral) {
    // strip surrounding quotes
    const raw = first.getText();
    return raw.slice(1, raw.length - 1);
  }
  return null;
}

/** Check if comment line contains a BDD keyword. */
function line_has_keyword(line: string, keyword: string): boolean {
  const t = line.trim();
  // JSDoc: " * Given ..."   Line comment: "// Given ..."
  return t.startsWith('* ' + keyword) || t.startsWith('// ' + keyword);
}

/** Check if comments before `position` contain Given / When / Then. */
function has_bdd_comments(full_text: string, position: number): boolean {
  const ranges = ts.getLeadingCommentRanges(full_text, position);
  if (!ranges || ranges.length === 0) {return false;}

  let has_given = false;
  let has_when = false;
  let has_then = false;

  for (const r of ranges) {
    const text = full_text.slice(r.pos, r.end);
    for (const line of text.split('\n')) {
      if (line_has_keyword(line, 'Given')) {has_given = true;}
      if (line_has_keyword(line, 'When')) {has_when = true;}
      if (line_has_keyword(line, 'Then')) {has_then = true;}
    }
  }

  return has_given && has_when && has_then;
}

// ── Main ───────────────────────────────────────────────────────────────────

const source_files = project.getSourceFiles().filter((f) => {
  const p = f.getFilePath().replace(/\\/g, '/');
  return p.includes('/src/') && p.endsWith('.test.ts');
});

// Collect violations for reporting
interface Violation { file: string; line: number; desc: string }
const violations: Violation[] = [];

for (const sf of source_files) {
  const full_text = sf.getFullText();
  const rel_path = sf.getFilePath().replace(/\\/g, '/').replace(CWD + '/', '');
  const calls = sf.getDescendantsOfKind(SyntaxKind.CallExpression);

  for (const call of calls) {
    if (!is_it_call(call)) {continue;}

    const desc = get_description(call);
    if (desc === null) {continue;} // skip it.each([...]) inner calls etc.

    const pos = call.getPos();
    const line = full_text.slice(0, pos).split('\n').length;

    if (!has_bdd_comments(full_text, pos)) {
      console.log(`[FAIL] ${rel_path}:${line}  it('${desc}') — missing BDD comment (Given/When/Then)`);
      violations.push({ file: rel_path, line, desc });
    }
  }
}

// ── Report ─────────────────────────────────────────────────────────────────

if (violations.length === 0) {
  console.log('[PASS] All test files have proper BDD comments.');
}

process.exit(violations.length > 0 ? 1 : 0);

