import { NextRequest, NextResponse } from "next/server";
import { getPool, sql } from "@/lib/db";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

export const dynamic = "force-dynamic";

const ALLOWED = new Set(["open", "closed"]);

// POST /api/tasks/:id/status  -> only owner or admin may update
export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session: any = await getServerSession(authOptions);
    if (!session) return NextResponse.json({ ok: false }, { status: 403 });

    const body = await req.json();
    let next = String(body.status || "open").toLowerCase();
    if (next === "resolved") next = "closed";
    const ALLOWED = new Set(["open", "in_progress", "closed"]);
    if (!ALLOWED.has(next)) next = "open";

    const pool = await getPool();

    // load task to check ownership
    const tr = await pool
      .request()
      .input("id", sql.UniqueIdentifier, params.id)
      .query("select created_by from dbo.Tasks where id=@id");
    const task = tr.recordset?.[0];
    if (!task) return NextResponse.json({ ok: false }, { status: 404 });

    // who am I?
    let userId: string | null = null;
    if (session.user?.email) {
      const u = await pool
        .request()
        .input("email", sql.NVarChar(255), session.user.email)
        .query("select id from dbo.Users where email=@email");
      userId = u.recordset?.[0]?.id ?? null;
    }

    const isAdmin = session.role === "admin";
    const isOwner =
      task.created_by?.toLowerCase?.() === userId?.toLowerCase?.();

    if (!isAdmin && !isOwner) {
      return NextResponse.json({ ok: false }, { status: 403 });
    }

    await pool
      .request()
      .input("id", sql.UniqueIdentifier, params.id)
      .input("status", sql.NVarChar(50), next)
      .query("update dbo.Tasks set status=@status where id=@id");

    return NextResponse.json({ ok: true, status: next });
  } catch {
    return NextResponse.json({ ok: false }, { status: 200 });
  }
}
