#!/usr/bin/env node

/**
 * CODE CLEANUP CLI
 * 
 * Usage:
 *   npx node scripts/code-cleanup.js         # Scan current directory
 *   npx node scripts/code-cleanup.js api     # Scan apps/api
 *   npx node scripts/code-cleanup.js web     # Scan apps/web
 */

import { generateCleanupReport, printCleanupReport } from '../apps/api/src/lib/codeCleanupUtils.js';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.join(__dirname, '..');

async function main() {
  const target = process.argv[2] || 'api';
  const targetDir = path.join(rootDir, 'apps', target);

  console.log(`\n🔍 Scanning directory: ${targetDir}\n`);

  try {
    const report = await generateCleanupReport(targetDir);
    printCleanupReport(report);

    // Exit with error code if issues found
    const totalIssues = 
      report.summary.totalUnusedImports + 
      report.summary.totalNonStandardErrors + 
      report.summary.totalMissingJSDoc;

    if (totalIssues > 0) {
      console.log(`⚠️  Found ${totalIssues} code quality issues to address\n`);
      process.exit(1);
    } else {
      console.log('✅ Code quality check passed!\n');
      process.exit(0);
    }
  } catch (error) {
    console.error('❌ CodeCleanup Error:', error.message);
    process.exit(1);
  }
}

main();
