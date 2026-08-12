import "server-only";
import { cookies } from "next/headers";
import type { AuthenticatedUser } from "@tt-digita/shared";
import { API_ORIGIN } from "./api";

export async function getServerUser(): Promise<AuthenticatedUser | null> {
  const cookieStore = await cookies();
  const cookieHeader = cookieStore.toString();

  if (!cookieHeader) return null;

  const res = await fetch(`${API_ORIGIN}/auth/me`, {
    headers: { cookie: cookieHeader },
    cache: "no-store",
  });

  if (!res.ok) return null;
  return (await res.json()) as AuthenticatedUser;
}
