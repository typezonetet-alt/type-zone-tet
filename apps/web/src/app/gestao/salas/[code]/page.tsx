import { redirect } from "next/navigation";
import { Role } from "@tt-digita/shared";
import { getServerUser } from "@/lib/session";
import { RoomLobbyHost } from "./room-lobby-host";

export default async function SalaHostPage({
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

  return <RoomLobbyHost code={code.toUpperCase()} />;
}
