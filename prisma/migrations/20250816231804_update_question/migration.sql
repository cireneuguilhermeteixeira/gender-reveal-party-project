-- AlterTable
ALTER TABLE "Session" ALTER COLUMN "currentQuestionIndex" SET DEFAULT '0',
ALTER COLUMN "currentQuestionIndex" SET DATA TYPE TEXT;

-- AddForeignKey
ALTER TABLE "Session" ADD CONSTRAINT "Session_currentQuestionIndex_fkey" FOREIGN KEY ("currentQuestionIndex") REFERENCES "Question"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
