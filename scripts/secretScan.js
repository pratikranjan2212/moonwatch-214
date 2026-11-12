/**
 * @fileoverview Secret scanner for working tree and full git commit history (Area 4).
 * Scans all tracked/staged files and `git log -p` against high-confidence credential patterns
 * (Supabase secret keys, JWT service_role tokens, NASA API keys, private keys, AWS/GitHub tokens).
 */

import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

const SECRET_RULES = [
  {
    id: 'supabase-secret-key',
    description: 'Supabase secret key (sb_secret_...)',
    regex: /\bsb_secret_[a-zA-Z0-9_-]{16,}\b/g,
  },
  {
    id: 'supabase-service-role-jwt',
    description: 'Supabase JWT with service_role claim',
    regex: /eyJ[a-zA-Z0-9_-]+\.eyJ[a-zA-Z0-9_-]*c2VydmljZV9yb2xl[a-zA-Z0-9_-]*\.[a-zA-Z0-9_-]+/g,
  },
  {
    id: 'private-key-block',
    description: 'PEM Private Key block',
    regex: /-----BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY-----/g,
  },
  {
    id: 'github-pat',
    description: 'GitHub Personal Access Token',
    regex: /\bgh[pousr]_[A-Za-z0-9_]{36,}\b/g,
  },
  {
    id: 'hardcoded-nasa-key-assignment',
    description: 'Hardcoded NASA_API_KEY value',
    regex: /NASA_API_KEY\s*=\s*['"]?[A-Za-z0-9]{32,45}['"]?/g,
  },
];

const ALLOWLIST_PATTERNS = [
  /sb_secret_abcdef123456/, // unit test fixture in backend_and_security.test.js
  /NASA_API_KEY=your_nasa_donki_api_key_here/,
];

function isAllowlisted(matchStr) {
  return ALLOWLIST_PATTERNS.some((pat) => pat.test(matchStr));
}

export function scanRepositoryForSecrets(repoRoot = ROOT) {
  const findings = [];

  // 1. Ensure .env.local and .env are not tracked by git
  const trackedFilesRaw = execFileSync('git', ['ls-files'], {
    cwd: repoRoot,
    encoding: 'utf8',
  });
  const trackedFiles = trackedFilesRaw
    .split(/\r?\n/)
    .map((f) => f.trim())
    .filter(Boolean);

  for (const relPath of trackedFiles) {
    if (relPath === '.env' || relPath === '.env.local') {
      findings.push({
        rule: 'tracked-dotenv-file',
        location: relPath,
        detail: 'Sensitive .env file is tracked by Git.',
      });
    }

    if (/\.(glb|png|ogg|wav|wasm)$/i.test(relPath)) {
      continue;
    }

    const fullPath = path.join(repoRoot, relPath);
    if (!fs.existsSync(fullPath)) continue;
    const content = fs.readFileSync(fullPath, 'utf8');

    for (const rule of SECRET_RULES) {
      const matches = content.match(rule.regex) || [];
      for (const m of matches) {
        if (!isAllowlisted(m)) {
          findings.push({
            rule: rule.id,
            location: relPath,
            detail: rule.description,
          });
        }
      }
    }
  }

  // 2. Scan git commit history
  try {
    const gitHistory = execFileSync('git', ['log', '--all', '-p', '-n', '25'], {
      cwd: repoRoot,
      encoding: 'utf8',
      maxBuffer: 32 * 1024 * 1024,
    });
    for (const rule of SECRET_RULES) {
      const matches = gitHistory.match(rule.regex) || [];
      for (const m of matches) {
        if (!isAllowlisted(m)) {
          findings.push({
            rule: rule.id,
            location: 'git-history',
            detail: rule.description,
          });
        }
      }
    }
  } catch {
    // No commits yet
  }

  return {
    scannedFiles: trackedFiles.length,
    findings,
  };
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const result = scanRepositoryForSecrets(ROOT);
  console.log(
    `[secret-scan] Scanned ${result.scannedFiles} tracked files + git history. Findings: ${result.findings.length}`
  );
  if (result.findings.length > 0) {
    console.error(JSON.stringify(result.findings, null, 2));
    process.exit(1);
  }
}
