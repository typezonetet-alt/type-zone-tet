import path from "node:path";
import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // O app vive dentro de um monorepo pnpm e depende de @tt-digita/shared, que
  // fica fora de apps/web. Sem apontar a raiz explicitamente, o Next infere a
  // raiz pelo lockfile mais proximo e pode deixar arquivos do pacote shared de
  // fora do bundle na Vercel (onde o Root Directory e apps/web).
  outputFileTracingRoot: path.join(__dirname, "../.."),
};

export default nextConfig;
