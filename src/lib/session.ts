import { cookies } from "next/headers";

export interface SessionUser {
  userId: string;
  email: string;
  name: string;
  role: string;
  instituteId: string | null;
  instituteName?: string;
  instituteStatus?: string;
}

export async function getSession(): Promise<SessionUser | null> {
  const cookieStore = await cookies();
  const session = cookieStore.get("session");

  if (!session) {
    return null;
  }

  try {
    return JSON.parse(session.value) as SessionUser;
  } catch {
    return null;
  }
}

export function hasRole(
  session: SessionUser | null,
  roles: string[],
): boolean {
  if (!session) {
    return false;
  }

  return roles.includes(session.role);
}

export function requireRoles(
  session: SessionUser | null,
  roles: string[],
): Response | null {
  if (!session) {
    return Response.json(
      { error: "Unauthorized" },
      { status: 401 },
    );
  }

  if (!roles.includes(session.role)) {
    return Response.json(
      { error: "Forbidden" },
      { status: 403 },
    );
  }

  return null;
}

export function requireInstituteAdmin(
  session: SessionUser | null,
): Response | null {
  if (!session) {
    return Response.json(
      { error: "Unauthorized" },
      { status: 401 },
    );
  }

  if (
    session.role !== "SUPER_ADMIN" &&
    session.role !== "INSTITUTE_ADMIN"
  ) {
    return Response.json(
      { error: "Forbidden" },
      { status: 403 },
    );
  }

  return null;
}