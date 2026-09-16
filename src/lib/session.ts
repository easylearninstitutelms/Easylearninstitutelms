export function hasRole(
  session: SessionUser | null,
  roles: string[],
): boolean {
  if (!session) return false;

  return roles.includes(session.role);
}

export function requireRoles(
  session: SessionUser | null,
  roles: string[],
) {
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