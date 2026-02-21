-- Add channelType field to Channel table
ALTER TABLE "Channel" ADD COLUMN "channelType" TEXT NOT NULL DEFAULT 'general';

-- Create index for channelType
CREATE INDEX "Channel_channelType_idx" ON "Channel"("channelType");
