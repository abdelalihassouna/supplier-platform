import { Pool, type PoolClient } from "pg"

// PostgreSQL connection configuration
const pool = new Pool({
  host: process.env.POSTGRES_HOST || "localhost",
  port: Number.parseInt(process.env.POSTGRES_PORT || "5432"),
  database: process.env.POSTGRES_DATABASE || "supplier_certification_db",
  user: process.env.POSTGRES_USER || "supplier_app",
  password: process.env.POSTGRES_PASSWORD,
  ssl: process.env.NODE_ENV === "production" ? { rejectUnauthorized: false } : false,
  max: 20,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 2000,
})

// Database client wrapper
export class DatabaseClient {
  private pool: Pool

  constructor() {
    this.pool = pool
  }

  async query(text: string, params?: any[]) {
    const client = await this.pool.connect()
    try {
      const result = await client.query(text, params)
      return result
    } finally {
      client.release()
    }
  }

  async transaction<T>(callback: (client: PoolClient) => Promise<T>): Promise<T> {
    const client = await this.pool.connect()
    try {
      await client.query("BEGIN")
      const result = await callback(client)
      await client.query("COMMIT")
      return result
    } catch (error) {
      await client.query("ROLLBACK")
      throw error
    } finally {
      client.release()
    }
  }

  async close() {
    await this.pool.end()
  }
}

// Export singleton instance
export const db = new DatabaseClient()

// Helper functions for common operations
export async function findSupplierById(id: string) {
  const result = await db.query("SELECT * FROM suppliers WHERE id = $1", [id])
  return result.rows[0]
}

export async function findSuppliersByStatus(status: string, limit = 50, offset = 0) {
  const result = await db.query(
    "SELECT * FROM suppliers WHERE verification_status = $1 ORDER BY created_at DESC LIMIT $2 OFFSET $3",
    [status, limit, offset],
  )
  return result.rows
}

export async function createSupplier(supplierData: any) {
  const {
    bravo_id,
    company_name,
    fiscal_code,
    vat_number,
    legal_form,
    address,
    city,
    province,
    postal_code,
    country,
    phone,
    email,
    website,
    pec_email,
    legal_representative,
  } = supplierData

  const result = await db.query(
    `
    INSERT INTO suppliers (
      bravo_id, company_name, fiscal_code, vat_number, legal_form,
      address, city, province, postal_code, country, phone, email,
      website, pec_email, legal_representative
    ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15)
    RETURNING *
  `,
    [
      bravo_id,
      company_name,
      fiscal_code,
      vat_number,
      legal_form,
      address,
      city,
      province,
      postal_code,
      country,
      phone,
      email,
      website,
      pec_email,
      legal_representative,
    ],
  )

  return result.rows[0]
}

export async function updateSupplier(id: string, updates: any) {
  const fields = Object.keys(updates)
  const values = Object.values(updates)
  const setClause = fields.map((field, index) => `${field} = $${index + 2}`).join(", ")

  const result = await db.query(`UPDATE suppliers SET ${setClause} WHERE id = $1 RETURNING *`, [id, ...values])

  return result.rows[0]
}
