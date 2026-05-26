#!/usr/bin/env tsx
/**
 * check-encoding.ts — Check file encoding and line endings for UTF-8 (no BOM) + LF.
 *
 * Usage: npx tsx scripts/lint-encoding.ts
 */

import { readFileSync, readdirSync, statSync } from "fs";
import { join, extname } from "path";

const CWD = process.cwd().replace(/\\/g, "/");

const SKIP_DIRS = new Set(["node_modules", ".git", "dist"]);
const SKIP_EXTS = new Set([".db", ".sqlite"]);
const SKIP_FILES = new Set(["data.sqlite"]);
const SCAN_DIRS = ["src", "docs", "tools"];
const SCAN_ROOT_EXTS = new Set([".md", ".json"]);

interface FileIssue {
  file_path: string;
  issues: string[];
}

function should_skip(name: string): boolean {
  if (SKIP_DIRS.has(name)) return true;
  if (SKIP_FILES.has(name)) return true;
  if (SKIP_EXTS.has(extname(name).toLowerCase())) return true;
  return false;
}

function collect_files(dir: string): string[] {
  const files: string[] = [];
  let entries: string[];
  try {
    entries = readdirSync(dir);
  } catch {
    return files;
  }
  for (const entry of entries) {
    if (should_skip(entry)) continue;
    const full_path = join(dir, entry);
    let stat;
    try {
      stat = statSync(full_path);
    } catch {
      continue;
    }
    if (stat.isDirectory()) {
      files.push(...collect_files(full_path));
    } else if (stat.isFile()) {
      files.push(full_path);
    }
  }
  return files;
}

function check_file(file_path: string): string[] {
  const errors: string[] = [];
  let buffer: Buffer;
  try {
    buffer = readFileSync(file_path);
  } catch {
    errors.push("Cannot read file");
    return errors;
  }

  // Check BOM (UTF-8 BOM = EF BB BF)
  if (
    buffer.length >= 3 &&
    buffer[0] === 0xef &&
    buffer[1] === 0xbb &&
    buffer[2] === 0xbf
  ) {
    errors.push("UTF-8 BOM detected");
  }

  // Try decode as UTF-8 and check CRLF
  try {
    const content = buffer.toString("utf-8");
    if (content.includes("\r\n")) {
      const lines = content.split("\n");
      for (let i = 0; i < lines.length; i++) {
        if (lines[i].endsWith("\r")) {
          errors.push(`CRLF line ending at line ${i + 1}`);
          break;
        }
      }
    }
  } catch {
    errors.push("Not valid UTF-8 (corrupted)");
  }

  return errors;
}

// ── Main ───────────────────────────────────────────────────────────────────

const all_issues: FileIssue[] = [];
let total_files = 0;

// Scan directories
for (const dir_name of SCAN_DIRS) {
  const dir_path = join(CWD, dir_name);
  try {
    if (statSync(dir_path).isDirectory()) {
      const files = collect_files(dir_path);
      for (const f of files) {
        total_files++;
        const errors = check_file(f);
        if (errors.length > 0) {
          const normalized = f.replace(/\\/g, "/");
          const rel_path = normalized.replace(CWD + "/", "");
          all_issues.push({ file_path: rel_path, issues: errors });
        }
      }
    }
  } catch {
    // skip if dir doesn"t exist
  }
}

// Scan root .md and .json files
let root_entries: string[];
try {
  root_entries = readdirSync(CWD);
} catch {
  root_entries = [];
}
for (const entry of root_entries) {
  if (should_skip(entry)) continue;
  if (!SCAN_ROOT_EXTS.has(extname(entry).toLowerCase())) continue;
  const full_path = join(CWD, entry);
  try {
    if (statSync(full_path).isFile()) {
      total_files++;
      const errors = check_file(full_path);
      if (errors.length > 0) {
        all_issues.push({ file_path: entry, issues: errors });
      }
    }
  } catch {
    // skip
  }
}

// ── Report ─────────────────────────────────────────────────────────────────

if (all_issues.length === 0) {
  console.log(
    `[PASS] Encoding check passed. ${total_files} files scanned, 0 issues.`
  );
  process.exit(0);
}

console.log("[FAIL] Encoding issues found:");
let total_issues = 0;
for (const { file_path, issues } of all_issues) {
  for (const issue of issues) {
    console.log(`  ${file_path}: ${issue}`);
    total_issues++;
  }
}
console.log(
  `${total_files} files scanned, ${total_issues} issues in ${all_issues.length} files.`
);
process.exit(1);
