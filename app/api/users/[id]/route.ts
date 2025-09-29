// app/api/users/[id]/route.ts
import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { getPool, sql } from "@/lib/db";

export const dynamic = "force-dynamic";

// PATCH /api/users/:id  -> update full name and/or role (admin only)
export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const session: any = await getServerSession(authOptions);
  if (!session || session.role !== "admin") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = await req.json();
  const fullName =
    typeof body.fullName === "string" ? body.fullName.trim() : undefined;
  const role =
    typeof body.role === "string" ? body.role.toLowerCase() : undefined;
  if (role && !["user", "admin"].includes(role)) {
    return NextResponse.json({ error: "Invalid role" }, { status: 400 });
  }

  const pool = await getPool();
  // Build dynamic update
  const sets: string[] = [];
  if (fullName !== undefined) sets.push("full_name=@full_name");
  if (role !== undefined) sets.push("role=@role");
  if (sets.length === 0) return NextResponse.json({ ok: true });

  const q = `
    update dbo.Users
    set ${sets.join(", ")}
    where id=@id
  `;
  const reqDb = pool.request().input("id", sql.UniqueIdentifier, params.id);
  if (fullName !== undefined)
    reqDb.input("full_name", sql.NVarChar(255), fullName);
  if (role !== undefined) reqDb.input("role", sql.NVarChar(50), role);
  await reqDb.query(q);

  return NextResponse.json({ ok: true });
}

// DELETE /api/users/:id  -> delete user (admin only; can’t delete self)
export async function DELETE(
  _: NextRequest,
  { params }: { params: { id: string } }
) {
  const session: any = await getServerSession(authOptions);
  if (!session || session.role !== "admin") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const pool = await getPool();

  // Optionally prevent deleting oneself if you store user id in session
  // If session has userId, uncomment below:
  // if (session.userId === params.id) {
  //   return NextResponse.json({ error: "You cannot delete your own account." }, { status: 400 });
  // }

  await pool
    .request()
    .input("id", sql.UniqueIdentifier, params.id)
    .query("delete from dbo.Users where id=@id");

  return NextResponse.json({ ok: true });
}
