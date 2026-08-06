import { redirect } from "next/navigation";
import { Role } from "@tt-digita/shared";
import { getServerUser } from "@/lib/session";
import { OrbitalGame } from "./orbital-game";

export default async function OrbitalPage() {
  const user = await getServerUser();
  if (!user) {
    redirect("/login");
  }
  if (user.role !== Role.STUDENT) {
    redirect("/gestao");
  }

  return (
    <main className="p-6">
      <OrbitalGame />
    </main>
  );
}
