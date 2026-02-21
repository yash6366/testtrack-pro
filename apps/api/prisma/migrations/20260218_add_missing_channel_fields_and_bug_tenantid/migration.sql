-- Add missing fields to Channel model
-- The schema defines 'type' and 'createdById' fields but they were never added to the database

ALTER TABLE "Channel" ADD COLUMN "type" TEXT NOT NULL DEFAULT 'GROUP';
ALTER TABLE "Channel" ADD COLUMN "createdById" INTEGER;

-- Add foreign key for createdById
ALTER TABLE "Channel" ADD CONSTRAINT "Channel_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- Create index for createdById (this index doesn't exist in init)
CREATE INDEX "Channel_createdById_idx" ON "Channel"("createdById");
