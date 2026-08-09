import { EXERCISES_DATA } from '../../prisma/curriculum-data';

// Trava automaticamente a regra do briefing (docs/briefing.md sec. 9):
// "O sistema não deve apresentar uma palavra com tecla ainda não ensinada em
// exercícios de aprendizagem, salvo quando a atividade declarar
// explicitamente que é revisão ou teste."
//
// Bug real encontrado por auditoria manual que motivou este teste: a lista
// "Palavras curtas" do Mundo 2 usava "casa" (tem "c", fileira inferior, só
// ensinada no Mundo 4) -- violava a própria regra do produto sem que nenhum
// teste acusasse. Isso só é verificável nos Mundos 1-4 (a fase de
// introduzir onde cada tecla mora); a partir do Mundo 5 o vocabulário já é
// livre por design (briefing: "Coordenação", "Português", "Fluência" etc.
// não são mais sobre aprender posição de tecla).
const SCOPED_WORLD_ORDERS = [1, 2, 3, 4];

// Única exceção declarada: o "checkpoint" do Mundo 2 usa de propósito letras
// de mundos futuros, como prévia motivadora -- exatamente o carve-out que o
// próprio §9 permite ("salvo quando a atividade declarar explicitamente que
// é revisão ou teste"). Ver o comentário no exercício em curriculum-data.ts.
const KEY_LEAK_EXCEPTIONS = new Set(['Checkpoint: primeira frase real']);

const DRILL_TYPES = new Set(['KEY_SEQUENCE', 'BIGRAM']);
const CONTENT_TYPES = new Set(['WORD_LIST', 'PHRASE']);

function lettersOf(text: string): Set<string> {
  const letters = new Set<string>();
  for (const ch of text.toLowerCase()) {
    if (/\p{L}/u.test(ch)) letters.add(ch);
  }
  return letters;
}

describe('Currículo (Mundos 1-4) — nenhuma palavra usa tecla ainda não ensinada', () => {
  // Ordena por [worldOrder, order] igual à trilha de verdade (exercises.service.ts).
  const ordered = [...EXERCISES_DATA].sort((a, b) =>
    a.worldOrder !== b.worldOrder
      ? a.worldOrder - b.worldOrder
      : a.order - b.order,
  );

  it('cada exercício WORD_LIST/PHRASE só usa teclas já introduzidas por um KEY_SEQUENCE/BIGRAM anterior (ou é uma exceção declarada)', () => {
    const taughtLetters = new Set<string>();
    const violations: string[] = [];

    for (const exercise of ordered) {
      if (!SCOPED_WORLD_ORDERS.includes(exercise.worldOrder)) continue;

      if (DRILL_TYPES.has(exercise.type)) {
        for (const letter of lettersOf(exercise.content))
          taughtLetters.add(letter);
        continue;
      }

      if (!CONTENT_TYPES.has(exercise.type)) continue;
      if (KEY_LEAK_EXCEPTIONS.has(exercise.title)) continue;

      const untaught = [...lettersOf(exercise.content)].filter(
        (l) => !taughtLetters.has(l),
      );
      if (untaught.length > 0) {
        violations.push(
          `Mundo ${exercise.worldOrder} · "${exercise.title}": usa "${untaught.join(', ')}" antes de ensinar`,
        );
      }
    }

    expect(violations).toEqual([]);
  });

  it('a exceção declarada (checkpoint) continua existindo e de fato contém letras ainda não ensinadas -- se parar de vazar, o rótulo de exceção vira obsoleto', () => {
    const checkpoint = ordered.find((e) => KEY_LEAK_EXCEPTIONS.has(e.title));
    expect(checkpoint).toBeDefined();

    const taughtBefore = new Set<string>();
    for (const exercise of ordered) {
      if (exercise === checkpoint) break;
      if (DRILL_TYPES.has(exercise.type)) {
        for (const letter of lettersOf(exercise.content))
          taughtBefore.add(letter);
      }
    }

    const leaked = [...lettersOf(checkpoint!.content)].filter(
      (l) => !taughtBefore.has(l),
    );
    expect(leaked.length).toBeGreaterThan(0);
  });

  it('cada mundo 1-4 introduz no máximo uma dupla de teclas nova por exercício de drill (nunca um salto pro conjunto inteiro de uma vez)', () => {
    // Trava a metodologia pedida (TypingMaster/Mavis Beacon/Keybr.com):
    // introduzir 1-2 teclas por vez, nunca uma fileira inteira de um golpe só.
    // Rastreia TODAS as teclas de allowedKeys (letra ou não -- a vírgula de
    // "M e vírgula" conta igual), não só letras, senão um exercício com uma
    // letra + um símbolo escaparia da checagem por engano.
    const MAX_NEW_KEYS_PER_DRILL = 2;
    const taughtKeys = new Set<string>();

    for (const exercise of ordered) {
      if (!SCOPED_WORLD_ORDERS.includes(exercise.worldOrder)) continue;
      if (!DRILL_TYPES.has(exercise.type)) continue;

      const keysHere = new Set(
        exercise.allowedKeys.map((k) => k.toLowerCase()),
      );
      const newKeys = [...keysHere].filter((k) => !taughtKeys.has(k));

      // Exercícios de CONSOLIDAÇÃO (ex.: "combinações", "bigramas",
      // "trigramas", "alternância") legitimamente listam várias teclas já
      // ensinadas ao mesmo tempo -- só os de introdução de tecla nova (onde
      // TODAS as teclas listadas são novas) precisam respeitar o limite.
      const isIntroduction =
        newKeys.length === keysHere.size && keysHere.size > 0;
      if (isIntroduction) {
        expect(newKeys.length).toBeLessThanOrEqual(MAX_NEW_KEYS_PER_DRILL);
      }

      for (const k of keysHere) taughtKeys.add(k);
    }
  });
});
