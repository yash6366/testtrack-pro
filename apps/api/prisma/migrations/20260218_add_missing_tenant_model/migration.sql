-- Create missing Tenant table
CREATE TABLE "Tenant" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Tenant_pkey" PRIMARY KEY ("id")
);

-- Add unique constraint on slug  
CREATE UNIQUE INDEX "Tenant_slug_key" ON "Tenant"("slug");

-- Create TenantMembership table
CREATE TABLE "TenantMembership" (
    "id" SERIAL NOT NULL,
    "tenantId" INTEGER NOT NULL,
    "userId" INTEGER NOT NULL,
    "role" TEXT NOT NULL DEFAULT 'MEMBER',
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TenantMembership_pkey" PRIMARY KEY ("id")
);

-- Add unique constraint for tenantId_userId pair
CREATE UNIQUE INDEX "TenantMembership_tenantId_userId_key" ON "TenantMembership"("tenantId", "userId");

-- Create indexes for TenantMembership
CREATE INDEX "TenantMembership_tenantId_idx" ON "TenantMembership"("tenantId");
CREATE INDEX "TenantMembership_userId_idx" ON "TenantMembership"("userId");

-- Add foreign key constraints for TenantMembership
ALTER TABLE "TenantMembership" ADD CONSTRAINT "TenantMembership_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "TenantMembership" ADD CONSTRAINT "TenantMembership_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Add tenantId to ProjectUserAllocation
ALTER TABLE "ProjectUserAllocation" ADD COLUMN "tenantId" INTEGER;

-- Add foreign key for ProjectUserAllocation.tenantId
ALTER TABLE "ProjectUserAllocation" ADD CONSTRAINT "ProjectUserAllocation_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- Create index for ProjectUserAllocation.tenantId
CREATE INDEX "ProjectUserAllocation_tenantId_idx" ON "ProjectUserAllocation"("tenantId");

-- Add tenantId to AuditLog
ALTER TABLE "AuditLog" ADD COLUMN "tenantId" INTEGER;

-- Add foreign key for AuditLog.tenantId
ALTER TABLE "AuditLog" ADD CONSTRAINT "AuditLog_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- Create indexes for AuditLog.tenantId
CREATE INDEX "AuditLog_tenantId_idx" ON "AuditLog"("tenantId");
CREATE INDEX "AuditLog_tenantId_id_idx" ON "AuditLog"("tenantId", "id");

-- Add tenantId to TestCase
ALTER TABLE "TestCase" ADD COLUMN "tenantId" INTEGER;

-- Add foreign key for TestCase.tenantId
ALTER TABLE "TestCase" ADD CONSTRAINT "TestCase_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- Create indexes for TestCase.tenantId
CREATE INDEX "TestCase_tenantId_idx" ON "TestCase"("tenantId");
CREATE INDEX "TestCase_tenantId_id_idx" ON "TestCase"("tenantId", "id");

-- Add tenantId to TestSuite
ALTER TABLE "TestSuite" ADD COLUMN "tenantId" INTEGER;

-- Add foreign key for TestSuite.tenantId
ALTER TABLE "TestSuite" ADD CONSTRAINT "TestSuite_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- Create indexes for TestSuite.tenantId
CREATE INDEX "TestSuite_tenantId_idx" ON "TestSuite"("tenantId");
CREATE INDEX "TestSuite_tenantId_id_idx" ON "TestSuite"("tenantId", "id");

-- Add tenantId to TestRun
ALTER TABLE "TestRun" ADD COLUMN "tenantId" INTEGER;

-- Add foreign key for TestRun.tenantId
ALTER TABLE "TestRun" ADD CONSTRAINT "TestRun_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- Create indexes for TestRun.tenantId
CREATE INDEX "TestRun_tenantId_idx" ON "TestRun"("tenantId");
CREATE INDEX "TestRun_tenantId_id_idx" ON "TestRun"("tenantId", "id");

-- Add tenantId to TestExecution
ALTER TABLE "TestExecution" ADD COLUMN "tenantId" INTEGER;

-- Add foreign key for TestExecution.tenantId
ALTER TABLE "TestExecution" ADD CONSTRAINT "TestExecution_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- Create indexes for TestExecution.tenantId
CREATE INDEX "TestExecution_tenantId_idx" ON "TestExecution"("tenantId");
CREATE INDEX "TestExecution_tenantId_id_idx" ON "TestExecution"("tenantId", "id");
