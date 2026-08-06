import { redirect } from "next/navigation";
import { Role } from "@tt-digita/shared";
import { getServerUser } from "@/lib/session";
import { JoinRoomForm } from "./join-room-form";

export default async function CompetirPage() {
  const user = await getServerUser();
  if (!user) {
    redirect("/login");
  }
  if (user.role !== Role.STUDENT) {
    redirect("/gestao");
  }

  return (
    <main className="mx-auto max-w-sm space-y-6 p-6">
      <div className="text-center">
        <p className="text-sm font-medium text-[var(--color-primary)]">Competir</p>
        <h1 className="text-2xl font-semibold">Entrar em uma sala</h1>
        <p className="text-sm text-[var(--color-muted-foreground)]">
          Peça o código ao seu professor.
        </p>
      </div>
      <JoinRoomForm />
    </main>
  );
}
