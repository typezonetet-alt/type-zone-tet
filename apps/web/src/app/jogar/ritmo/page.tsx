import { redirect } from "next/navigation";
import { Role } from "@tt-digita/shared";
import { getServerUser } from "@/lib/session";
import { RitmoGame } from "./ritmo-game";

export default async function RitmoPage({
  searchParams,
}: {
  searchParams: Promise<{ room?: string }>;
}) {
  const user = await getServerUser();
  if (!user) {
    redirect("/login");
  }
  if (user.role !== Role.STUDENT) {
    redirect("/gestao");
  }
  const { room } = await searchParams;

  return (
    <main className="p-6">
      <RitmoGame roomCode={room ?? null} />
    </main>
  );
}
