-- CreateTable
CREATE TABLE "RevisionNote" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "questionId" TEXT NOT NULL,
    "userNote" TEXT,
    "tags" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "subject" "QuestionSubject" NOT NULL,
    "chapter" VARCHAR(255) NOT NULL,
    "topic" VARCHAR(255),
    "conceptKey" VARCHAR(500) NOT NULL,
    "keyTakeaway" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "RevisionNote_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "RevisionNote_userId_idx" ON "RevisionNote"("userId");

-- CreateIndex
CREATE INDEX "RevisionNote_questionId_idx" ON "RevisionNote"("questionId");

-- CreateIndex
CREATE INDEX "RevisionNote_userId_subject_idx" ON "RevisionNote"("userId", "subject");

-- CreateIndex
CREATE INDEX "RevisionNote_userId_conceptKey_idx" ON "RevisionNote"("userId", "conceptKey");

-- CreateIndex
CREATE INDEX "RevisionNote_userId_createdAt_idx" ON "RevisionNote"("userId", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "RevisionNote_userId_questionId_key" ON "RevisionNote"("userId", "questionId");

-- AddForeignKey
ALTER TABLE "RevisionNote" ADD CONSTRAINT "RevisionNote_userId_fkey" FOREIGN KEY ("userId") REFERENCES "UserProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RevisionNote" ADD CONSTRAINT "RevisionNote_questionId_fkey" FOREIGN KEY ("questionId") REFERENCES "Question"("id") ON DELETE CASCADE ON UPDATE CASCADE;
