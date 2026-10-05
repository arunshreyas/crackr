-- CreateEnum
CREATE TYPE "SessionStatus" AS ENUM ('ACTIVE', 'COMPLETED', 'ABANDONED');

-- AlterTable
ALTER TABLE "QuizSession" 
ADD COLUMN "difficulty" VARCHAR(50),
ADD COLUMN "status" "SessionStatus" NOT NULL DEFAULT 'ACTIVE',
ADD COLUMN "questionIds" TEXT[] DEFAULT ARRAY[]::TEXT[],
ADD COLUMN "currentQuestionIndex" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN "lastActivityAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;

-- Update existing completed sessions
UPDATE "QuizSession" 
SET "status" = 'COMPLETED' 
WHERE "completedAt" IS NOT NULL;

-- CreateIndex
CREATE INDEX "QuizSession_userId_status_idx" ON "QuizSession"("userId", "status");

-- CreateIndex
CREATE UNIQUE INDEX "QuizAnswer_sessionId_questionId_key" ON "QuizAnswer"("sessionId", "questionId");
