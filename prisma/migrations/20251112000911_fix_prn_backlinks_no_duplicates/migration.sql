/*
  Warnings:

  - You are about to drop the column `exerciseTotal` on the `PRNRow` table. All the data in the column will be lost.
  - You are about to drop the column `lectureTotal` on the `PRNRow` table. All the data in the column will be lost.
  - You are about to drop the `SubjectProgram` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropForeignKey
ALTER TABLE "SubjectProgram" DROP CONSTRAINT "SubjectProgram_programId_fkey";

-- DropForeignKey
ALTER TABLE "SubjectProgram" DROP CONSTRAINT "SubjectProgram_subjectId_fkey";

-- DropIndex
DROP INDEX "PRNRow_planId_subjectId_key";

-- AlterTable
ALTER TABLE "PRNRow" DROP COLUMN "exerciseTotal",
DROP COLUMN "lectureTotal",
ADD COLUMN     "exerciseHours" INTEGER,
ADD COLUMN     "lectureHours" INTEGER,
ADD COLUMN     "note" TEXT;

-- DropTable
DROP TABLE "SubjectProgram";

-- CreateTable
CREATE TABLE "SubjectOnProgramYear" (
    "id" TEXT NOT NULL,
    "subjectId" TEXT NOT NULL,
    "programId" TEXT NOT NULL,
    "yearNumber" INTEGER NOT NULL,

    CONSTRAINT "SubjectOnProgramYear_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "SubjectOnProgramYear_subjectId_programId_key" ON "SubjectOnProgramYear"("subjectId", "programId");

-- AddForeignKey
ALTER TABLE "SubjectOnProgramYear" ADD CONSTRAINT "SubjectOnProgramYear_subjectId_fkey" FOREIGN KEY ("subjectId") REFERENCES "Subject"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SubjectOnProgramYear" ADD CONSTRAINT "SubjectOnProgramYear_programId_fkey" FOREIGN KEY ("programId") REFERENCES "StudyProgram"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
