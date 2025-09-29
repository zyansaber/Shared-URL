// app/api/users/route.ts
import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { getPool, sql } from "@/lib/db";
import { hashPassword } from "@/lib/password";

export const dynamic = "force-dynamic";

// GET /api/users -> list users (admin only)
export async function GET() {
  const session: any = await getServerSession(authOptions);
  if (!session || session.role !== "admin") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const pool = await getPool();
  const rs = await pool.request().query(`
    select
      id,
      full_name as fullName,
      email,
      role
    from dbo.Users
    order by full_name asc, email asc
  `);

  return NextResponse.json(rs.recordset ?? []);
}

// POST /api/users -> create user (admin only)
export async function POST(req: NextRequest) {
  try {
    const session: any = await getServerSession(authOptions);
    if (!session || session.role !== "admin") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const body = await req.json();
    const fullName = (body.fullName || "").trim();
    const email = (body.email || "").trim().toLowerCase();
    const role = (body.role || "user").toLowerCase();
    const password = String(body.password || "");

    if (!fullName || !email || !password) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 }
      );
    }
    if (!["user", "admin"].includes(role)) {
      return NextResponse.json({ error: "Invalid role" }, { status: 400 });
    }

    const pool = await getPool();

    // Duplicate email check
    const existing = await pool
      .request()
      .input("email", sql.NVarChar(255), email)
      .query("select id from dbo.Users where email=@email");
    if (existing.recordset.length > 0) {
      return NextResponse.json(
        { error: "Email already exists" },
        { status: 409 }
      );
    }

    // Hash password via shared helper (scrypt or bcrypt per your env)
    const stored = await hashPassword(password);

    const rs = await pool
      .request()
      .input("email", sql.NVarChar(255), email)
      .input("password_hash", sql.NVarChar(sql.MAX), stored)
      .input("full_name", sql.NVarChar(255), fullName)
      .input("role", sql.NVarChar(50), role).query(`
        insert into dbo.Users (email, password_hash, full_name, role)
        output inserted.id, inserted.email, inserted.full_name as fullName, inserted.role
        values (@email, @password_hash, @full_name, @role)
      `);

    return NextResponse.json(rs.recordset?.[0] ?? null, { status: 201 });
  } catch (err) {
    console.error("POST /api/users error", err);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
