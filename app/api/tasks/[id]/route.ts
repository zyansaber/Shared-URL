import { NextRequest, NextResponse } from "next/server";
import { getPool, sql } from "@/lib/db";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

export const dynamic = "force-dynamic";

// GET /api/tasks/:id  -> non-admin can only read their own task
export async function GET(
  _: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session: any = await getServerSession(authOptions);
    if (!session) return NextResponse.json({}, { status: 404 });

    const pool = await getPool();

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

    // fetch task
    const tr = await pool.request().input("id", sql.UniqueIdentifier, params.id)
      .query(`
        select
          id, title, body, status,
          due_date   as dueDate,
          created_by as createdBy,
          assignee,
          created_at as created_at,
          updated_at as updated_at
        from dbo.Tasks
        where id=@id
      `);

    const task = tr.recordset?.[0];
    if (!task) return NextResponse.json({}, { status: 404 });

    if (
      !isAdmin &&
      task.createdBy?.toLowerCase?.() !== userId?.toLowerCase?.()
    ) {
      return NextResponse.json({}, { status: 404 }); // hide existence
    }

    return NextResponse.json(task);
  } catch (e) {
    return NextResponse.json({}, { status: 200 });
  }
}
