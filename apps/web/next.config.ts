import path from "node:path";
import type { NextConfig } from "next";

// Origem absoluta da API. Usada pelo proxy abaixo, pelas chamadas feitas no
// servidor (que precisam de URL absoluta) e pelo socket.io.
const API_ORIGIN = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3333";

const nextConfig: NextConfig = {
  // O app vive dentro de um monorepo pnpm e depende de @tt-digita/shared, que
  // fica fora de apps/web. Sem apontar a raiz explicitamente, o Next infere a
  // raiz pelo lockfile mais proximo e pode deixar arquivos do pacote shared de
  // fora do bundle na Vercel (onde o Root Directory e apps/web).
  outputFileTracingRoot: path.join(__dirname, "../.."),

  // O navegador fala com a API por /api, no mesmo dominio do front, e o Next
  // encaminha para a Railway.
  //
  // Isso existe por causa do cookie de sessao. A API emite `tt_session` sem
  // atributo Domain, entao ele pertence ao host que respondeu. Chamando a
  // Railway direto, o cookie fica preso em *.up.railway.app e nunca acompanha
  // as requisicoes que o navegador faz ao dominio do front -- ou seja,
  // `cookies()` nos Server Components sempre vem vazio e toda pagina protegida
  // devolve o usuario para /login. Em desenvolvimento o problema nao aparece
  // porque front e API dividem o host localhost.
  //
  // Passando pelo proxy, quem responde ao navegador e o proprio dominio do
  // front: o cookie vira first-party, viaja nas navegacoes e fica visivel para
  // o servidor. De quebra, as chamadas do navegador deixam de ser cross-origin
  // e o CORS sai de cena.
  async rewrites() {
    return [{ source: "/api/:path*", destination: `${API_ORIGIN}/:path*` }];
  },
};

export default nextConfig;
