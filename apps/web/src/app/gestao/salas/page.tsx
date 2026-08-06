import { redirect } from "next/navigation";
import { Role } from "@tt-digita/shared";
import { getServerUser } from "@/lib/session";
import { CreateRoomForm } from "./create-room-form";

export default async function SalasPage() {
  const user = await getServerUser();
  if (!user) {
    redirect("/login");
  }
  if (user.role === Role.STUDENT) {
    redirect("/aprender");
  }

  return (
    <main className="mx-auto max-w-xl space-y-6 p-6">
      <div>
        <p className="text-sm font-medium text-[var(--color-primary)]">Gestão</p>
        <h1 className="text-2xl font-semibold">Nova sala ao vivo</h1>
      </div>
      <CreateRoomForm />
    </main>
  );
}
