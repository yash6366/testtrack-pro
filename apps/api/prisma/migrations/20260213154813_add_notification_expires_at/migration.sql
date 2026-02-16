-- AlterTable
ALTER TABLE "Notification" ADD COLUMN     "expiresAt" TIMESTAMP(3);

-- AlterTable
ALTER TABLE "User" ADD COLUMN     "picture" TEXT,
ALTER COLUMN "password" DROP NOT NULL;

-- CreateTable
CREATE TABLE "OAuthIntegration" (
    "id" SERIAL NOT NULL,
    "userId" INTEGER NOT NULL,
    "provider" TEXT NOT NULL,
    "providerId" TEXT NOT NULL,
    "email" TEXT,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "OAuthIntegration_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "OAuthIntegration_userId_idx" ON "OAuthIntegration"("userId");

-- CreateIndex
CREATE INDEX "OAuthIntegration_provider_idx" ON "OAuthIntegration"("provider");

-- CreateIndex
CREATE INDEX "OAuthIntegration_createdAt_idx" ON "OAuthIntegration"("createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "OAuthIntegration_provider_providerId_key" ON "OAuthIntegration"("provider", "providerId");

-- CreateIndex
CREATE INDEX "Notification_expiresAt_idx" ON "Notification"("expiresAt");

-- AddForeignKey
ALTER TABLE "OAuthIntegration" ADD CONSTRAINT "OAuthIntegration_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
