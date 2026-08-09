import { redirect } from "next/navigation";
import { Role } from "@tt-digita/shared";
import { getServerUser } from "@/lib/session";
import { RoomTelao } from "./room-telao";

export default async function SalaTelaoPage({
  params,
}: {
  params: Promise<{ code: string }>;
}) {
  const { code } = await params;
  const user = await getServerUser();
  if (!user) {
    redirect("/login");
  }
  if (user.role === Role.STUDENT) {
    redirect("/aprender");
  }

  return <RoomTelao code={code.toUpperCase()} />;
}
