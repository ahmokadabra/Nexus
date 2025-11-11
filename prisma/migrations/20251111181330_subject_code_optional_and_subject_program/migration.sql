/*
  Warnings:

  - You are about to drop the `SubjectOnProgramYear` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropForeignKey
ALTER TABLE "public"."SubjectOnProgramYear" DROP CONSTRAINT "SubjectOnProgramYear_programYearId_fkey";

-- DropForeignKey
ALTER TABLE "public"."SubjectOnProgramYear" DROP CONSTRAINT "SubjectOnProgramYear_subjectId_fkey";

-- AlterTable
ALTER TABLE "Subject" ALTER COLUMN "code" DROP NOT NULL;

-- DropTable
DROP TABLE "public"."SubjectOnProgramYear";

-- CreateTable
CREATE TABLE "SubjectProgram" (
    "subjectId" TEXT NOT NULL,
    "programId" TEXT NOT NULL,
    "yearNumber" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SubjectProgram_pkey" PRIMARY KEY ("subjectId","programId")
);

-- AddForeignKey
ALTER TABLE "SubjectProgram" ADD CONSTRAINT "SubjectProgram_subjectId_fkey" FOREIGN KEY ("subjectId") REFERENCES "Subject"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SubjectProgram" ADD CONSTRAINT "SubjectProgram_programId_fkey" FOREIGN KEY ("programId") REFERENCES "StudyProgram"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
