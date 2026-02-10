-- AlterTable: Add new fields to TestCase for tester features
ALTER TABLE "TestCase" ADD COLUMN "preconditions" TEXT,
ADD COLUMN "testData" TEXT,
ADD COLUMN "environment" TEXT,
ADD COLUMN "assignedToId" INTEGER,
ADD COLUMN "ownedById" INTEGER;

-- CreateTable: TestCaseTemplate
CREATE TABLE "TestCaseTemplate" (
    "id" SERIAL NOT NULL,
    "projectId" INTEGER NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "category" TEXT,
    "type" "TestCaseType" NOT NULL DEFAULT 'FUNCTIONAL',
    "priority" "TestCasePriority" NOT NULL DEFAULT 'P2',
    "severity" "TestCaseSeverity" NOT NULL DEFAULT 'MINOR',
    "preconditions" TEXT,
    "testData" TEXT,
    "environment" TEXT,
    "moduleArea" TEXT,
    "tags" TEXT[],
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdBy" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TestCaseTemplate_pkey" PRIMARY KEY ("id")
);

-- CreateTable: TemplateStep
CREATE TABLE "TemplateStep" (
    "id" SERIAL NOT NULL,
    "templateId" INTEGER NOT NULL,
    "stepNumber" INTEGER NOT NULL,
    "action" TEXT NOT NULL,
    "expectedResult" TEXT NOT NULL,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TemplateStep_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey: TestCase.assignedToId -> User.id
ALTER TABLE "TestCase" ADD CONSTRAINT "TestCase_assignedToId_fkey" FOREIGN KEY ("assignedToId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey: TestCase.ownedById -> User.id
ALTER TABLE "TestCase" ADD CONSTRAINT "TestCase_ownedById_fkey" FOREIGN KEY ("ownedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey: TestCaseTemplate.projectId -> Project.id
ALTER TABLE "TestCaseTemplate" ADD CONSTRAINT "TestCaseTemplate_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey: TestCaseTemplate.createdBy -> User.id
ALTER TABLE "TestCaseTemplate" ADD CONSTRAINT "TestCaseTemplate_createdBy_fkey" FOREIGN KEY ("createdBy") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey: TemplateStep.templateId -> TestCaseTemplate.id
ALTER TABLE "TemplateStep" ADD CONSTRAINT "TemplateStep_templateId_fkey" FOREIGN KEY ("templateId") REFERENCES "TestCaseTemplate"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- CreateIndex: TestCaseTemplate indexes
CREATE UNIQUE INDEX "TestCaseTemplate_projectId_name_key" ON "TestCaseTemplate"("projectId", "name");
CREATE INDEX "TestCaseTemplate_projectId_idx" ON "TestCaseTemplate"("projectId");
CREATE INDEX "TestCaseTemplate_category_idx" ON "TestCaseTemplate"("category");
CREATE INDEX "TestCaseTemplate_isActive_idx" ON "TestCaseTemplate"("isActive");
CREATE INDEX "TestCaseTemplate_createdAt_idx" ON "TestCaseTemplate"("createdAt");

-- CreateIndex: TemplateStep indexes
CREATE UNIQUE INDEX "TemplateStep_templateId_stepNumber_key" ON "TemplateStep"("templateId", "stepNumber");
CREATE INDEX "TemplateStep_templateId_idx" ON "TemplateStep"("templateId");

-- CreateIndex: TestCase assignment indexes
CREATE INDEX "TestCase_assignedToId_idx" ON "TestCase"("assignedToId");
CREATE INDEX "TestCase_ownedById_idx" ON "TestCase"("ownedById");
