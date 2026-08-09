import { redirect } from "next/navigation";
import { Role } from "@tt-digita/shared";
import { getServerUser } from "@/lib/session";
import { RoboGame } from "./robo-game";

export default async function RoboPage({
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
      <RoboGame roomCode={room ?? null} />
    </main>
  );
}
