-- CreateEnum
CREATE TYPE "ProfessorTitle" AS ENUM ('PRACTITIONER', 'ASSISTANT', 'SENIOR_ASSISTANT', 'DOCENT', 'ASSOCIATE_PROFESSOR', 'FULL_PROFESSOR', 'EMERITUS');

-- CreateEnum
CREATE TYPE "WeekType" AS ENUM ('ALL', 'A', 'B');

-- AlterTable
ALTER TABLE "Professor" ADD COLUMN     "title" "ProfessorTitle" NOT NULL DEFAULT 'PRACTITIONER';

-- CreateTable
CREATE TABLE "ScheduleEntry" (
    "id" TEXT NOT NULL,
    "termId" TEXT NOT NULL,
    "courseId" TEXT NOT NULL,
    "professorId" TEXT NOT NULL,
    "roomId" TEXT NOT NULL,
    "groupName" TEXT,
    "dayOfWeek" INTEGER NOT NULL,
    "startMin" INTEGER NOT NULL,
    "endMin" INTEGER NOT NULL,
    "weekType" "WeekType",
    "isOnline" BOOLEAN,
    "note" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ScheduleEntry_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ScheduleEntry_termId_dayOfWeek_idx" ON "ScheduleEntry"("termId", "dayOfWeek");

-- CreateIndex
CREATE INDEX "ScheduleEntry_professorId_dayOfWeek_idx" ON "ScheduleEntry"("professorId", "dayOfWeek");

-- CreateIndex
CREATE INDEX "ScheduleEntry_roomId_dayOfWeek_idx" ON "ScheduleEntry"("roomId", "dayOfWeek");

-- AddForeignKey
ALTER TABLE "ScheduleEntry" ADD CONSTRAINT "ScheduleEntry_termId_fkey" FOREIGN KEY ("termId") REFERENCES "Term"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ScheduleEntry" ADD CONSTRAINT "ScheduleEntry_courseId_fkey" FOREIGN KEY ("courseId") REFERENCES "Course"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ScheduleEntry" ADD CONSTRAINT "ScheduleEntry_professorId_fkey" FOREIGN KEY ("professorId") REFERENCES "Professor"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ScheduleEntry" ADD CONSTRAINT "ScheduleEntry_roomId_fkey" FOREIGN KEY ("roomId") REFERENCES "Room"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
