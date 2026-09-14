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
  try {
    const cookieStore = await cookies();
    const session = cookieStore.get("session");
    if (!session) return null;
    return JSON.parse(session.value) as SessionUser;
  } catch {
    return null;
  }
}

export function requireAuth(session: SessionUser | null): Response | null {
  if (!session) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }
  return null;
}

export function requireInstituteAdmin(session: SessionUser | null): Response | null {
  const authError = requireAuth(session);
  if (authError) return authError;
  if (
    session!.role !== "INSTITUTE_ADMIN" &&
    session!.role !== "SUPER_ADMIN"
  ) {
    return Response.json({ error: "Forbidden" }, { status: 403 });
  }
  return null;
}

export function requireSuperAdmin(session: SessionUser | null): Response | null {
  const authError = requireAuth(session);
  if (authError) return authError;
  if (session!.role !== "SUPER_ADMIN") {
    return Response.json({ error: "Forbidden" }, { status: 403 });
  }
  return null;
}
