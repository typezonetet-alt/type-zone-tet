import { redirect } from "next/navigation";
import { Role } from "@tt-digita/shared";
import { getServerUser } from "@/lib/session";
import { RoomRaceStudent } from "./room-race-student";

export default async function CompetirCodePage({
  params,
}: {
  params: Promise<{ code: string }>;
}) {
  const { code } = await params;
  const user = await getServerUser();
  if (!user) {
    redirect("/login");
  }
  if (user.role !== Role.STUDENT) {
    redirect("/gestao");
  }

  return <RoomRaceStudent code={code.toUpperCase()} studentName={user.name} />;
}
