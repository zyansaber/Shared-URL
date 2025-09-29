import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { getPool, sql } from "@/lib/db";
import { sendTaskCreatedEmail } from "@/lib/email";

export const dynamic = "force-dynamic";

// GET /api/tasks  -> list tasks; non-admins only see their own
export async function GET() {
  try {
    const session: any = await getServerSession(authOptions);
    if (!session) return NextResponse.json([]); // signed-out sees nothing

    const pool = await getPool();

    // resolve current user's id
    let userId: string | null = null;
    if (session.user?.email) {
      const u = await pool
        .request()
        .input("email", sql.NVarChar(255), session.user.email)
        .query("select id from dbo.Users where email=@email");
      userId = u.recordset?.[0]?.id ?? null;
    }

    // admins see all; others see only their tasks
    const isAdmin = session.role === "admin";

    const q = isAdmin
      ? `
        select
          id, title, body, status,
          due_date   as dueDate,
          created_by as createdBy,
          assignee,
          created_at as created_at,
          updated_at as updated_at
        from dbo.Tasks
        order by created_at desc
      `
      : `
        select
          id, title, body, status,
          due_date   as dueDate,
          created_by as createdBy,
          assignee,
          created_at as created_at,
          updated_at as updated_at
        from dbo.Tasks
        where created_by = @uid
        order by created_at desc
      `;

    const req = pool.request();
    if (!isAdmin) req.input("uid", sql.UniqueIdentifier, userId);

    const rs = await req.query(q);
    return NextResponse.json(rs.recordset ?? []);
  } catch (err) {
    console.error("GET /api/tasks error", err);
    return NextResponse.json([], { status: 200 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const session: any = await getServerSession(authOptions);
    if (!session)
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const body = await req.json();
    const pool = await getPool();

    // resolve current user id for created_by if possible
    let createdBy: any = null;
    if (session?.user?.email) {
      const u = await pool
        .request()
        .input("email", sql.NVarChar(255), session.user.email)
        .query("select id from dbo.Users where email=@email");
      createdBy = u.recordset?.[0]?.id ?? null;
    }

    const rs = await pool
      .request()
      .input("title", sql.NVarChar(200), body.title ?? "")
      .input("bbody", sql.NVarChar(sql.MAX), body.body ?? "")
      .input("status", sql.NVarChar(50), body.status ?? "open")
      .input("created_by", sql.UniqueIdentifier, createdBy).query(`
        insert into dbo.Tasks (title, body, status, created_by)
        output
          inserted.id,
          inserted.title,
          inserted.body,
          inserted.status,
          inserted.created_by  as createdBy,
          inserted.assignee,
          inserted.created_at  as created_at,
          inserted.updated_at  as updated_at
        values (@title, @bbody, @status,  @created_by)
      `);

    const created = rs.recordset?.[0] ?? null;

    // Send ACS email (non-blocking)
    const mail = sendTaskCreatedEmail({
      to: "et123.woo@gmail.com",
      title: created?.title ?? "",
      body: created?.body ?? "",
      taskId: created?.id ?? "",
    }).catch((e) => console.error("[email] bg error:", e));

    console.log("[email] task-created mail:", mail);

    return NextResponse.json(created, { status: 201 });
  } catch (err: any) {
    console.error("POST /api/tasks error", err);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
