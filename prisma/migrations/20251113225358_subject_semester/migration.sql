/*
  Warnings:

  - A unique constraint covering the columns `[subjectId,programId,yearNumber,semester]` on the table `SubjectOnProgramYear` will be added. If there are existing duplicate values, this will fail.

*/
-- CreateEnum
CREATE TYPE "Semester" AS ENUM ('ZIMSKI', 'LJETNI');

-- DropIndex
DROP INDEX "SubjectOnProgramYear_subjectId_programId_key";

-- AlterTable
ALTER TABLE "SubjectOnProgramYear" ADD COLUMN     "semester" "Semester" NOT NULL DEFAULT 'ZIMSKI';

-- CreateIndex
CREATE INDEX "idx_prog_year_sem" ON "SubjectOnProgramYear"("programId", "yearNumber", "semester");

-- CreateIndex
CREATE UNIQUE INDEX "SubjectOnProgramYear_subjectId_programId_yearNumber_semeste_key" ON "SubjectOnProgramYear"("subjectId", "programId", "yearNumber", "semester");
