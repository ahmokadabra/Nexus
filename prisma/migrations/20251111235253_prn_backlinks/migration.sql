-- CreateTable
CREATE TABLE "PRNPlan" (
    "id" TEXT NOT NULL,
    "programId" TEXT NOT NULL,
    "yearNumber" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PRNPlan_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PRNRow" (
    "id" TEXT NOT NULL,
    "planId" TEXT NOT NULL,
    "subjectId" TEXT NOT NULL,
    "professorId" TEXT,
    "lectureTotal" INTEGER DEFAULT 0,
    "exerciseTotal" INTEGER DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PRNRow_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "PRNPlan_programId_yearNumber_key" ON "PRNPlan"("programId", "yearNumber");

-- CreateIndex
CREATE UNIQUE INDEX "PRNRow_planId_subjectId_key" ON "PRNRow"("planId", "subjectId");

-- AddForeignKey
ALTER TABLE "PRNPlan" ADD CONSTRAINT "PRNPlan_programId_fkey" FOREIGN KEY ("programId") REFERENCES "StudyProgram"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PRNRow" ADD CONSTRAINT "PRNRow_planId_fkey" FOREIGN KEY ("planId") REFERENCES "PRNPlan"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PRNRow" ADD CONSTRAINT "PRNRow_subjectId_fkey" FOREIGN KEY ("subjectId") REFERENCES "Subject"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PRNRow" ADD CONSTRAINT "PRNRow_professorId_fkey" FOREIGN KEY ("professorId") REFERENCES "Professor"("id") ON DELETE SET NULL ON UPDATE CASCADE;
