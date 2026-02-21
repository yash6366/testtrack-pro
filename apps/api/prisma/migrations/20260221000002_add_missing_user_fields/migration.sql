-- Add missing fields to User table for mute functionality and admin controls
ALTER TABLE "User" ADD COLUMN "isMuted" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "User" ADD COLUMN "mutedUntil" TIMESTAMP(3);
ALTER TABLE "User" ADD COLUMN "muteReason" TEXT;
ALTER TABLE "User" ADD COLUMN "mutedBy" INTEGER;

-- Add foreign key for mutedBy
ALTER TABLE "User" ADD CONSTRAINT "User_mutedBy_fkey" FOREIGN KEY ("mutedBy") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- Create index for isMuted
CREATE INDEX "User_isMuted_idx" ON "User"("isMuted");
