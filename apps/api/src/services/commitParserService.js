/**
 * COMMIT PARSER SERVICE
 * Parses commit messages and auto-links to bugs/test cases using various patterns
 */

import { getPrismaClient } from '../lib/prisma.js';

const prisma = getPrismaClient();

// Regex patterns for various issue reference formats
const PATTERNS = {
  // Fixes #123, Closes #456, Resolves #789
  closes: /(?:fixes|closes|resolves|fixed|closed|resolved)\s+#(\d+)/gi,
  // References #123, Refs #456
  references: /(?:references|refs?|(?:ref\s*)?#)\s*#?(\d+)/gi,
  // [BUG-123], [TEST-456]
  brackets: /\[([A-Z]+-\d+)\]/g,
  // BUG#123, TEST#456
  hashtag: /([A-Z]+)#(\d+)/g,
  // Manual bug marking: bug: 123, test: 456
  keyword: /(?:bug|test):\s*(\d+)/gi,
};

/**
 * Extract bug IDs from commit message
 * @param {string} message - Commit message
 * @returns {Array<number>} Array of bug IDs
 */
export function extractBugIds(message) {
  if (!message || typeof message !== 'string') {
    return [];
  }

  PATTERNS.closes.lastIndex = 0;
  PATTERNS.references.lastIndex = 0;
  PATTERNS.brackets.lastIndex = 0;
  PATTERNS.hashtag.lastIndex = 0;
  PATTERNS.keyword.lastIndex = 0;

  const bugIds = new Set();

  // Pattern 1: Fixes/Closes/Resolves #123
  let match;
  while ((match = PATTERNS.closes.exec(message)) !== null) {
    bugIds.add(Number(match[1]));
  }

  // Pattern 2: References #123 (less strong signal)
  while ((match = PATTERNS.references.exec(message)) !== null) {
    bugIds.add(Number(match[1]));
  }

  // Pattern 3: [BUG-123]
  const bugBracketPattern = /\[(BUG)-(\d+)\]/gi;
  while ((match = bugBracketPattern.exec(message)) !== null) {
    bugIds.add(Number(match[2]));
  }

  // Pattern 4: BUG#123 (only if BUG prefix)
  while ((match = PATTERNS.hashtag.exec(message)) !== null) {
    if (match[1].toUpperCase() === 'BUG') {
      bugIds.add(Number(match[2]));
    }
  }

  // Pattern 5: keyword format (bug only)
  const bugKeywordPattern = /bug:\s*(\d+)/gi;
  while ((match = bugKeywordPattern.exec(message)) !== null) {
    bugIds.add(Number(match[1]));
  }

  const testBracketPattern = /\[TEST-(\d+)\]/gi;
  while ((match = testBracketPattern.exec(message)) !== null) {
    bugIds.delete(Number(match[1]));
  }

  return Array.from(bugIds);
}

/**
 * Extract test case IDs from commit message
 * @param {string} message - Commit message
 * @returns {Array<number>} Array of test case IDs
 */
export function extractTestIds(message) {
  if (!message || typeof message !== 'string') {
    return [];
  }

  PATTERNS.brackets.lastIndex = 0;
  PATTERNS.hashtag.lastIndex = 0;
  PATTERNS.keyword.lastIndex = 0;

  const testIds = new Set();

  // Pattern 1: TEST-123 in brackets
  const bracketMatches = message.match(PATTERNS.brackets);
  if (bracketMatches) {
    bracketMatches.forEach(m => {
      if (m.includes('TEST')) {
        const num = m.match(/\d+/)[0];
        testIds.add(Number(num));
      }
    });
  }

  // Pattern 2: TEST#123
  let match;
  while ((match = PATTERNS.hashtag.exec(message)) !== null) {
    if (match[1].toUpperCase() === 'TEST') {
      testIds.add(Number(match[2]));
    }
  }

  // Pattern 3: test: 456
  const testKeywordPattern = /test:\s*(\d+)/gi;
  while ((match = testKeywordPattern.exec(message)) !== null) {
    testIds.add(Number(match[1]));
  }

  return Array.from(testIds);
}

/**
 * Extract PR references from commit message
 * @param {string} message - Commit message
 * @returns {Array<number>} Array of PR numbers
 */
export function extractPullRequestNumbers(message) {
  if (!message || typeof message !== 'string') {
    return [];
  }

  const prNumbers = new Set();

  // Pattern: PR #123, MR #456, Pull Request #789
  const prPattern = /(?:pr|pull\s+request|mr)\s*#?(\d+)/gi;
  let match;
  while ((match = prPattern.exec(message)) !== null) {
    prNumbers.add(Number(match[1]));
  }

  return Array.from(prNumbers);
}

/**
 * Parse commit message and extract all linkable data
 * @param {string} message - Commit message
 * @returns {Object} Parsed data
 */
export function parseCommitMessage(message) {
  if (!message || typeof message !== 'string') {
    return {
      bugIds: [],
      testIds: [],
      prNumbers: [],
      mainMessage: '',
    };
  }

  return {
    bugIds: extractBugIds(message),
    testIds: extractTestIds(message),
    prNumbers: extractPullRequestNumbers(message),
    mainMessage: message.trim(),
  };
}

/**
 * Validate and filter bug IDs (check if they actually exist)
 * @param {Array<number>} bugIds - Array of bug IDs
 * @param {number} projectId - Project ID
 * @returns {Promise<Array<Object>>} Valid bugs with details
 */
export async function validateBugIds(bugIds, projectId) {
  if (!bugIds || bugIds.length === 0) return [];

  const bugs = await prisma.bug.findMany({
    where: {
      id: { in: bugIds },
      projectId: Number(projectId),
    },
    select: {
      id: true,
      title: true,
      status: true,
      priority: true,
    },
  });

  return bugs;
}

/**
 * Validate and filter test case IDs
 * @param {Array<number>} testIds - Array of test case IDs
 * @param {number} projectId - Project ID
 * @returns {Promise<Array<Object>>} Valid test cases with details
 */
export async function validateTestIds(testIds, projectId) {
  if (!testIds || testIds.length === 0) return [];

  const testCases = await prisma.testCase.findMany({
    where: {
      id: { in: testIds },
      projectId: Number(projectId),
    },
    select: {
      id: true,
      title: true,
      type: true,
      status: true,
    },
  });

  return testCases;
}

/**
 * Auto-link commit to primary bug (best match)
 * Uses closest match algorithm based on extraction confidence
 * @param {Object} parsedData - Parsed commit data
 * @param {Array<Object>} validBugs - Valid bug records
 * @returns {number|null} Primary bug ID for linking
 */
export function findPrimaryBugLink(parsedData, validBugs) {
  if (!validBugs || validBugs.length === 0) return null;

  const { mainMessage } = parsedData;
  const firstWord = mainMessage.split(/\s+/)[0].toLowerCase();

  // Check if first word is a closing keyword (strong signal)
  if (['fixes', 'closes', 'resolves', 'fixed', 'closed', 'resolved'].includes(firstWord)) {
    // Return the first referenced bug
    return validBugs[0]?.id || null;
  }

  // Otherwise return the first valid bug (could be improved with ML later)
  return validBugs[0]?.id || null;
}

/**
 * Get commit linking stats
 * @param {number} integrationId - Integration ID
 * @returns {Promise<Object>} Linking statistics
 */
export async function getCommitLinkingStats(integrationId) {
  const commits = await prisma.gitCommit.findMany({
    where: { integrationId: Number(integrationId) },
  });

  const totalCommits = commits.length;
  const linkedCommits = commits.filter(c => c.autoLinkedDefectId || c.linkedBugIds.length > 0).length;
  const mentionedTests = commits.reduce((sum, c) => sum + c.mentionedTestIds.length, 0);
  const linkedBugs = commits.reduce((sum, c) => sum + c.linkedBugIds.length, 0);

  return {
    totalCommits,
    linkedCommits,
    linkingRate: totalCommits > 0 ? (linkedCommits / totalCommits * 100).toFixed(2) : 0,
    totalBugLinksCreated: linkedBugs,
    totalTestMentions: mentionedTests,
    averageLinkagesPerCommit: totalCommits > 0 ? (linkedBugs / totalCommits).toFixed(2) : 0,
  };
}

/**
 * Format parsed commit data for storage
 * @param {string} commitMessage - Raw commit message
 * @param {number} projectId - Project ID
 * @returns {Promise<Object>} Formatted data for storage
 */
export async function formatCommitData(commitMessage, projectId) {
  const parsed = parseCommitMessage(commitMessage);

  const validBugs = await validateBugIds(parsed.bugIds, projectId);
  const validTests = await validateTestIds(parsed.testIds, projectId);

  return {
    linkedBugIds: validBugs.map(b => b.id),
    mentionedTestIds: validTests.map(t => t.id),
    autoLinkedDefectId: findPrimaryBugLink(parsed, validBugs),
    bugs: validBugs,
    tests: validTests,
  };
}
