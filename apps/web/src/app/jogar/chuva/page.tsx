import { redirect } from "next/navigation";
import { Role } from "@tt-digita/shared";
import { getServerUser } from "@/lib/session";
import { ChuvaGame } from "./chuva-game";

export default async function ChuvaPage({
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
      <ChuvaGame roomCode={room ?? null} />
    </main>
  );
}
