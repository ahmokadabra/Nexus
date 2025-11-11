-- CreateTable
CREATE TABLE "SubjectOnProgramYear" (
    "id" TEXT NOT NULL,
    "subjectId" TEXT NOT NULL,
    "programYearId" TEXT NOT NULL,

    CONSTRAINT "SubjectOnProgramYear_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "SubjectOnProgramYear_subjectId_programYearId_key" ON "SubjectOnProgramYear"("subjectId", "programYearId");

-- AddForeignKey
ALTER TABLE "SubjectOnProgramYear" ADD CONSTRAINT "SubjectOnProgramYear_subjectId_fkey" FOREIGN KEY ("subjectId") REFERENCES "Subject"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SubjectOnProgramYear" ADD CONSTRAINT "SubjectOnProgramYear_programYearId_fkey" FOREIGN KEY ("programYearId") REFERENCES "ProgramYear"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
