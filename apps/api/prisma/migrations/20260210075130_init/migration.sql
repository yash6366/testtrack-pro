-- CreateEnum
CREATE TYPE "Role" AS ENUM ('ADMIN', 'DEVELOPER', 'TESTER');

-- CreateEnum
CREATE TYPE "ChannelType" AS ENUM ('CHANNEL', 'DIRECT');

-- CreateEnum
CREATE TYPE "TestCaseType" AS ENUM ('FUNCTIONAL', 'REGRESSION', 'SMOKE', 'SANITY', 'INTEGRATION', 'PERFORMANCE', 'SECURITY', 'USABILITY', 'DATA');

-- CreateEnum
CREATE TYPE "TestCasePriority" AS ENUM ('P0', 'P1', 'P2', 'P3');

-- CreateEnum
CREATE TYPE "TestCaseSeverity" AS ENUM ('CRITICAL', 'MAJOR', 'MINOR', 'TRIVIAL');

-- CreateEnum
CREATE TYPE "TestCaseStatus" AS ENUM ('DRAFT', 'ACTIVE', 'DEPRECATED', 'ARCHIVED');

-- CreateEnum
CREATE TYPE "AutomationStatus" AS ENUM ('MANUAL', 'AUTOMATED', 'HYBRID', 'CANDIDATE');

-- CreateEnum
CREATE TYPE "TestExecutionStatus" AS ENUM ('PASSED', 'FAILED', 'BLOCKED', 'SKIPPED', 'INCONCLUSIVE');

-- CreateEnum
CREATE TYPE "TestResultStatus" AS ENUM ('PASSED', 'FAILED', 'BLOCKED', 'SKIPPED');

-- CreateEnum
CREATE TYPE "EvidenceType" AS ENUM ('SCREENSHOT', 'VIDEO', 'LOG');

-- CreateEnum
CREATE TYPE "BugStatus" AS ENUM ('NEW', 'ASSIGNED', 'IN_PROGRESS', 'FIXED', 'AWAITING_VERIFICATION', 'VERIFIED_FIXED', 'REOPENED', 'CANNOT_REPRODUCE', 'DUPLICATE', 'WORKS_AS_DESIGNED', 'CLOSED', 'DEFERRED', 'WONTFIX');

-- CreateEnum
CREATE TYPE "BugPriority" AS ENUM ('P0', 'P1', 'P2', 'P3', 'P4');

-- CreateEnum
CREATE TYPE "BugSeverity" AS ENUM ('CRITICAL', 'MAJOR', 'MINOR', 'TRIVIAL');

-- CreateEnum
CREATE TYPE "BugEnvironment" AS ENUM ('DEVELOPMENT', 'STAGING', 'UAT', 'PRODUCTION');

-- CreateEnum
CREATE TYPE "BugReproducibility" AS ENUM ('ALWAYS', 'OFTEN', 'SOMETIMES', 'RARELY', 'CANNOT_REPRODUCE');

-- CreateEnum
CREATE TYPE "AuditAction" AS ENUM ('USER_CREATED', 'USER_UPDATED', 'USER_DEACTIVATED', 'USER_REACTIVATED', 'USER_PASSWORD_RESET', 'USER_ROLE_CHANGED', 'USER_ROLE_PERMISSION_UPDATED', 'TESTCASE_CREATED', 'TESTCASE_EDITED', 'TESTCASE_DELETED', 'TESTCASE_RESTORED', 'TESTEXECUTION_STARTED', 'TESTEXECUTION_COMPLETED', 'TESTRESULT_CHANGED', 'TESTRESULT_COMMENTED', 'BUG_CREATED', 'BUG_STATUS_CHANGED', 'BUG_ASSIGNED', 'BUG_COMMENTED', 'BUG_VERIFIED', 'BUG_REOPENED', 'BUG_CLOSED', 'PROJECT_CREATED', 'PROJECT_UPDATED', 'PROJECT_DELETED', 'ADMIN_ACTION', 'CONFIG_CHANGED', 'BACKUP_TRIGGERED', 'BACKUP_RESTORED', 'ANNOUNCEMENT_SENT', 'TESTSUITE_CREATED', 'TESTSUITE_EDITED', 'TESTSUITE_DELETED', 'TESTSUITE_ARCHIVED', 'TESTSUITE_RESTORED', 'TESTSUITE_EXECUTED');

-- CreateEnum
CREATE TYPE "TestSuiteType" AS ENUM ('STATIC', 'DYNAMIC', 'REGRESSION', 'SMOKE', 'SANITY', 'CUSTOM');

-- CreateEnum
CREATE TYPE "TestSuiteStatus" AS ENUM ('ACTIVE', 'ARCHIVED', 'DEPRECATED');

-- CreateEnum
CREATE TYPE "NotificationType" AS ENUM ('BUG_CREATED', 'BUG_ASSIGNED', 'BUG_UPDATED', 'BUG_STATUS_CHANGED', 'BUG_COMMENTED', 'BUG_VERIFIED', 'BUG_REOPENED', 'BUG_RETEST_REQUESTED', 'TESTCASE_CREATED', 'TESTCASE_ASSIGNED', 'TESTCASE_UPDATED', 'TESTCASE_EXECUTED', 'TEST_EXECUTION_FAILED', 'TEST_EXECUTION_BLOCKED', 'TEST_SUITE_COMPLETED', 'USER_MENTIONED', 'COMMENT_REPLIED', 'ANNOUNCEMENT', 'SYSTEM_ALERT', 'ADMIN_NOTIFICATION');

