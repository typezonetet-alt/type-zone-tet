# Deploy — front na Vercel, API na Railway

O repositorio e um monorepo pnpm. Os dois servicos saem do mesmo repo, cada um
apontando para uma pasta diferente.

| Servico | Pasta | Plataforma |
| --- | --- | --- |
| `@tt-digita/web` | `apps/web` | Vercel |
| `@tt-digita/api` | `apps/api` | Railway |
| `@tt-digita/shared` | `packages/shared` | compilado pelos dois (`prebuild`) |

## Vercel (front)

Import Project apontando para este repositorio, e depois:

| Campo | Valor |
| --- | --- |
| Root Directory | `apps/web` |
| Framework Preset | Next.js (detectado automaticamente) |
| Build Command | padrao (`pnpm build`) |
| Install Command | padrao |

Marque **Include files outside of the Root Directory** — o app importa
`@tt-digita/shared`, que fica em `packages/shared`.

Variavel de ambiente (Production, Preview e Development):

```
NEXT_PUBLIC_API_URL=https://<dominio-da-api-na-railway>
```

Ela e lida em tempo de build (`apps/web/src/lib/api.ts`), entao trocar o valor
exige um redeploy — nao basta salvar a variavel.

## Railway (API)

O build usa o `Dockerfile` da raiz, e o `railway.json` aponta o builder para
ele. A Railway le os dois arquivos sozinha, entao **nao e preciso digitar
comando nenhum no dashboard** — so configurar as variaveis e gerar o dominio.

| Campo | Valor |
| --- | --- |
| Root Directory | vazio (raiz do repo) |
| Builder | `DOCKERFILE` (definido no railway.json) |
| Build / Start Command | deixar em branco — vem do Dockerfile |
| Healthcheck | `GET /` — responde `{"status":"ok"}` sem tocar no banco |

### Por que Dockerfile em vez de Nixpacks

A deteccao automatica do Nixpacks nao funciona neste repositorio. O
`package.json` declara apenas `node >=20`, e ele resolvia isso para o Node 24;
o pnpm que ele instala quebra nessa versao durante o proprio install, antes de
chegar em qualquer comando de build:

```
code: 'ERR_VM_DYNAMIC_IMPORT_CALLBACK_MISSING'
"pnpm i --frozen-lockfile" did not complete successfully: exit code: 1
```

Fixar o Node por `.nvmrc` nao resolveu. Com Dockerfile, a versao do Node e a do
pnpm sao explicitas e iguais as do ambiente onde o build foi validado.

O Nixpacks tambem criava **um servico por workspace** (`@tt-digita/web` e
`@tt-digita/api`). Só a API deve existir na Railway; o servico do front pode ser
removido.

### Por que `--prod=false` no install

`@nestjs/cli`, `typescript` e `prisma` sao devDependencies. Com
`NODE_ENV=production` definida no servico, o pnpm as ignoraria no install e o
build quebraria em seguida (`nest: command not found`). O `--prod=false` obriga
a instalacao completa.

Variaveis de ambiente:

```
DATABASE_URL=postgresql://...        # Postgres do projeto (Supabase)
JWT_SECRET=...                       # gere um novo, nao reaproveite o local
NODE_ENV=production
WEB_ORIGIN=https://<dominio-do-front-na-vercel>
```

`PORT` e injetada pela Railway; `apps/api/src/main.ts` ja a respeita.

### NODE_ENV=production nao e opcional

Em producao o front e a API ficam em dominios diferentes, ou seja, o cookie de
sessao e cross-site. `apps/api/src/auth/auth.controller.ts` so emite o cookie
como `SameSite=None; Secure` quando `NODE_ENV === 'production'`. Sem essa
variavel o navegador descarta o cookie silenciosamente: o login responde 200,
mas o usuario volta para a tela de login sem nenhuma mensagem de erro.

`WEB_ORIGIN` alimenta o CORS (`main.ts`) e precisa ser a origem exata do front,
sem barra no final.

## Ordem de subida

As duas pontas dependem do dominio uma da outra, entao:

1. Suba a API na Railway e gere o dominio publico (Settings > Networking).
2. Configure `NEXT_PUBLIC_API_URL` na Vercel com esse dominio e faca o deploy.
3. Pegue o dominio da Vercel, coloque em `WEB_ORIGIN` na Railway e redeploy a API.
4. Teste o login: ele so passa quando os passos 2 e 3 estao consistentes.

## Migrations

O build da API roda `prisma generate`, mas **nao** roda `prisma migrate deploy`.
O banco precisa estar migrado antes. Para aplicar migrations manualmente:

```bash
cd apps/api && pnpm exec prisma migrate deploy
```
