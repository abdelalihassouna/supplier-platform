import { NextRequest, NextResponse } from "next/server"
import { query } from "@/lib/db"
import { config } from "@/lib/config"

// Secure system settings API backed by system_settings table
// Path param [key] is strictly whitelisted to avoid arbitrary keys

const ALLOWED_KEYS_ARRAY = ["jaggaer", "mistral", "italian-gov", "email"] as const
const ALLOWED_KEYS = new Set(ALLOWED_KEYS_ARRAY)

function validateKey(key: string) {
  return ALLOWED_KEYS.has(key as (typeof ALLOWED_KEYS_ARRAY)[number])
}

async function getSetting(key: string) {
  const { rows } = await query<{ setting_value: any; description: string }>(
    "SELECT setting_value, description FROM system_settings WHERE setting_key = $1 LIMIT 1",
    [key],
  )
  if (rows.length === 0) return null
  return rows[0]
}

async function upsertSetting(key: string, value: any, description?: string) {
  await query(
    `INSERT INTO system_settings (setting_key, setting_value, description, updated_at)
     VALUES ($1, $2::jsonb, $3, NOW())
     ON CONFLICT (setting_key)
     DO UPDATE SET setting_value = EXCLUDED.setting_value,
                   description = COALESCE(EXCLUDED.description, system_settings.description),
                   updated_at = NOW()`,
    [key, JSON.stringify(value ?? {}), description || null],
  )
}

async function deleteSetting(key: string) {
  await query("DELETE FROM system_settings WHERE setting_key = $1", [key])
}

export async function GET(_req: NextRequest, ctx: { params: Promise<{ key: string }> }) {
  try {
    if (!config.database.usePostgreSQL) {
      return NextResponse.json({ error: "Database not configured" }, { status: 503 })
    }
    const { key } = await ctx.params
    if (!validateKey(key)) {
      return NextResponse.json({ error: "Invalid settings key" }, { status: 400 })
    }
    const data = await getSetting(key)
    return NextResponse.json({ success: true, data: data?.setting_value || null, description: data?.description || null })
  } catch (err) {
    console.error("system-settings GET error:", err)
    return NextResponse.json({ error: "Failed to load setting" }, { status: 500 })
  }
}

export async function PUT(req: NextRequest, ctx: { params: Promise<{ key: string }> }) {
  try {
    if (!config.database.usePostgreSQL) {
      return NextResponse.json({ error: "Database not configured" }, { status: 503 })
    }
    const { key } = await ctx.params
    if (!validateKey(key)) {
      return NextResponse.json({ error: "Invalid settings key" }, { status: 400 })
    }

    const body = await req.json().catch(() => null)
    if (typeof body !== "object" || body === null) {
      return NextResponse.json({ error: "Invalid payload" }, { status: 400 })
    }

    // Optional description support
    const { description, ...value } = body as any

    // Basic payload size guard
    const jsonStr = JSON.stringify(value)
    const size = typeof Buffer !== "undefined" ? Buffer.byteLength(jsonStr, "utf8") : new TextEncoder().encode(jsonStr).length
    if (size > 100 * 1024) {
      return NextResponse.json({ error: "Payload too large" }, { status: 413 })
    }

    await upsertSetting(key, value, typeof description === "string" ? description : undefined)
    return NextResponse.json({ success: true })
  } catch (err) {
    console.error("system-settings PUT error:", err)
    return NextResponse.json({ error: "Failed to save setting" }, { status: 500 })
  }
}

export async function DELETE(_req: NextRequest, ctx: { params: Promise<{ key: string }> }) {
  try {
    if (!config.database.usePostgreSQL) {
      return NextResponse.json({ error: "Database not configured" }, { status: 503 })
    }
    const { key } = await ctx.params
    if (!validateKey(key)) {
      return NextResponse.json({ error: "Invalid settings key" }, { status: 400 })
    }

    await deleteSetting(key)
    return NextResponse.json({ success: true })
  } catch (err) {
    console.error("system-settings DELETE error:", err)
    return NextResponse.json({ error: "Failed to delete setting" }, { status: 500 })
  }
}
