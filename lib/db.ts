import { Pool } from "pg"
import { config } from "@/lib/config"

let pool: Pool | null = null

export function getPool() {
  if (!pool) {
    pool = new Pool({
      host: config.database.postgresql.host,
      port: config.database.postgresql.port,
      database: config.database.postgresql.database,
      user: config.database.postgresql.user,
      password: config.database.postgresql.password,
      ssl: config.database.postgresql.ssl ? { rejectUnauthorized: false } : false,
      max: 10,
    })
  }
  return pool
}

export async function query<T = any>(text: string, params?: any[]): Promise<{ rows: T[]; rowCount: number }>
export async function query(text: string, params: any[] = []) {
  const client = await getPool().connect()
  try {
    const res = await client.query(text, params)
    return { rows: res.rows, rowCount: res.rowCount }
  } finally {
    client.release()
  }
}
