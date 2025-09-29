import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { getPool, sql } from '@/lib/db'

export async function GET(_: NextRequest, { params }: { params: { id: string } }) {
  const pool = await getPool()
  const rs = await pool.request().input('id', sql.UniqueIdentifier, params.id).query(`
    select c.id, c.task_id, c.author_id, c.message, c.created_at,
           u.full_name as author_name, u.email as author_email
    from dbo.TaskComments c
    join dbo.Users u on u.id = c.author_id
    where c.task_id=@id
    order by c.created_at asc
  `)
  return NextResponse.json(rs.recordset)
}

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions)
  if (!session || !(session as any).user?.email) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const body = await req.json()
  const pool = await getPool()
  const u = await pool.request().input('email', sql.NVarChar(255), (session as any).user.email).query('select id from dbo.Users where email=@email')
  const userId = u.recordset[0]?.id
  await pool.request()
    .input('task_id', sql.UniqueIdentifier, params.id)
    .input('author_id', sql.UniqueIdentifier, userId)
    .input('message', sql.NVarChar(sql.MAX), body.message || '')
    .query('insert into dbo.TaskComments (task_id, author_id, message) values (@task_id, @author_id, @message)')
  return NextResponse.json({ ok: true })
}
