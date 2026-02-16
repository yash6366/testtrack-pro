-- AlterTable
ALTER TABLE "Bug" ADD COLUMN     "actualFixHours" DOUBLE PRECISION,
ADD COLUMN     "codeReviewUrl" TEXT,
ADD COLUMN     "fixBranchName" TEXT,
ADD COLUMN     "fixStrategy" TEXT,
ADD COLUMN     "fixedInCommitHash" TEXT,
ADD COLUMN     "fixedInVersion" TEXT,
ADD COLUMN     "rootCauseAnalysis" TEXT,
ADD COLUMN     "rootCauseCategory" TEXT,
ADD COLUMN     "targetFixVersion" TEXT;
