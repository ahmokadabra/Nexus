/*
  Warnings:

  - The values [DOCENT,EMERITUS] on the enum `ProfessorTitle` will be removed. If these variants are still used in the database, this will fail.

*/
-- AlterEnum
BEGIN;
CREATE TYPE "ProfessorTitle_new" AS ENUM ('PRACTITIONER', 'ASSISTANT', 'SENIOR_ASSISTANT', 'ASSISTANT_PROFESSOR', 'ASSOCIATE_PROFESSOR', 'FULL_PROFESSOR', 'PROFESSOR_EMERITUS');
ALTER TABLE "Professor" ALTER COLUMN "title" TYPE "ProfessorTitle_new" USING ("title"::text::"ProfessorTitle_new");
ALTER TYPE "ProfessorTitle" RENAME TO "ProfessorTitle_old";
ALTER TYPE "ProfessorTitle_new" RENAME TO "ProfessorTitle";
DROP TYPE "public"."ProfessorTitle_old";
COMMIT;
