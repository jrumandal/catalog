#!/usr/bin/env node
/**
 * Auto-increment publish for a single-package repo (the root package.json is
 * the published package).
 *
 * 1. Query the GitHub Packages registry for the latest published version.
 * 2. Bump the patch version (or start at 0.0.1 if none published yet).
 * 3. Write the new version to package.json.
 * 4. `npm publish --access public` to the GitHub Packages registry.
 *
 * Auth is read from the ambient npmrc (CI writes it from the NPM_TOKEN secret).
 */
import { execSync } from 'node:child_process';
import { readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, '..');
const registry = 'https://npm.pkg.github.com/';

const pkgPath = join(root, 'package.json');
const pkg = JSON.parse(readFileSync(pkgPath, 'utf8'));

function latestVersion(name) {
  try {
    const out = execSync(
      `npm view ${JSON.stringify(name)} versions --registry=${registry} --json`,
      { encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] },
    );
    const versions = JSON.parse(out);
    if (Array.isArray(versions) && versions.length > 0) {
      return versions[versions.length - 1];
    }
  } catch {
    // Not published yet (or registry unreachable) — start fresh.
  }
  return null;
}

function bumpPatch(version) {
  const parts = version.split('.').map((n) => parseInt(n, 10));
  while (parts.length < 3) parts.push(0);
  parts[2] += 1;
  return parts.join('.');
}

const latest = latestVersion(pkg.name);
const next = latest ? bumpPatch(latest) : '0.0.1';
console.log(`Publishing ${pkg.name}@${next} (latest published: ${latest ?? 'none'})`);

pkg.version = next;
writeFileSync(pkgPath, `${JSON.stringify(pkg, null, 2)}\n`);

execSync(`npm publish --access public --registry=${registry}`, {
  cwd: root,
  stdio: 'inherit',
});

console.log(`Published ${pkg.name}@${next}`);
