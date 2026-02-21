/**
 * CODE CLEANUP UTILITIES
 * 
 * Tools for:
 * - Finding unused imports
 * - Removing unused dependencies
 * - Standardizing error messages
 * - Adding JSDoc documentation stubs
 */

import { readFileSync, writeFileSync } from 'fs';
import { glob } from 'glob';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

/**
 * Find all unused imports in a file
 * @param {string} filePath - Path to JavaScript file
 * @returns {Array<Object>} Array of unused imports with line numbers
 */
export function findUnusedImports(filePath) {
  const content = readFileSync(filePath, 'utf-8');
  const lines = content.split('\n');
  const unusedImports = [];

  // Match import statements
  const importRegex = /^import\s+(?:\{([^}]+)\}|(\w+))\s+from\s+['"]([^'"]+)['"];?/m;
  
  let currentLine = 0;
  for (const line of lines) {
    currentLine++;
    const match = line.match(importRegex);
    
    if (match) {
      const importedItems = match[1] || match[2];
      const modulePath = match[3];
      
      // Parse imported names
      const names = importedItems
        .split(',')
        .map(name => name.trim().split(' as ')[0])
        .filter(name => name && !name.startsWith('{'));
      
      // Check if each imported name is used in the file
      for (const name of names) {
        // Skip if it's a type-only import used for typing
        if (name === 'type' || name === 'interface') continue;
        
        // Create regex to find usage (word boundary)
        const usageRegex = new RegExp(`\\b${name}\\b.*`, 'g');
        const matches = content.match(usageRegex) || [];
        
        // If found only in import statement, it's unused
        if (matches.length <= 1) {
          unusedImports.push({
            line: currentLine,
            name,
            modulePath,
            statement: line.trim(),
          });
        }
      }
    }
  }

  return unusedImports;
}

/**
 * Find all JavaScript/TypeScript files to scan
 * @param {string} directory - Directory to scan
 * @returns {Promise<Array<string>>} File paths
 */
export async function findSourceFiles(directory) {
  const patterns = [
    path.join(directory, 'src/**/*.js'),
    path.join(directory, 'src/**/*.ts'),
    path.join(directory, 'src/**/*.jsx'),
    path.join(directory, 'src/**/*.tsx'),
  ];

  let files = [];
  for (const pattern of patterns) {
    const matched = await glob(pattern);
    files = [...files, ...matched];
  }

  return [...new Set(files)]; // Remove duplicates
}

/**
 * Standard error messages to maintain consistency
 */
export const STANDARDIZED_ERRORS = {
  MISSING_ID: 'ID is required',
  MISSING_NAME: 'Name is required',
  MISSING_EMAIL: 'Email is required',
  INVALID_EMAIL: 'Invalid email format',
  NOT_FOUND: 'Resource not found',
  UNAUTHORIZED: 'Unauthorized access',
  FORBIDDEN: 'Access forbidden',
  VALIDATION_ERROR: 'Validation failed',
  DATABASE_ERROR: 'Database operation failed',
  EXTERNAL_SERVICE_ERROR: 'External service error',
  INVALID_INPUT: 'Invalid input provided',
  DUPLICATE_ENTRY: 'Duplicate entry exists',
};

/**
 * Find non-standardized error messages in a file
 * @param {string} filePath - Path to file
 * @returns {Array<Object>} Non-standard error messages
 */
