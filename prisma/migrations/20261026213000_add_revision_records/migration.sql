-- CreateEnum
CREATE TYPE "RevisionStatus" AS ENUM ('NOT_REVIEWED', 'REVIEWED', 'NEEDS_PRACTICE');

-- CreateTable
CREATE TABLE "RevisionRecord" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "conceptKey" VARCHAR(500) NOT NULL,
    "subject" "QuestionSubject" NOT NULL,
    "chapter" VARCHAR(255) NOT NULL,
    "topic" VARCHAR(255),
    "status" "RevisionStatus" NOT NULL DEFAULT 'NOT_REVIEWED',
    "reviewCount" INTEGER NOT NULL DEFAULT 0,
    "lastReviewedAt" TIMESTAMP(3),
    "nextReviewDue" TIMESTAMP(3),
    "lastFeedback" VARCHAR(50),
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "RevisionRecord_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "RevisionRecord_userId_idx" ON "RevisionRecord"("userId");

-- CreateIndex
CREATE INDEX "RevisionRecord_userId_status_idx" ON "RevisionRecord"("userId", "status");

-- CreateIndex
CREATE INDEX "RevisionRecord_userId_nextReviewDue_idx" ON "RevisionRecord"("userId", "nextReviewDue");

-- CreateIndex
CREATE INDEX "RevisionRecord_userId_conceptKey_idx" ON "RevisionRecord"("userId", "conceptKey");

-- CreateIndex
CREATE INDEX "RevisionRecord_userId_subject_idx" ON "RevisionRecord"("userId", "subject");

-- CreateIndex
CREATE UNIQUE INDEX "RevisionRecord_userId_conceptKey_key" ON "RevisionRecord"("userId", "conceptKey");

-- AddForeignKey
ALTER TABLE "RevisionRecord" ADD CONSTRAINT "RevisionRecord_userId_fkey" FOREIGN KEY ("userId") REFERENCES "UserProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE;
