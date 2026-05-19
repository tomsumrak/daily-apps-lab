-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "name" TEXT,
    "passwordHash" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AppRecord" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "appSlug" TEXT NOT NULL,
    "recordType" TEXT NOT NULL,
    "data" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AppRecord_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE INDEX "AppRecord_userId_idx" ON "AppRecord"("userId");

-- CreateIndex
CREATE INDEX "AppRecord_userId_appSlug_idx" ON "AppRecord"("userId", "appSlug");

-- CreateIndex
CREATE INDEX "AppRecord_userId_appSlug_recordType_idx" ON "AppRecord"("userId", "appSlug", "recordType");

-- AddForeignKey
ALTER TABLE "AppRecord" ADD CONSTRAINT "AppRecord_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
