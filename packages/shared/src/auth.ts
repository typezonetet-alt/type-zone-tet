import { Role } from "./roles";

export interface StudentLoginPayload {
  code: string;
  password: string;
}

export interface StaffLoginPayload {
  email: string;
  password: string;
}

export interface AuthenticatedUser {
  id: string;
  role: Role;
  name: string;
  email: string | null;
  code: string | null;
}
