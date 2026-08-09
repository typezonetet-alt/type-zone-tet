import { PrismaClient, Role } from "@prisma/client";
import { WORLDS_DATA, EXERCISES_DATA } from "./curriculum-data";
import * as argon2 from "argon2";

const prisma = new PrismaClient();

async function hash(password: string) {
  return argon2.hash(password);
}

async function main() {
  const superadmin = await prisma.user.upsert({
    where: { email: "superadmin@tt.local" },
    update: {},
    create: {
      email: "superadmin@tt.local",
      role: Role.SUPERADMIN,
      passwordHash: await hash("Super#2026"),
    },
  });

  const adminUser = await prisma.user.upsert({
    where: { email: "admin@tt.local" },
    update: {},
    create: {
      email: "admin@tt.local",
      role: Role.ADMIN,
      passwordHash: await hash("Admin#2026"),
    },
  });

  const teacherUser = await prisma.user.upsert({
    where: { email: "professor@tt.local" },
    update: {},
    create: {
      email: "professor@tt.local",
      role: Role.TEACHER,
      passwordHash: await hash("Professor#2026"),
      teacher: { create: { name: "Professora Ana" } },
    },
    include: { teacher: true },
  });

  const teacher = await prisma.teacher.findUniqueOrThrow({
    where: { userId: teacherUser.id },
  });

  const demoClass = await prisma.class.upsert({
    where: { id: "demo-class-informatica-01" },
    update: {},
    create: {
      id: "demo-class-informatica-01",
      name: "Informática 01",
      course: "Digitação",
      shift: "Manhã",
      teacherId: teacher.id,
    },
  });

  const studentsData = [
    { code: "aluno01", name: "Aluno Demo 1" },
    { code: "aluno02", name: "Aluno Demo 2" },
  ];

  for (const s of studentsData) {
    let student = await prisma.student.findUnique({ where: { code: s.code } });

    if (!student) {
      const studentUser = await prisma.user.create({
        data: {
          role: Role.STUDENT,
          passwordHash: await hash("Aluno#2026"),
          student: { create: { code: s.code, name: s.name } },
        },
      });
      student = await prisma.student.findUniqueOrThrow({
        where: { userId: studentUser.id },
      });
    }

    await prisma.classMember.upsert({
      where: { studentId_classId: { studentId: student.id, classId: demoClass.id } },
      update: {},
      create: { studentId: student.id, classId: demoClass.id },
    });
  }

  const worldByOrder = new Map<number, string>();
  for (const w of WORLDS_DATA) {
    const world = await prisma.world.upsert({
      where: { order: w.order },
      update: {},
      create: w,
    });
    worldByOrder.set(w.order, world.id);
  }


  for (const e of EXERCISES_DATA) {
    const { worldOrder, ...data } = e;
    const worldId = worldByOrder.get(worldOrder);
    if (!worldId) throw new Error(`Mundo ${worldOrder} não encontrado no seed.`);

    await prisma.exercise.upsert({
      where: { worldId_order: { worldId, order: data.order } },
      update: data,
      create: { ...data, worldId },
    });
  }

  // Fase 5 (Reter): garante uma temporada ativa -- o servico de gamificacao
  // tambem cria sob demanda, mas seedar aqui deixa o estado inicial explicito.
  const existingSeason = await prisma.season.findFirst({
    orderBy: { index: "desc" },
  });
  if (!existingSeason) {
    const startsAt = new Date();
    const endsAt = new Date(startsAt.getTime() + 30 * 24 * 60 * 60 * 1000);
    await prisma.season.create({
      data: { index: 1, startsAt, endsAt },
    });
  }

  console.log("Seed concluido.");
  console.log("Superadmin: superadmin@tt.local / Super#2026");
  console.log("Admin: admin@tt.local / Admin#2026");
  console.log("Professor: professor@tt.local / Professor#2026");
  console.log("Alunos: aluno01 / aluno02, senha Aluno#2026");
  console.log(superadmin.id, adminUser.id);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
