-- Add missing fields to Channel table
ALTER TABLE "Channel" ADD COLUMN "allowedRoles" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[];
ALTER TABLE "Channel" ADD COLUMN "projectName" TEXT;
ALTER TABLE "Channel" ADD COLUMN "archived" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "Channel" ADD COLUMN "isLocked" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "Channel" ADD COLUMN "lockedById" INTEGER;
ALTER TABLE "Channel" ADD COLUMN "lockedAt" TIMESTAMP(3);
ALTER TABLE "Channel" ADD COLUMN "isDisabled" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "Channel" ADD COLUMN "disabledById" INTEGER;
ALTER TABLE "Channel" ADD COLUMN "disabledAt" TIMESTAMP(3);

-- Add foreign keys
ALTER TABLE "Channel" ADD CONSTRAINT "Channel_lockedById_fkey" FOREIGN KEY ("lockedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "Channel" ADD CONSTRAINT "Channel_disabledById_fkey" FOREIGN KEY ("disabledById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- Create indexes
CREATE INDEX "Channel_type_idx" ON "Channel"("type");
CREATE INDEX "Channel_archived_idx" ON "Channel"("archived");
