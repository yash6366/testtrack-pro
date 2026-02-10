-- CreateEnum
CREATE TYPE "ProjectModule" AS ENUM ('UI', 'BACKEND', 'API', 'DATABASE', 'MOBILE', 'INTEGRATION', 'AUTOMATION', 'SECURITY', 'PERFORMANCE', 'OTHER');

-- CreateEnum
CREATE TYPE "CustomFieldType" AS ENUM ('TEXT', 'NUMBER', 'CHECKBOX', 'SELECT', 'MULTISELECT', 'DATE', 'EMAIL');

-- CreateEnum
CREATE TYPE "ProjectRole" AS ENUM ('PROJECT_MANAGER', 'LEAD_TESTER', 'DEVELOPER', 'QA_ENGINEER', 'AUTOMATION_ENGINEER');

-- AlterTable
ALTER TABLE "Project" ADD COLUMN     "modules" "ProjectModule"[];

-- CreateTable
CREATE TABLE "ProjectEnvironment" (
    "id" SERIAL NOT NULL,
    "projectId" INTEGER NOT NULL,
    "name" TEXT NOT NULL,
    "url" TEXT,
    "description" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ProjectEnvironment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CustomField" (
    "id" SERIAL NOT NULL,
    "projectId" INTEGER NOT NULL,
    "name" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "type" "CustomFieldType" NOT NULL,
    "required" BOOLEAN NOT NULL DEFAULT false,
    "options" TEXT,
    "defaultValue" TEXT,
    "order" INTEGER NOT NULL DEFAULT 0,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CustomField_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ProjectUserAllocation" (
    "id" SERIAL NOT NULL,
    "projectId" INTEGER NOT NULL,
    "userId" INTEGER NOT NULL,
    "role" "ProjectRole" NOT NULL DEFAULT 'QA_ENGINEER',
    "allocationDate" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "unallocationDate" TIMESTAMP(3),
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ProjectUserAllocation_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ProjectEnvironment_projectId_idx" ON "ProjectEnvironment"("projectId");

-- CreateIndex
CREATE UNIQUE INDEX "ProjectEnvironment_projectId_name_key" ON "ProjectEnvironment"("projectId", "name");

-- CreateIndex
CREATE INDEX "CustomField_projectId_idx" ON "CustomField"("projectId");

-- CreateIndex
CREATE INDEX "CustomField_isActive_idx" ON "CustomField"("isActive");

-- CreateIndex
CREATE UNIQUE INDEX "CustomField_projectId_name_key" ON "CustomField"("projectId", "name");

-- CreateIndex
CREATE INDEX "ProjectUserAllocation_projectId_idx" ON "ProjectUserAllocation"("projectId");

-- CreateIndex
CREATE INDEX "ProjectUserAllocation_userId_idx" ON "ProjectUserAllocation"("userId");

-- CreateIndex
CREATE INDEX "ProjectUserAllocation_isActive_idx" ON "ProjectUserAllocation"("isActive");

-- CreateIndex
CREATE UNIQUE INDEX "ProjectUserAllocation_projectId_userId_key" ON "ProjectUserAllocation"("projectId", "userId");

-- AddForeignKey
ALTER TABLE "ProjectEnvironment" ADD CONSTRAINT "ProjectEnvironment_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CustomField" ADD CONSTRAINT "CustomField_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProjectUserAllocation" ADD CONSTRAINT "ProjectUserAllocation_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProjectUserAllocation" ADD CONSTRAINT "ProjectUserAllocation_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
