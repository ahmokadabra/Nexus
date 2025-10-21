// scripts/seed.js
import { PrismaClient } from "@prisma/client";
const prisma = new PrismaClient();

async function main() {
  console.log("Seeding...");

  const prof = await prisma.professor.create({
    data: { name: "Ivan Ivić", email: "ivan@example.com", phone: "+38761123456" }
  });

  const subj = await prisma.subject.create({
    data: { code: "RI101", name: "Uvod u računarstvo", ects: 5 }
  });

  const room = await prisma.room.create({
    data: { name: "A-101", capacity: 60 }
  });

  const cycle = await prisma.cycle.create({
    data: {
      name: "2025/2026",
      dateStart: new Date("2025-09-01"),
      dateEnd: new Date("2026-08-31"),
      terms: {
        create: [
          { name: "Zimski semestar", dateStart: new Date("2025-09-01"), dateEnd: new Date("2026-01-31") }
        ]
      }
    },
    include: { terms: true }
  });

  const term = cycle.terms[0];

  const program = await prisma.studyProgram.create({
    data: { name: "Računarstvo", code: "RI" }
  });

  await prisma.programYear.create({
    data: { programId: program.id, yearNumber: 1 }
  });

  const course = await prisma.course.create({
    data: { subjectId: subj.id, professorId: prof.id, termId: term.id }
  });

  // create one schedule entry (Mon 08:00-10:00)
  const entry = await prisma.scheduleEntry.create({
    data: {
      termId: term.id,
      courseId: course.id,
      professorId: prof.id,
      roomId: room.id,
      groupName: "RI1",
      dayOfWeek: 1,
      startMin: 8 * 60,
      endMin: 10 * 60,
      weekType: "ALL",
      isOnline: false
    }
  });

  console.log("Seed completed.");
  console.log({ prof, subj, room, cycle, term, program, course, entry });
}

main()
  .catch(e => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
