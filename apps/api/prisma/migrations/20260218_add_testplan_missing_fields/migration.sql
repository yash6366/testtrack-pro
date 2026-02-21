-- Add missing fields to TestPlan model
-- These fields are actively used by the testPlanService.js but were missing from the schema

ALTER TABLE "TestPlan" ADD COLUMN "scope" TEXT;
ALTER TABLE "TestPlan" ADD COLUMN "testCaseIds" INTEGER[] DEFAULT ARRAY[]::INTEGER[];
ALTER TABLE "TestPlan" ADD COLUMN "plannedDuration" INTEGER;
ALTER TABLE "TestPlan" ADD COLUMN "plannerNotes" TEXT;
