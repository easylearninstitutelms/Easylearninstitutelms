import { cookies } from "next/headers";

export async function GET() {
  try {
    const cookieStore = await cookies();
    const session = cookieStore.get("session");
    if (!session) {
      return Response.json({ user: null }, { status: 401 });
    }
    const user = JSON.parse(session.value);
    return Response.json({ user });
  } catch {
    return Response.json({ user: null }, { status: 401 });
  }
}
