import { ExerciseType, PrismaClient, Role } from "@prisma/client";
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

  // Os 12 mundos da trilha (briefing secao 8). Só os 3 primeiros ganham
  // exercícios reais nesta leva -- os demais ficam prontos pra receber
  // conteúdo depois sem precisar mexer em código (aparecem como "Em breve").
  const worldsData = [
    { order: 1, title: "Mundo 1: Base", focus: "Postura, F, J e linha guia" },
    { order: 2, title: "Mundo 2: Controle", focus: "Linha guia completa" },
    { order: 3, title: "Mundo 3: Alcance Superior", focus: "Linha superior" },
    { order: 4, title: "Mundo 4: Alcance Inferior", focus: "Linha inferior" },
    { order: 5, title: "Mundo 5: Coordenação", focus: "Shift, maiúsculas e alternância" },
    { order: 6, title: "Mundo 6: Português", focus: "Acentos, cedilha e pontuação" },
    { order: 7, title: "Mundo 7: Fluência", focus: "Palavras frequentes" },
    { order: 8, title: "Mundo 8: Ritmo", focus: "Frases e parágrafos" },
    { order: 9, title: "Mundo 9: Dados", focus: "Números e dados profissionais" },
    { order: 10, title: "Mundo 10: Precisão", focus: "Treinos de erro zero" },
    { order: 11, title: "Mundo 11: Velocidade", focus: "Sprints e consistência" },
    { order: 12, title: "Mundo 12: Elite", focus: "Testes avançados e conteúdo aberto" },
  ];

  const worldByOrder = new Map<number, string>();
  for (const w of worldsData) {
    const world = await prisma.world.upsert({
      where: { order: w.order },
      update: {},
      create: w,
    });
    worldByOrder.set(w.order, world.id);
  }

  const exercisesData = [
    // Mundo 1: Base
    {
      worldOrder: 1,
      order: 1,
      title: "Fundação: F e J",
      type: ExerciseType.KEY_SEQUENCE,
      content: "fff jjj fjf jfj fff jjj fj jf ff jj fj jf",
      allowedKeys: ["f", "j"],
      minAccuracy: 0.85,
      targetWpm: null,
    },
    {
      worldOrder: 1,
      order: 2,
      title: "Linha guia: ASDF JKLÇ",
      type: ExerciseType.KEY_SEQUENCE,
      content: "asdf jklç asdf jklç fdsa lçkj asdf jklç",
      allowedKeys: ["a", "s", "d", "f", "j", "k", "l", "ç"],
      minAccuracy: 0.88,
      targetWpm: null,
    },
    // Mundo 2: Controle
    {
      worldOrder: 2,
      order: 1,
      title: "Linha guia: combinações",
      type: ExerciseType.KEY_SEQUENCE,
      content: "as df jk lç sad kfl ask djl fjs dka asdf jklç",
      allowedKeys: ["a", "s", "d", "f", "j", "k", "l", "ç"],
      minAccuracy: 0.88,
      targetWpm: 15,
    },
    {
      worldOrder: 2,
      order: 2,
      title: "Palavras curtas",
      type: ExerciseType.WORD_LIST,
      content: "casa fase seda dado gado jada saga alada",
      allowedKeys: ["a", "s", "d", "f", "g", "j", "k", "l", "ç"],
      minAccuracy: 0.9,
      targetWpm: 18,
    },
    {
      worldOrder: 2,
      order: 3,
      title: "Palavras do dia a dia",
      type: ExerciseType.WORD_LIST,
      content: "tempo trabalho estudo digitar teclado pratica",
      allowedKeys: [],
      minAccuracy: 0.9,
      targetWpm: 20,
    },
    {
      worldOrder: 2,
      order: 4,
      title: "Texto curto",
      type: ExerciseType.WORD_LIST,
      content: "a pratica leva a perfeicao aos poucos cada dia",
      allowedKeys: [],
      minAccuracy: 0.92,
      targetWpm: 22,
    },
    // Mundo 3: Alcance Superior
    {
      worldOrder: 3,
      order: 1,
      title: "Linha superior: RUTY",
      type: ExerciseType.KEY_SEQUENCE,
      content: "rrr uuu ttt yyy rut tyu ury tyr ru ty ur yt",
      allowedKeys: ["r", "u", "t", "y"],
      minAccuracy: 0.88,
      targetWpm: 16,
    },
    {
      worldOrder: 3,
      order: 2,
      title: "Linha superior: combinações",
      type: ExerciseType.BIGRAM,
      content: "qw ei op wo qp asdf jklç ruty tyru opqw eiwo",
      allowedKeys: ["q", "w", "e", "i", "o", "p", "r", "u", "t", "y"],
      minAccuracy: 0.88,
      targetWpm: 18,
    },
    {
      worldOrder: 3,
      order: 3,
      title: "Palavras com linha superior",
      type: ExerciseType.WORD_LIST,
      content: "trigo outro triste piquete requer poeira quieto",
      allowedKeys: [],
      minAccuracy: 0.9,
      targetWpm: 20,
    },
    {
      worldOrder: 3,
      order: 4,
      title: "Frase curta",
      type: ExerciseType.PHRASE,
      content: "o rato roeu a roupa do rei de roma",
      allowedKeys: [],
      minAccuracy: 0.92,
      targetWpm: 22,
    },
  ];

  for (const e of exercisesData) {
    const { worldOrder, ...data } = e;
    const worldId = worldByOrder.get(worldOrder);
    if (!worldId) throw new Error(`Mundo ${worldOrder} não encontrado no seed.`);

    await prisma.exercise.upsert({
      where: { worldId_order: { worldId, order: data.order } },
      update: {},
      create: { ...data, worldId },
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
