import Link from "next/link";
import { redirect } from "next/navigation";
import { Role } from "@tt-digita/shared";
import { Card, CardDescription, CardTitle } from "@/components/ui/card";
import { getServerUser } from "@/lib/session";

export default async function JogarPage() {
  const user = await getServerUser();
  if (!user) {
    redirect("/login");
  }
  if (user.role !== Role.STUDENT) {
    redirect("/gestao");
  }

  return (
    <main className="mx-auto max-w-2xl space-y-6 p-6">
      <div>
        <p className="text-sm font-medium text-[var(--color-primary)]">Jogar</p>
        <h1 className="text-2xl font-semibold">Jogos de digitação</h1>
      </div>

      <Link href="/jogar/orbital">
        <Card className="transition-shadow hover:shadow-lg">
          <CardTitle className="text-base">T&T Orbital</CardTitle>
          <CardDescription>
            Mire nas palavras que caem e digite antes que alcancem a base.
          </CardDescription>
        </Card>
      </Link>

      <Card className="opacity-60">
        <CardDescription>Mais jogos em breve.</CardDescription>
      </Card>
    </main>
  );
}
