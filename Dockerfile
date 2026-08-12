# Build da API (@tt-digita/api) para a Railway.
#
# Existe para nao depender da deteccao automatica do Nixpacks, que resolvia
# `node >=20` para o Node 24 e quebrava no proprio install:
#   ERR_VM_DYNAMIC_IMPORT_CALLBACK_MISSING
#   "pnpm i --frozen-lockfile" did not complete successfully: exit code: 1
#
# Aqui a versao do Node e a do pnpm sao fixas e batem com o ambiente de
# desenvolvimento onde o build e o start:prod foram validados.

FROM node:24-slim

# O engine do Prisma precisa de openssl.
RUN apt-get update \
  && apt-get install -y --no-install-recommends openssl ca-certificates \
  && rm -rf /var/lib/apt/lists/*

# Usa a versao de pnpm declarada em packageManager (11.5.1).
ENV COREPACK_ENABLE_DOWNLOAD_PROMPT=0
RUN corepack enable

WORKDIR /app

# Manifests primeiro: enquanto eles nao mudam, a camada de install fica em cache.
COPY pnpm-workspace.yaml pnpm-lock.yaml package.json ./
COPY packages/shared/package.json packages/shared/
COPY apps/api/package.json apps/api/
COPY apps/web/package.json apps/web/

# --prod=false porque @nestjs/cli, typescript e prisma sao devDependencies e o
# build precisa delas mesmo com NODE_ENV=production definida no servico.
RUN pnpm install --frozen-lockfile --prod=false

COPY . .

# O script build da API roda `prisma generate && nest build`, e o prebuild
# compila @tt-digita/shared antes.
RUN pnpm --filter @tt-digita/api build

ENV NODE_ENV=production

# A Railway injeta PORT; o default abaixo vale so para execucao local.
ENV PORT=3333
EXPOSE 3333

CMD ["node", "apps/api/dist/main"]