-- CreateEnum
CREATE TYPE "NotificationDigestFrequency" AS ENUM ('INSTANT', 'DAILY', 'WEEKLY', 'NEVER');

-- CreateTable
CREATE TABLE "User" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "password" TEXT NOT NULL,
    "role" "Role" NOT NULL DEFAULT 'DEVELOPER',
    "tokenVersion" INTEGER NOT NULL DEFAULT 0,
    "isVerified" BOOLEAN NOT NULL DEFAULT false,
    "verificationToken" TEXT,
    "verificationTokenExpiry" TIMESTAMP(3),
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "lastLoginAt" TIMESTAMP(3),
    "deactivatedAt" TIMESTAMP(3),
    "deactivatedBy" INTEGER,
    "passwordResetToken" TEXT,
    "passwordResetTokenExpiry" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Channel" (
    "id" SERIAL NOT NULL,
    "name" TEXT,
    "type" "ChannelType" NOT NULL DEFAULT 'CHANNEL',
    "createdById" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Channel_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ChannelMember" (
    "id" SERIAL NOT NULL,
    "channelId" INTEGER NOT NULL,
    "userId" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ChannelMember_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Message" (
    "id" SERIAL NOT NULL,
    "channelId" INTEGER NOT NULL,
    "senderId" INTEGER NOT NULL,
    "body" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Message_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Project" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "description" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdBy" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Project_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TestCase" (
    "id" SERIAL NOT NULL,
    "projectId" INTEGER NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "type" "TestCaseType" NOT NULL DEFAULT 'FUNCTIONAL',
    "priority" "TestCasePriority" NOT NULL DEFAULT 'P2',
    "severity" "TestCaseSeverity" NOT NULL DEFAULT 'MINOR',
    "status" "TestCaseStatus" NOT NULL DEFAULT 'DRAFT',
    "estimatedDurationMinutes" INTEGER,
    "automationStatus" "AutomationStatus" NOT NULL DEFAULT 'MANUAL',
    "automationScriptPath" TEXT,
    "tags" TEXT[],
    "moduleArea" TEXT,
    "version" INTEGER NOT NULL DEFAULT 1,
    "lastModifiedBy" INTEGER,
    "lastModifiedAt" TIMESTAMP(3) NOT NULL,
    "isDeleted" BOOLEAN NOT NULL DEFAULT false,
    "deletedBy" INTEGER,
    "deletedAt" TIMESTAMP(3),
    "createdBy" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "TestCase_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TestStep" (
    "id" SERIAL NOT NULL,
    "testCaseId" INTEGER NOT NULL,
    "stepNumber" INTEGER NOT NULL,
    "action" TEXT NOT NULL,
    "expectedResult" TEXT NOT NULL,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TestStep_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TestCaseVersion" (
    "id" SERIAL NOT NULL,
    "testCaseId" INTEGER NOT NULL,
    "caseVersion" INTEGER NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "type" "TestCaseType" NOT NULL,
    "priority" "TestCasePriority" NOT NULL,
    "severity" "TestCaseSeverity" NOT NULL,
    "status" "TestCaseStatus" NOT NULL,
    "changeNote" TEXT,
    "changedBy" INTEGER NOT NULL,
    "changedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "TestCaseVersion_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TestRun" (
    "id" SERIAL NOT NULL,
    "projectId" INTEGER NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "status" TEXT NOT NULL DEFAULT 'PLANNED',
    "plannedStartDate" TIMESTAMP(3),
    "actualStartDate" TIMESTAMP(3),
    "actualEndDate" TIMESTAMP(3),
    "totalTestCases" INTEGER NOT NULL DEFAULT 0,
    "passedCount" INTEGER NOT NULL DEFAULT 0,
    "failedCount" INTEGER NOT NULL DEFAULT 0,
    "blockedCount" INTEGER NOT NULL DEFAULT 0,
    "skippedCount" INTEGER NOT NULL DEFAULT 0,
    "executedBy" INTEGER NOT NULL,
    "buildVersion" TEXT,
    "environment" TEXT,
    "createdBy" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TestRun_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TestExecution" (
    "id" SERIAL NOT NULL,
    "testRunId" INTEGER NOT NULL,
    "testCaseId" INTEGER NOT NULL,
    "suiteRunId" INTEGER,
    "status" "TestExecutionStatus" NOT NULL,
    "actualResult" TEXT,
    "startedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "completedAt" TIMESTAMP(3),
    "durationSeconds" INTEGER,
    "comments" TEXT,
    "attachmentCount" INTEGER NOT NULL DEFAULT 0,
    "defectId" INTEGER,
    "executedBy" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TestExecution_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TestExecutionStep" (
    "id" SERIAL NOT NULL,
    "executionId" INTEGER NOT NULL,
    "stepId" INTEGER NOT NULL,
    "status" "TestResultStatus" NOT NULL,
    "actualResult" TEXT,
    "notes" TEXT,
    "startedAt" TIMESTAMP(3),
    "completedAt" TIMESTAMP(3),
    "durationSeconds" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TestExecutionStep_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TestExecutionEvidence" (
    "id" SERIAL NOT NULL,
    "executionId" INTEGER NOT NULL,
    "stepId" INTEGER,
    "defectId" INTEGER,
    "type" "EvidenceType" NOT NULL,
    "resourceType" TEXT NOT NULL,
    "publicId" TEXT NOT NULL,
    "secureUrl" TEXT NOT NULL,
    "bytes" INTEGER NOT NULL,
    "format" TEXT NOT NULL,
    "originalFilename" TEXT NOT NULL,
    "uploadedBy" INTEGER NOT NULL,
    "uploadedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "isDeleted" BOOLEAN NOT NULL DEFAULT false,
    "deletedAt" TIMESTAMP(3),
    "deletedBy" INTEGER,

    CONSTRAINT "TestExecutionEvidence_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TestPlan" (
    "id" SERIAL NOT NULL,
    "projectId" INTEGER NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "scope" TEXT,
    "startDate" TIMESTAMP(3),
    "endDate" TIMESTAMP(3),
    "plannerNotes" TEXT,
    "createdBy" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TestPlan_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TestSuite" (
    "id" SERIAL NOT NULL,
    "projectId" INTEGER NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "type" "TestSuiteType" NOT NULL DEFAULT 'STATIC',
    "status" "TestSuiteStatus" NOT NULL DEFAULT 'ACTIVE',
    "parentSuiteId" INTEGER,
    "filterTags" TEXT[],
    "filterTypes" "TestCaseType"[],
    "filterPriorities" "TestCasePriority"[],
    "filterModules" TEXT[],
    "estimatedDurationMinutes" INTEGER,
    "executionOrder" INTEGER NOT NULL DEFAULT 1,
    "isArchived" BOOLEAN NOT NULL DEFAULT false,
    "archivedAt" TIMESTAMP(3),
    "archivedBy" INTEGER,
    "createdBy" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TestSuite_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TestSuiteCase" (
    "id" SERIAL NOT NULL,
    "suiteId" INTEGER NOT NULL,
    "testCaseId" INTEGER NOT NULL,
    "executionOrder" INTEGER NOT NULL DEFAULT 1,
    "isMandatory" BOOLEAN NOT NULL DEFAULT true,
    "addedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "addedBy" INTEGER NOT NULL,

    CONSTRAINT "TestSuiteCase_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TestSuiteRun" (
    "id" SERIAL NOT NULL,
    "suiteId" INTEGER NOT NULL,
    "testRunId" INTEGER,
    "name" TEXT,
    "description" TEXT,
    "status" TEXT NOT NULL DEFAULT 'PLANNED',
    "plannedStartDate" TIMESTAMP(3),
    "actualStartDate" TIMESTAMP(3),
    "actualEndDate" TIMESTAMP(3),
    "totalTestCases" INTEGER NOT NULL DEFAULT 0,
    "executedCount" INTEGER NOT NULL DEFAULT 0,
    "passedCount" INTEGER NOT NULL DEFAULT 0,
    "failedCount" INTEGER NOT NULL DEFAULT 0,
    "blockedCount" INTEGER NOT NULL DEFAULT 0,
    "skippedCount" INTEGER NOT NULL DEFAULT 0,
    "stopOnFailure" BOOLEAN NOT NULL DEFAULT false,
    "executeChildSuites" BOOLEAN NOT NULL DEFAULT true,
    "environment" TEXT,
    "buildVersion" TEXT,
    "executedBy" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TestSuiteRun_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AuditLog" (
    "id" SERIAL NOT NULL,
    "action" "AuditAction" NOT NULL,
    "performedBy" INTEGER NOT NULL,
    "resourceType" TEXT NOT NULL,
    "resourceId" INTEGER,
    "resourceName" TEXT,
    "projectId" INTEGER,
    "description" TEXT NOT NULL,
    "oldValues" TEXT,
    "newValues" TEXT,
    "ipAddress" TEXT,
    "userAgent" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AuditLog_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "LegacyTestRun" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "passRate" DOUBLE PRECISION NOT NULL,
    "executedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "userId" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "LegacyTestRun_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Defect" (
    "id" SERIAL NOT NULL,
    "projectId" INTEGER NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "bugNumber" TEXT NOT NULL,
    "severity" "BugSeverity" NOT NULL DEFAULT 'MINOR',
    "priority" "BugPriority" NOT NULL DEFAULT 'P3',
    "environment" "BugEnvironment" NOT NULL,
    "reproducibility" "BugReproducibility" NOT NULL DEFAULT 'SOMETIMES',
    "affectedVersion" TEXT NOT NULL,
    "affectedBuild" TEXT,
    "targetFixVersion" TEXT,
    "fixedInVersion" TEXT,
    "regressionRiskLevel" TEXT NOT NULL DEFAULT 'MEDIUM',
    "status" "BugStatus" NOT NULL DEFAULT 'NEW',
    "statusChangedAt" TIMESTAMP(3),
    "statusChangedBy" INTEGER,
    "reporterId" INTEGER NOT NULL,
    "assigneeId" INTEGER,
    "verifierId" INTEGER,
    "sourceExecutionId" INTEGER,
    "sourceTestCaseId" INTEGER NOT NULL,
    "duplicateOfId" INTEGER,
    "linkedBugIds" INTEGER[],
    "rootCauseAnalysis" TEXT,
    "rootCauseCategory" TEXT,
    "fixStrategy" TEXT,
    "estimatedFixHours" INTEGER,
    "actualFixHours" DOUBLE PRECISION,
    "fixedInCommitHash" TEXT,
    "fixBranchName" TEXT,
    "codeReviewUrl" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdBy" INTEGER NOT NULL,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "updatedBy" INTEGER NOT NULL,
    "closedAt" TIMESTAMP(3),
    "closedBy" INTEGER,
    "dueDate" TIMESTAMP(3),

    CONSTRAINT "Defect_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DefectComment" (
    "id" SERIAL NOT NULL,
    "defectId" INTEGER NOT NULL,
    "body" TEXT NOT NULL,
    "isInternal" BOOLEAN NOT NULL DEFAULT false,
    "commentedBy" INTEGER NOT NULL,
    "commentedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "editedAt" TIMESTAMP(3),
    "editedBy" INTEGER,

    CONSTRAINT "DefectComment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DefectHistory" (
    "id" SERIAL NOT NULL,
    "defectId" INTEGER NOT NULL,
    "fieldName" TEXT NOT NULL,
    "oldValue" TEXT,
    "newValue" TEXT,
    "changedBy" INTEGER NOT NULL,
    "changedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "changeReason" TEXT,

    CONSTRAINT "DefectHistory_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DefectRetestRequest" (
    "id" SERIAL NOT NULL,
    "defectId" INTEGER NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "requestedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "requestedBy" INTEGER NOT NULL,
    "assignedTo" INTEGER,
    "assignedAt" TIMESTAMP(3),
    "retestExecutionId" INTEGER,
    "completedAt" TIMESTAMP(3),
    "completedBy" INTEGER,
    "notes" TEXT,

    CONSTRAINT "DefectRetestRequest_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Notification" (
    "id" SERIAL NOT NULL,
    "userId" INTEGER NOT NULL,
    "title" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "type" "NotificationType" NOT NULL,
    "sourceType" TEXT,
    "sourceId" INTEGER,
    "relatedUserId" INTEGER,
    "metadata" TEXT,
    "isRead" BOOLEAN NOT NULL DEFAULT false,
    "readAt" TIMESTAMP(3),
    "actionUrl" TEXT,
    "actionType" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expiresAt" TIMESTAMP(3),

    CONSTRAINT "Notification_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "NotificationPreference" (
    "id" SERIAL NOT NULL,
    "userId" INTEGER NOT NULL,
    "emailEnabled" BOOLEAN NOT NULL DEFAULT true,
    "emailBugCreated" BOOLEAN NOT NULL DEFAULT true,
    "emailBugAssigned" BOOLEAN NOT NULL DEFAULT true,
    "emailBugCommented" BOOLEAN NOT NULL DEFAULT true,
    "emailBugStatusChanged" BOOLEAN NOT NULL DEFAULT true,
    "emailTestFailed" BOOLEAN NOT NULL DEFAULT true,
    "emailMentioned" BOOLEAN NOT NULL DEFAULT true,
    "emailAnnouncements" BOOLEAN NOT NULL DEFAULT true,
    "inAppEnabled" BOOLEAN NOT NULL DEFAULT true,
    "inAppBugCreated" BOOLEAN NOT NULL DEFAULT true,
    "inAppBugAssigned" BOOLEAN NOT NULL DEFAULT true,
    "inAppBugCommented" BOOLEAN NOT NULL DEFAULT true,
    "inAppBugStatusChanged" BOOLEAN NOT NULL DEFAULT true,
    "inAppTestFailed" BOOLEAN NOT NULL DEFAULT true,
    "inAppMentioned" BOOLEAN NOT NULL DEFAULT true,
    "inAppAnnouncements" BOOLEAN NOT NULL DEFAULT true,
    "digestEnabled" BOOLEAN NOT NULL DEFAULT false,
    "digestFrequency" "NotificationDigestFrequency" NOT NULL DEFAULT 'INSTANT',
    "digestTime" TEXT,
    "quietHoursEnabled" BOOLEAN NOT NULL DEFAULT false,
    "quietHourStart" TEXT,
    "quietHourEnd" TEXT,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "NotificationPreference_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SavedFilter" (
    "id" SERIAL NOT NULL,
    "userId" INTEGER NOT NULL,
    "name" TEXT NOT NULL,
    "resourceType" TEXT NOT NULL,
    "filterConfig" TEXT NOT NULL,
    "displayColumns" TEXT,
    "sortBy" TEXT NOT NULL DEFAULT 'createdAt',
    "sortOrder" TEXT NOT NULL DEFAULT 'desc',
    "isDefault" BOOLEAN NOT NULL DEFAULT false,
    "isFavorite" BOOLEAN NOT NULL DEFAULT false,
    "usageCount" INTEGER NOT NULL DEFAULT 0,
    "lastUsedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SavedFilter_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SearchIndex" (
    "id" SERIAL NOT NULL,
    "resourceType" TEXT NOT NULL,
    "resourceId" INTEGER NOT NULL,
    "projectId" INTEGER NOT NULL,
    "title" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "tags" TEXT[],
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SearchIndex_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "NotificationDelivery" (
    "id" SERIAL NOT NULL,
    "notificationId" INTEGER NOT NULL,
    "channel" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "sentAt" TIMESTAMP(3),
    "deliveredAt" TIMESTAMP(3),
    "openedAt" TIMESTAMP(3),
    "failureReason" TEXT,
    "retryCount" INTEGER NOT NULL DEFAULT 0,
    "nextRetryAt" TIMESTAMP(3),
    "metadata" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "NotificationDelivery_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "UserActivityLog" (
    "id" SERIAL NOT NULL,
    "userId" INTEGER NOT NULL,
    "projectId" INTEGER,
    "action" TEXT NOT NULL,
    "resourceType" TEXT NOT NULL,
    "resourceId" INTEGER NOT NULL,
    "resourceName" TEXT,
    "details" TEXT,
    "ipAddress" TEXT,
    "userAgent" TEXT,
    "activityAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "UserActivityLog_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DigestSchedule" (
    "id" SERIAL NOT NULL,
    "userId" INTEGER NOT NULL,
    "frequency" TEXT NOT NULL,
    "preferredTime" TEXT NOT NULL,
    "timezone" TEXT NOT NULL DEFAULT 'UTC',
    "lastDigestSentAt" TIMESTAMP(3),
    "nextDigestAt" TIMESTAMP(3),
    "enabled" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "DigestSchedule_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE UNIQUE INDEX "User_verificationToken_key" ON "User"("verificationToken");

-- CreateIndex
CREATE UNIQUE INDEX "User_passwordResetToken_key" ON "User"("passwordResetToken");

-- CreateIndex
CREATE UNIQUE INDEX "ChannelMember_channelId_userId_key" ON "ChannelMember"("channelId", "userId");

-- CreateIndex
CREATE UNIQUE INDEX "Project_name_key" ON "Project"("name");

-- CreateIndex
CREATE UNIQUE INDEX "Project_key_key" ON "Project"("key");

-- CreateIndex
CREATE INDEX "Project_createdBy_idx" ON "Project"("createdBy");

-- CreateIndex
CREATE INDEX "Project_isActive_idx" ON "Project"("isActive");

-- CreateIndex
CREATE INDEX "TestCase_projectId_idx" ON "TestCase"("projectId");

-- CreateIndex
CREATE INDEX "TestCase_status_idx" ON "TestCase"("status");

-- CreateIndex
CREATE INDEX "TestCase_priority_idx" ON "TestCase"("priority");

-- CreateIndex
CREATE INDEX "TestCase_type_idx" ON "TestCase"("type");

-- CreateIndex
CREATE INDEX "TestCase_createdBy_idx" ON "TestCase"("createdBy");

-- CreateIndex
CREATE INDEX "TestCase_isDeleted_idx" ON "TestCase"("isDeleted");

-- CreateIndex
CREATE INDEX "TestCase_createdAt_idx" ON "TestCase"("createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "TestCase_projectId_name_key" ON "TestCase"("projectId", "name");

-- CreateIndex
CREATE INDEX "TestStep_testCaseId_idx" ON "TestStep"("testCaseId");

-- CreateIndex
CREATE UNIQUE INDEX "TestStep_testCaseId_stepNumber_key" ON "TestStep"("testCaseId", "stepNumber");

-- CreateIndex
CREATE INDEX "TestCaseVersion_testCaseId_idx" ON "TestCaseVersion"("testCaseId");

-- CreateIndex
CREATE INDEX "TestCaseVersion_caseVersion_idx" ON "TestCaseVersion"("caseVersion");

-- CreateIndex
CREATE INDEX "TestCaseVersion_changedAt_idx" ON "TestCaseVersion"("changedAt");

-- CreateIndex
CREATE UNIQUE INDEX "TestCaseVersion_testCaseId_caseVersion_key" ON "TestCaseVersion"("testCaseId", "caseVersion");

-- CreateIndex
CREATE INDEX "TestRun_projectId_idx" ON "TestRun"("projectId");

-- CreateIndex
CREATE INDEX "TestRun_status_idx" ON "TestRun"("status");

-- CreateIndex
CREATE INDEX "TestRun_createdAt_idx" ON "TestRun"("createdAt");

-- CreateIndex
CREATE INDEX "TestRun_executedBy_idx" ON "TestRun"("executedBy");

-- CreateIndex
CREATE INDEX "TestExecution_testRunId_idx" ON "TestExecution"("testRunId");

-- CreateIndex
CREATE INDEX "TestExecution_suiteRunId_idx" ON "TestExecution"("suiteRunId");

-- CreateIndex
CREATE INDEX "TestExecution_testCaseId_idx" ON "TestExecution"("testCaseId");

-- CreateIndex
CREATE INDEX "TestExecution_status_idx" ON "TestExecution"("status");

-- CreateIndex
CREATE INDEX "TestExecution_executedBy_idx" ON "TestExecution"("executedBy");

-- CreateIndex
CREATE INDEX "TestExecution_createdAt_idx" ON "TestExecution"("createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "TestExecution_testRunId_testCaseId_key" ON "TestExecution"("testRunId", "testCaseId");

-- CreateIndex
CREATE INDEX "TestExecutionStep_executionId_idx" ON "TestExecutionStep"("executionId");

-- CreateIndex
CREATE INDEX "TestExecutionStep_stepId_idx" ON "TestExecutionStep"("stepId");

-- CreateIndex
CREATE UNIQUE INDEX "TestExecutionStep_executionId_stepId_key" ON "TestExecutionStep"("executionId", "stepId");

-- CreateIndex
CREATE INDEX "TestExecutionEvidence_executionId_idx" ON "TestExecutionEvidence"("executionId");

-- CreateIndex
CREATE INDEX "TestExecutionEvidence_stepId_idx" ON "TestExecutionEvidence"("stepId");

-- CreateIndex
CREATE INDEX "TestExecutionEvidence_defectId_idx" ON "TestExecutionEvidence"("defectId");

-- CreateIndex
CREATE INDEX "TestExecutionEvidence_type_idx" ON "TestExecutionEvidence"("type");

-- CreateIndex
CREATE INDEX "TestExecutionEvidence_isDeleted_idx" ON "TestExecutionEvidence"("isDeleted");

-- CreateIndex
CREATE INDEX "TestPlan_projectId_idx" ON "TestPlan"("projectId");

-- CreateIndex
CREATE INDEX "TestPlan_createdAt_idx" ON "TestPlan"("createdAt");

-- CreateIndex
CREATE INDEX "TestSuite_projectId_idx" ON "TestSuite"("projectId");

-- CreateIndex
CREATE INDEX "TestSuite_parentSuiteId_idx" ON "TestSuite"("parentSuiteId");

-- CreateIndex
CREATE INDEX "TestSuite_status_idx" ON "TestSuite"("status");

-- CreateIndex
CREATE INDEX "TestSuite_type_idx" ON "TestSuite"("type");

-- CreateIndex
CREATE INDEX "TestSuite_isArchived_idx" ON "TestSuite"("isArchived");

-- CreateIndex
CREATE UNIQUE INDEX "TestSuite_projectId_name_key" ON "TestSuite"("projectId", "name");

-- CreateIndex
CREATE INDEX "TestSuiteCase_suiteId_idx" ON "TestSuiteCase"("suiteId");

-- CreateIndex
CREATE INDEX "TestSuiteCase_testCaseId_idx" ON "TestSuiteCase"("testCaseId");

-- CreateIndex
CREATE INDEX "TestSuiteCase_executionOrder_idx" ON "TestSuiteCase"("executionOrder");

-- CreateIndex
CREATE UNIQUE INDEX "TestSuiteCase_suiteId_testCaseId_key" ON "TestSuiteCase"("suiteId", "testCaseId");

-- CreateIndex
CREATE INDEX "TestSuiteRun_suiteId_idx" ON "TestSuiteRun"("suiteId");

-- CreateIndex
CREATE INDEX "TestSuiteRun_testRunId_idx" ON "TestSuiteRun"("testRunId");

-- CreateIndex
CREATE INDEX "TestSuiteRun_status_idx" ON "TestSuiteRun"("status");

-- CreateIndex
CREATE INDEX "TestSuiteRun_executedBy_idx" ON "TestSuiteRun"("executedBy");

-- CreateIndex
CREATE INDEX "TestSuiteRun_createdAt_idx" ON "TestSuiteRun"("createdAt");

-- CreateIndex
CREATE INDEX "AuditLog_performedBy_idx" ON "AuditLog"("performedBy");

-- CreateIndex
CREATE INDEX "AuditLog_action_idx" ON "AuditLog"("action");

-- CreateIndex
CREATE INDEX "AuditLog_resourceType_idx" ON "AuditLog"("resourceType");

-- CreateIndex
CREATE INDEX "AuditLog_resourceId_idx" ON "AuditLog"("resourceId");

-- CreateIndex
CREATE INDEX "AuditLog_projectId_idx" ON "AuditLog"("projectId");

-- CreateIndex
CREATE INDEX "AuditLog_createdAt_idx" ON "AuditLog"("createdAt");

-- CreateIndex
CREATE INDEX "LegacyTestRun_userId_idx" ON "LegacyTestRun"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "Defect_bugNumber_key" ON "Defect"("bugNumber");

-- CreateIndex
CREATE INDEX "Defect_projectId_idx" ON "Defect"("projectId");

-- CreateIndex
CREATE INDEX "Defect_status_idx" ON "Defect"("status");

-- CreateIndex
CREATE INDEX "Defect_priority_idx" ON "Defect"("priority");

-- CreateIndex
CREATE INDEX "Defect_severity_idx" ON "Defect"("severity");

-- CreateIndex
CREATE INDEX "Defect_assigneeId_idx" ON "Defect"("assigneeId");

-- CreateIndex
CREATE INDEX "Defect_reporterId_idx" ON "Defect"("reporterId");

-- CreateIndex
CREATE INDEX "Defect_createdAt_idx" ON "Defect"("createdAt");

-- CreateIndex
CREATE INDEX "Defect_environment_idx" ON "Defect"("environment");

-- CreateIndex
CREATE INDEX "Defect_affectedVersion_idx" ON "Defect"("affectedVersion");

-- CreateIndex
CREATE INDEX "Defect_bugNumber_idx" ON "Defect"("bugNumber");

-- CreateIndex
CREATE INDEX "DefectComment_defectId_idx" ON "DefectComment"("defectId");

-- CreateIndex
CREATE INDEX "DefectComment_commentedAt_idx" ON "DefectComment"("commentedAt");

-- CreateIndex
CREATE INDEX "DefectComment_commentedBy_idx" ON "DefectComment"("commentedBy");

-- CreateIndex
CREATE INDEX "DefectHistory_defectId_idx" ON "DefectHistory"("defectId");

-- CreateIndex
CREATE INDEX "DefectHistory_changedAt_idx" ON "DefectHistory"("changedAt");

-- CreateIndex
CREATE INDEX "DefectHistory_fieldName_idx" ON "DefectHistory"("fieldName");

-- CreateIndex
CREATE INDEX "DefectRetestRequest_defectId_idx" ON "DefectRetestRequest"("defectId");

-- CreateIndex
CREATE INDEX "DefectRetestRequest_status_idx" ON "DefectRetestRequest"("status");

-- CreateIndex
CREATE INDEX "DefectRetestRequest_requestedAt_idx" ON "DefectRetestRequest"("requestedAt");

-- CreateIndex
CREATE INDEX "Notification_userId_isRead_idx" ON "Notification"("userId", "isRead");

-- CreateIndex
CREATE INDEX "Notification_userId_createdAt_idx" ON "Notification"("userId", "createdAt");

-- CreateIndex
CREATE INDEX "Notification_sourceType_sourceId_idx" ON "Notification"("sourceType", "sourceId");

-- CreateIndex
CREATE INDEX "Notification_createdAt_idx" ON "Notification"("createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "NotificationPreference_userId_key" ON "NotificationPreference"("userId");

-- CreateIndex
CREATE INDEX "NotificationPreference_userId_idx" ON "NotificationPreference"("userId");

-- CreateIndex
CREATE INDEX "SavedFilter_userId_resourceType_idx" ON "SavedFilter"("userId", "resourceType");

-- CreateIndex
CREATE INDEX "SavedFilter_userId_isFavorite_idx" ON "SavedFilter"("userId", "isFavorite");

-- CreateIndex
CREATE INDEX "SavedFilter_lastUsedAt_idx" ON "SavedFilter"("lastUsedAt");

-- CreateIndex
CREATE UNIQUE INDEX "SavedFilter_userId_name_key" ON "SavedFilter"("userId", "name");

-- CreateIndex
CREATE INDEX "SearchIndex_resourceType_projectId_idx" ON "SearchIndex"("resourceType", "projectId");

-- CreateIndex
CREATE INDEX "SearchIndex_resourceType_resourceId_idx" ON "SearchIndex"("resourceType", "resourceId");

-- CreateIndex
CREATE INDEX "SearchIndex_updatedAt_idx" ON "SearchIndex"("updatedAt");

-- CreateIndex
CREATE UNIQUE INDEX "SearchIndex_resourceType_resourceId_key" ON "SearchIndex"("resourceType", "resourceId");

-- CreateIndex
CREATE INDEX "NotificationDelivery_notificationId_channel_idx" ON "NotificationDelivery"("notificationId", "channel");

-- CreateIndex
CREATE INDEX "NotificationDelivery_status_sentAt_idx" ON "NotificationDelivery"("status", "sentAt");

-- CreateIndex
CREATE INDEX "NotificationDelivery_notificationId_status_idx" ON "NotificationDelivery"("notificationId", "status");

-- CreateIndex
CREATE INDEX "NotificationDelivery_nextRetryAt_idx" ON "NotificationDelivery"("nextRetryAt");

-- CreateIndex
CREATE INDEX "UserActivityLog_userId_activityAt_idx" ON "UserActivityLog"("userId", "activityAt");

-- CreateIndex
CREATE INDEX "UserActivityLog_resourceType_resourceId_idx" ON "UserActivityLog"("resourceType", "resourceId");

-- CreateIndex
CREATE INDEX "UserActivityLog_projectId_activityAt_idx" ON "UserActivityLog"("projectId", "activityAt");

-- CreateIndex
CREATE UNIQUE INDEX "DigestSchedule_userId_key" ON "DigestSchedule"("userId");

-- CreateIndex
CREATE INDEX "DigestSchedule_userId_enabled_idx" ON "DigestSchedule"("userId", "enabled");

-- CreateIndex
CREATE INDEX "DigestSchedule_nextDigestAt_idx" ON "DigestSchedule"("nextDigestAt");

-- AddForeignKey
ALTER TABLE "User" ADD CONSTRAINT "User_deactivatedBy_fkey" FOREIGN KEY ("deactivatedBy") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Channel" ADD CONSTRAINT "Channel_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ChannelMember" ADD CONSTRAINT "ChannelMember_channelId_fkey" FOREIGN KEY ("channelId") REFERENCES "Channel"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ChannelMember" ADD CONSTRAINT "ChannelMember_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Message" ADD CONSTRAINT "Message_channelId_fkey" FOREIGN KEY ("channelId") REFERENCES "Channel"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Message" ADD CONSTRAINT "Message_senderId_fkey" FOREIGN KEY ("senderId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Project" ADD CONSTRAINT "Project_createdBy_fkey" FOREIGN KEY ("createdBy") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TestCase" ADD CONSTRAINT "TestCase_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TestCase" ADD CONSTRAINT "TestCase_createdBy_fkey" FOREIGN KEY ("createdBy") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TestCase" ADD CONSTRAINT "TestCase_lastModifiedBy_fkey" FOREIGN KEY ("lastModifiedBy") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TestCase" ADD CONSTRAINT "TestCase_deletedBy_fkey" FOREIGN KEY ("deletedBy") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TestStep" ADD CONSTRAINT "TestStep_testCaseId_fkey" FOREIGN KEY ("testCaseId") REFERENCES "TestCase"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TestCaseVersion" ADD CONSTRAINT "TestCaseVersion_testCaseId_fkey" FOREIGN KEY ("testCaseId") REFERENCES "TestCase"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TestCaseVersion" ADD CONSTRAINT "TestCaseVersion_changedBy_fkey" FOREIGN KEY ("changedBy") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TestRun" ADD CONSTRAINT "TestRun_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TestRun" ADD CONSTRAINT "TestRun_executedBy_fkey" FOREIGN KEY ("executedBy") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TestRun" ADD CONSTRAINT "TestRun_createdBy_fkey" FOREIGN KEY ("createdBy") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TestExecution" ADD CONSTRAINT "TestExecution_testRunId_fkey" FOREIGN KEY ("testRunId") REFERENCES "TestRun"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TestExecution" ADD CONSTRAINT "TestExecution_testCaseId_fkey" FOREIGN KEY ("testCaseId") REFERENCES "TestCase"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TestExecution" ADD CONSTRAINT "TestExecution_suiteRunId_fkey" FOREIGN KEY ("suiteRunId") REFERENCES "TestSuiteRun"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TestExecution" ADD CONSTRAINT "TestExecution_executedBy_fkey" FOREIGN KEY ("executedBy") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TestExecutionStep" ADD CONSTRAINT "TestExecutionStep_executionId_fkey" FOREIGN KEY ("executionId") REFERENCES "TestExecution"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TestExecutionStep" ADD CONSTRAINT "TestExecutionStep_stepId_fkey" FOREIGN KEY ("stepId") REFERENCES "TestStep"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TestExecutionEvidence" ADD CONSTRAINT "TestExecutionEvidence_executionId_fkey" FOREIGN KEY ("executionId") REFERENCES "TestExecution"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TestExecutionEvidence" ADD CONSTRAINT "TestExecutionEvidence_executionId_stepId_fkey" FOREIGN KEY ("executionId", "stepId") REFERENCES "TestExecutionStep"("executionId", "stepId") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TestExecutionEvidence" ADD CONSTRAINT "TestExecutionEvidence_uploadedBy_fkey" FOREIGN KEY ("uploadedBy") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TestExecutionEvidence" ADD CONSTRAINT "TestExecutionEvidence_defectId_fkey" FOREIGN KEY ("defectId") REFERENCES "Defect"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TestPlan" ADD CONSTRAINT "TestPlan_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TestPlan" ADD CONSTRAINT "TestPlan_createdBy_fkey" FOREIGN KEY ("createdBy") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TestSuite" ADD CONSTRAINT "TestSuite_parentSuiteId_fkey" FOREIGN KEY ("parentSuiteId") REFERENCES "TestSuite"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TestSuite" ADD CONSTRAINT "TestSuite_archivedBy_fkey" FOREIGN KEY ("archivedBy") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TestSuite" ADD CONSTRAINT "TestSuite_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TestSuite" ADD CONSTRAINT "TestSuite_createdBy_fkey" FOREIGN KEY ("createdBy") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TestSuiteCase" ADD CONSTRAINT "TestSuiteCase_suiteId_fkey" FOREIGN KEY ("suiteId") REFERENCES "TestSuite"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TestSuiteCase" ADD CONSTRAINT "TestSuiteCase_testCaseId_fkey" FOREIGN KEY ("testCaseId") REFERENCES "TestCase"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TestSuiteCase" ADD CONSTRAINT "TestSuiteCase_addedBy_fkey" FOREIGN KEY ("addedBy") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TestSuiteRun" ADD CONSTRAINT "TestSuiteRun_suiteId_fkey" FOREIGN KEY ("suiteId") REFERENCES "TestSuite"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TestSuiteRun" ADD CONSTRAINT "TestSuiteRun_executedBy_fkey" FOREIGN KEY ("executedBy") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TestSuiteRun" ADD CONSTRAINT "TestSuiteRun_testRunId_fkey" FOREIGN KEY ("testRunId") REFERENCES "TestRun"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AuditLog" ADD CONSTRAINT "AuditLog_performedBy_fkey" FOREIGN KEY ("performedBy") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LegacyTestRun" ADD CONSTRAINT "LegacyTestRun_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Defect" ADD CONSTRAINT "Defect_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Defect" ADD CONSTRAINT "Defect_reporterId_fkey" FOREIGN KEY ("reporterId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Defect" ADD CONSTRAINT "Defect_assigneeId_fkey" FOREIGN KEY ("assigneeId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Defect" ADD CONSTRAINT "Defect_verifierId_fkey" FOREIGN KEY ("verifierId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Defect" ADD CONSTRAINT "Defect_createdBy_fkey" FOREIGN KEY ("createdBy") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Defect" ADD CONSTRAINT "Defect_updatedBy_fkey" FOREIGN KEY ("updatedBy") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Defect" ADD CONSTRAINT "Defect_closedBy_fkey" FOREIGN KEY ("closedBy") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Defect" ADD CONSTRAINT "Defect_statusChangedBy_fkey" FOREIGN KEY ("statusChangedBy") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Defect" ADD CONSTRAINT "Defect_duplicateOfId_fkey" FOREIGN KEY ("duplicateOfId") REFERENCES "Defect"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Defect" ADD CONSTRAINT "Defect_sourceExecutionId_fkey" FOREIGN KEY ("sourceExecutionId") REFERENCES "TestExecution"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Defect" ADD CONSTRAINT "Defect_sourceTestCaseId_fkey" FOREIGN KEY ("sourceTestCaseId") REFERENCES "TestCase"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DefectComment" ADD CONSTRAINT "DefectComment_defectId_fkey" FOREIGN KEY ("defectId") REFERENCES "Defect"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DefectComment" ADD CONSTRAINT "DefectComment_commentedBy_fkey" FOREIGN KEY ("commentedBy") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DefectComment" ADD CONSTRAINT "DefectComment_editedBy_fkey" FOREIGN KEY ("editedBy") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DefectHistory" ADD CONSTRAINT "DefectHistory_defectId_fkey" FOREIGN KEY ("defectId") REFERENCES "Defect"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DefectHistory" ADD CONSTRAINT "DefectHistory_changedBy_fkey" FOREIGN KEY ("changedBy") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DefectRetestRequest" ADD CONSTRAINT "DefectRetestRequest_defectId_fkey" FOREIGN KEY ("defectId") REFERENCES "Defect"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DefectRetestRequest" ADD CONSTRAINT "DefectRetestRequest_requestedBy_fkey" FOREIGN KEY ("requestedBy") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DefectRetestRequest" ADD CONSTRAINT "DefectRetestRequest_assignedTo_fkey" FOREIGN KEY ("assignedTo") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DefectRetestRequest" ADD CONSTRAINT "DefectRetestRequest_completedBy_fkey" FOREIGN KEY ("completedBy") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Notification" ADD CONSTRAINT "Notification_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "NotificationPreference" ADD CONSTRAINT "NotificationPreference_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SavedFilter" ADD CONSTRAINT "SavedFilter_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "NotificationDelivery" ADD CONSTRAINT "NotificationDelivery_notificationId_fkey" FOREIGN KEY ("notificationId") REFERENCES "Notification"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserActivityLog" ADD CONSTRAINT "UserActivityLog_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DigestSchedule" ADD CONSTRAINT "DigestSchedule_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
