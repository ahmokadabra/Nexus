-- CreateEnum
CREATE TYPE "Engagement" AS ENUM ('EMPLOYED', 'EXTERNAL');

-- DropIndex
DROP INDEX "public"."ScheduleEntry_professorId_dayOfWeek_idx";

-- DropIndex
DROP INDEX "public"."ScheduleEntry_roomId_dayOfWeek_idx";

-- DropIndex
DROP INDEX "public"."ScheduleEntry_termId_dayOfWeek_idx";

-- AlterTable
ALTER TABLE "Professor" ADD COLUMN     "engagement" "Engagement",
ALTER COLUMN "title" DROP NOT NULL,
ALTER COLUMN "title" DROP DEFAULT;
