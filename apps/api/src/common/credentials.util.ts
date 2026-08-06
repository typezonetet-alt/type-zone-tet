// Charset sem caracteres ambiguos (0/O, 1/l/I) para codigo e senha gerados,
// facilitando digitacao manual quando o professor repassa ao aluno.
const CHARSET = 'abcdefghjkmnpqrstuvwxyz23456789';

function randomString(length: number): string {
  let out = '';
  for (let i = 0; i < length; i++) {
    out += CHARSET[Math.floor(Math.random() * CHARSET.length)];
  }
  return out;
}

export function generateStudentCode(): string {
  return `aluno${randomString(5)}`;
}

export function generateTemporaryPassword(): string {
  return randomString(10);
}

// Codigo de sala ao vivo: curto, maiusculo, facil de ler numa projecao/lousa.
const ROOM_CODE_CHARSET = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';

export function generateRoomCode(): string {
  let out = '';
  for (let i = 0; i < 5; i++) {
    out +=
      ROOM_CODE_CHARSET[Math.floor(Math.random() * ROOM_CODE_CHARSET.length)];
  }
  return out;
}