export function findNonStandardizedErrors(filePath) {
  const content = readFileSync(filePath, 'utf-8');
  const lines = content.split('\n');
  const nonStandard = [];

  const errorPatterns = [
    /new Error\(['"`]([^'"`]+)['"`]\)/g,
    /throw new Error\(['"`]([^'"`]+)['"`]\)/g,
    /throw\s+['"`]([^'"`]+)['"`]/g,
  ];

  let lineNumber = 0;
  for (const line of lines) {
    lineNumber++;
    
    for (const pattern of errorPatterns) {
      let match;
      while ((match = pattern.exec(line)) !== null) {
        const errorMsg = match[1];
        const standardized = Object.values(STANDARDIZED_ERRORS).includes(errorMsg);
        
        if (!standardized && errorMsg.length > 3) {
          nonStandard.push({
            line: lineNumber,
            message: errorMsg,
            suggestion: findClosestStandardError(errorMsg),
          });
        }
      }
    }
  }

  return nonStandard;
}

/**
 * Find closest standard error message (simple matching)
 * @param {string} message - Error message to match
 * @returns {string|null} Suggested standard message
 */
function findClosestStandardError(message) {
  const lower = message.toLowerCase();
  
  if (lower.includes('require') || lower.includes('missing')) return STANDARDIZED_ERRORS.MISSING_ID;
  if (lower.includes('not') && lower.includes('found')) return STANDARDIZED_ERRORS.NOT_FOUND;
  if (lower.includes('unauthorized')) return STANDARDIZED_ERRORS.UNAUTHORIZED;
  if (lower.includes('forbidden')) return STANDARDIZED_ERRORS.FORBIDDEN;
  if (lower.includes('validation')) return STANDARDIZED_ERRORS.VALIDATION_ERROR;
  if (lower.includes('duplicate')) return STANDARDIZED_ERRORS.DUPLICATE_ENTRY;
  
  return null;
}

/**
 * Generate JSDoc stub for a function
 * @param {string} functionName - Function name
 * @param {string} line - The function line
 * @returns {string} JSDoc comment stub
 */
export function generateJSDocStub(functionName, line) {
  // Parse parameters
  const paramMatch = line.match(/\(([^)]*)\)/);
  const params = paramMatch ? paramMatch[1].split(',').map(p => p.trim()) : [];

  let jsdoc = '/**\n';
  jsdoc += ` * ${functionName.replace(/([A-Z])/g, ' $1').trim()}\n`;
  
  for (const param of params) {
    if (param && param !== '') {
      jsdoc += ` * @param {*} ${param} - \n`;
    }
  }
  
  jsdoc += ` * @returns {*} \n`;
  jsdoc += ' */\n';

  return jsdoc;
}

/**
 * Find functions missing JSDoc comments
 * @param {string} filePath - Path to file
 * @returns {Array<Object>} Functions missing JSDoc
 */
export function findMissingJSDoc(filePath) {
  const content = readFileSync(filePath, 'utf-8');
  const lines = content.split('\n');
  const missing = [];

  const functionRegex = /(export\s+)?(async\s+)?function\s+(\w+)\s*\(/;
  const arrowRegex = /(export\s+)?const\s+(\w+)\s*=\s*(async\s*)?\(/;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    
    // Check if line has function definition
    const funcMatch = line.match(functionRegex) || line.match(arrowRegex);
    if (!funcMatch) continue;

    // Check if previous non-empty line is JSDoc
    let isDocumented = false;
    for (let j = i - 1; j >= Math.max(0, i - 10); j--) {
      const prevLine = lines[j].trim();
      if (prevLine === '') continue;
      
      isDocumented = prevLine.startsWith('*') || prevLine.startsWith('*/');
      break;
    }

    if (!isDocumented) {
      const functionName = funcMatch[2] || funcMatch[3];
      missing.push({
        line: i + 1,
        functionName,
        statement: line.trim(),
        suggestion: generateJSDocStub(functionName, line),
      });
    }
  }

  return missing;
}

/**
 * Generate cleanup report for a directory
 * @param {string} directory - Directory to scan
 * @returns {Promise<Object>} Cleanup report
 */
export async function generateCleanupReport(directory) {
  const files = await findSourceFiles(directory);
  const report = {
    directory,
    timestamp: new Date().toISOString(),
    files: [],
    summary: {
      totalFiles: files.length,
      filesWithUnusedImports: 0,
      filesWithNonStandardErrors: 0,
      filesWithMissingJSDoc: 0,
      totalUnusedImports: 0,
      totalNonStandardErrors: 0,
      totalMissingJSDoc: 0,
    },
  };

  for (const file of files) {
    const unusedImports = findUnusedImports(file);
    const nonStandardErrors = findNonStandardizedErrors(file);
    const missingJSSDoc = findMissingJSDoc(file);

    if (unusedImports.length > 0 || nonStandardErrors.length > 0 || missingJSSDoc.length > 0) {
      report.files.push({
        path: file,
        unusedImports,
        nonStandardErrors,
        missingJSDoc: missingJSSDoc,
      });

      if (unusedImports.length > 0) report.summary.filesWithUnusedImports++;
      if (nonStandardErrors.length > 0) report.summary.filesWithNonStandardErrors++;
      if (missingJSSDoc.length > 0) report.summary.filesWithMissingJSDoc++;

      report.summary.totalUnusedImports += unusedImports.length;
      report.summary.totalNonStandardErrors += nonStandardErrors.length;
      report.summary.totalMissingJSDoc += missingJSSDoc.length;
    }
  }

  return report;
}

/**
 * Print cleanup report to console
 * @param {Object} report - Report object
 */
export function printCleanupReport(report) {
  console.log('\n' + '='.repeat(70));
  console.log('📊 CODE CLEANUP REPORT');
  console.log('='.repeat(70));
  console.log(`Directory: ${report.directory}`);
  console.log(`Timestamp: ${report.timestamp}\n`);

  console.log('📈 SUMMARY');
  console.log('-'.repeat(70));
  console.log(`Total Files Scanned: ${report.summary.totalFiles}`);
  console.log(`Files with Unused Imports: ${report.summary.filesWithUnusedImports}`);
  console.log(`Files with Non-Standard Errors: ${report.summary.filesWithNonStandardErrors}`);
  console.log(`Files with Missing JSDoc: ${report.summary.filesWithMissingJSDoc}`);
  console.log(`\nTotal Issues Found:`);
  console.log(`  • Unused Imports: ${report.summary.totalUnusedImports}`);
  console.log(`  • Non-Standard Error Messages: ${report.summary.totalNonStandardErrors}`);
  console.log(`  • Missing JSDoc Comments: ${report.summary.totalMissingJSDoc}`);

  if (report.files.length === 0) {
    console.log('\n✅ No issues found!');
  } else {
    console.log('\n📁 FILES WITH ISSUES');
    console.log('-'.repeat(70));

    for (const file of report.files.slice(0, 10)) {
      console.log(`\n${file.path}`);
      
      if (file.unusedImports.length > 0) {
        console.log('  ❌ Unused Imports:');
        file.unusedImports.slice(0, 3).forEach(imp => {
          console.log(`     Line ${imp.line}: ${imp.name}`);
        });
      }

      if (file.nonStandardErrors.length > 0) {
        console.log('  ⚠️  Non-Standard Errors:');
        file.nonStandardErrors.slice(0, 3).forEach(err => {
          console.log(`     Line ${err.line}: "${err.message}"`);
          if (err.suggestion) console.log(`     Suggestion: "${err.suggestion}"`);
        });
      }

      if (file.missingJSDoc.length > 0) {
        console.log('  📝 Missing JSDoc:');
        file.missingJSDoc.slice(0, 3).forEach(doc => {
          console.log(`     Line ${doc.line}: ${doc.functionName}()`);
        });
      }
    }

    if (report.files.length > 10) {
      console.log(`\n... and ${report.files.length - 10} more files`);
    }
  }

  console.log('\n' + '='.repeat(70) + '\n');
}

export default {
  findUnusedImports,
  findSourceFiles,
  findNonStandardizedErrors,
  findMissingJSDoc,
  generateCleanupReport,
  printCleanupReport,
  STANDARDIZED_ERRORS,
};
