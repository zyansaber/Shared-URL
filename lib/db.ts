import sql from 'mssql'
let pool: sql.ConnectionPool | null = null
export async function getPool() {
  if (pool && pool.connected) return pool
  pool = await sql.connect(process.env.DATABASE_URL as string)
  return pool
}
export { sql }
