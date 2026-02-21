-- DropForeignKey for tenantId columns
ALTER TABLE "ProjectUserAllocation" DROP CONSTRAINT IF EXISTS "ProjectUserAllocation_tenantId_fkey";
ALTER TABLE "AuditLog" DROP CONSTRAINT IF EXISTS "AuditLog_tenantId_fkey";
ALTER TABLE "TestCase" DROP CONSTRAINT IF EXISTS "TestCase_tenantId_fkey";
ALTER TABLE "TestSuite" DROP CONSTRAINT IF EXISTS "TestSuite_tenantId_fkey";
ALTER TABLE "TestRun" DROP CONSTRAINT IF EXISTS "TestRun_tenantId_fkey";
ALTER TABLE "TestExecution" DROP CONSTRAINT IF EXISTS "TestExecution_tenantId_fkey";
ALTER TABLE "Bug" DROP CONSTRAINT IF EXISTS "Bug_tenantId_fkey";
ALTER TABLE "Milestone" DROP CONSTRAINT IF EXISTS "Milestone_tenantId_fkey";
ALTER TABLE "ApiKey" DROP CONSTRAINT IF EXISTS "ApiKey_tenantId_fkey";
ALTER TABLE "Webhook" DROP CONSTRAINT IF EXISTS "Webhook_tenantId_fkey";
ALTER TABLE "Project" DROP CONSTRAINT IF EXISTS "Project_tenantId_fkey";

-- DropForeignKey for TenantMembership
ALTER TABLE "TenantMembership" DROP CONSTRAINT IF EXISTS "TenantMembership_tenantId_fkey";
ALTER TABLE "TenantMembership" DROP CONSTRAINT IF EXISTS "TenantMembership_userId_fkey";

-- DropIndex for tenantId columns
DROP INDEX IF EXISTS "ProjectUserAllocation_tenantId_idx";
DROP INDEX IF EXISTS "AuditLog_tenantId_id_idx";
DROP INDEX IF EXISTS "AuditLog_tenantId_idx";
DROP INDEX IF EXISTS "TestCase_tenantId_id_idx";
DROP INDEX IF EXISTS "TestCase_tenantId_idx";
DROP INDEX IF EXISTS "TestCaseTemplate_tenantId_id_idx";
DROP INDEX IF EXISTS "TestCaseTemplate_tenantId_projectId_idx";
DROP INDEX IF EXISTS "TestSuite_tenantId_id_idx";
DROP INDEX IF EXISTS "TestSuite_tenantId_idx";
DROP INDEX IF EXISTS "TestRun_tenantId_id_idx";
DROP INDEX IF EXISTS "TestRun_tenantId_idx";
DROP INDEX IF EXISTS "TestExecution_tenantId_id_idx";
DROP INDEX IF EXISTS "TestExecution_tenantId_idx";
DROP INDEX IF EXISTS "Bug_tenantId_id_idx";
DROP INDEX IF EXISTS "Bug_tenantId_idx";
DROP INDEX IF EXISTS "Milestone_tenantId_id_idx";
DROP INDEX IF EXISTS "Milestone_tenantId_idx";
DROP INDEX IF EXISTS "ApiKey_tenantId_id_idx";
DROP INDEX IF EXISTS "ApiKey_tenantId_idx";
DROP INDEX IF EXISTS "Webhook_tenantId_id_idx";
DROP INDEX IF EXISTS "Webhook_tenantId_idx";
DROP INDEX IF EXISTS "Project_tenantId_id_idx";
DROP INDEX IF EXISTS "Project_tenantId_idx";

-- DropIndex for Tenant table
DROP INDEX IF EXISTS "Tenant_name_idx";
DROP INDEX IF EXISTS "Tenant_isActive_idx";

-- DropIndex for TenantMembership table
DROP INDEX IF EXISTS "TenantMembership_tenantId_userId_key";
DROP INDEX IF EXISTS "TenantMembership_tenantId_idx";
DROP INDEX IF EXISTS "TenantMembership_userId_idx";

-- AlterTable: Drop tenantId columns
ALTER TABLE "ProjectUserAllocation" DROP COLUMN IF EXISTS "tenantId";
ALTER TABLE "AuditLog" DROP COLUMN IF EXISTS "tenantId";
ALTER TABLE "TestCase" DROP COLUMN IF EXISTS "tenantId";
ALTER TABLE "TestCaseTemplate" DROP COLUMN IF EXISTS "tenantId";
ALTER TABLE "TestSuite" DROP COLUMN IF EXISTS "tenantId";
ALTER TABLE "TestRun" DROP COLUMN IF EXISTS "tenantId";
ALTER TABLE "TestExecution" DROP COLUMN IF EXISTS "tenantId";
ALTER TABLE "Bug" DROP COLUMN IF EXISTS "tenantId";
ALTER TABLE "Milestone" DROP COLUMN IF EXISTS "tenantId";
ALTER TABLE "ApiKey" DROP COLUMN IF EXISTS "tenantId";
ALTER TABLE "Webhook" DROP COLUMN IF EXISTS "tenantId";
ALTER TABLE "Project" DROP COLUMN IF EXISTS "tenantId";
ALTER TABLE "SearchIndex" DROP COLUMN IF EXISTS "tenantId";

-- DropTable TenantMembership
DROP TABLE IF EXISTS "TenantMembership";

-- DropTable Tenant
DROP TABLE IF EXISTS "Tenant";
