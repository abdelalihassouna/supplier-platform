import { NextRequest, NextResponse } from "next/server"
import { query } from "@/lib/db"
import { config } from "@/lib/config"

// Cybersecurity considerations:
// - Validate inputs strictly and whitelist allowed values
// - Use parameterized queries only
// - Do not leak internal errors in responses
// - Return 503 if PostgreSQL is not configured

const SETTING_KEY = "jaggaer_integration"
// Use array literal with const assertion for type safety, then construct a Set for membership checks
const ALLOWED_COMPONENTS_ARRAY = ["MASTER", "DEBASIC", "DEINFO", "ATTACHMENTS"] as const
const ALLOWED_COMPONENTS = new Set(ALLOWED_COMPONENTS_ARRAY)

type AllowedComponent = (typeof ALLOWED_COMPONENTS_ARRAY)[number]

type JaggaerSettings = {
  selectedComponents: AllowedComponent[]
  maxTotal?: number
  batchSize?: number
  lastSync?: string | null
}

const DEFAULT_SETTINGS: JaggaerSettings = {
  selectedComponents: ["MASTER", "DEBASIC"],
  maxTotal: 1000,
  batchSize: 100,
  lastSync: null,
}

function isPositiveInteger(n: unknown) {
  return Number.isInteger(n) && (n as number) > 0
}

function sanitizeSettings(input: any): { valid: boolean; value?: JaggaerSettings; error?: string } {
  if (typeof input !== "object" || input === null) {
    return { valid: false, error: "Invalid payload" }
  }

  const out: JaggaerSettings = { ...DEFAULT_SETTINGS }

  // selectedComponents
  if (Array.isArray(input.selectedComponents)) {
    const unique = Array.from(new Set(input.selectedComponents)).filter((c) => typeof c === "string")
    const filtered = unique.filter((c) => ALLOWED_COMPONENTS.has(c as any)) as AllowedComponent[]
    if (filtered.length === 0) {
      return { valid: false, error: "selectedComponents must include at least one allowed component" }
    }
    out.selectedComponents = filtered
  } else if (input.selectedComponents !== undefined) {
    return { valid: false, error: "selectedComponents must be an array" }
  }

  // maxTotal (1..100000)
  if (input.maxTotal !== undefined) {
    const n = Number(input.maxTotal)
    if (!Number.isFinite(n) || n < 1 || n > 100000) {
      return { valid: false, error: "maxTotal must be between 1 and 100000" }
    }
    out.maxTotal = Math.floor(n)
  }

  // batchSize (1..1000)
  if (input.batchSize !== undefined) {
    const n = Number(input.batchSize)
    if (!Number.isFinite(n) || n < 1 || n > 1000) {
      return { valid: false, error: "batchSize must be between 1 and 1000" }
    }
    out.batchSize = Math.floor(n)
  }

  // lastSync is controlled by server; ignore if present

  return { valid: true, value: out }
}

async function getSettingsFromDb(): Promise<JaggaerSettings> {
  const { rows } = await query<{ setting_value: JaggaerSettings }>(
    "SELECT setting_value FROM system_settings WHERE setting_key = $1 LIMIT 1",
    [SETTING_KEY],
  )
  if (rows.length === 0) return DEFAULT_SETTINGS

  const value = rows[0].setting_value || {}
  // Merge with defaults to avoid missing keys
  return {
    ...DEFAULT_SETTINGS,
    ...value,
    selectedComponents: (value.selectedComponents || DEFAULT_SETTINGS.selectedComponents).filter((c: any) =>
      ALLOWED_COMPONENTS.has(c as any),
    ) as AllowedComponent[],
  }
}

async function upsertSettingsInDb(value: JaggaerSettings) {
  const description = "Jaggaer integration settings"
  await query(
    `INSERT INTO system_settings (setting_key, setting_value, description, updated_at)
     VALUES ($1, $2::jsonb, $3, NOW())
     ON CONFLICT (setting_key)
     DO UPDATE SET setting_value = EXCLUDED.setting_value, description = EXCLUDED.description, updated_at = NOW()`,
    [SETTING_KEY, JSON.stringify(value), description],
  )
}

async function deleteSettingsInDb() {
  await query("DELETE FROM system_settings WHERE setting_key = $1", [SETTING_KEY])
}

export async function GET(_req: NextRequest) {
  try {
    if (!config.database.usePostgreSQL) {
      return NextResponse.json({ error: "Database not configured" }, { status: 503 })
    }
    const settings = await getSettingsFromDb()
    return NextResponse.json({ success: true, data: settings })
  } catch (_err) {
    // Avoid leaking details
    return NextResponse.json({ error: "Failed to load settings" }, { status: 500 })
  }
}

export async function PUT(req: NextRequest) {
  try {
    if (!config.database.usePostgreSQL) {
      return NextResponse.json({ error: "Database not configured" }, { status: 503 })
    }

    const payload = await req.json().catch(() => null)
    const result = sanitizeSettings(payload)
    if (!result.valid || !result.value) {
      return NextResponse.json({ error: result.error || "Invalid payload" }, { status: 400 })
    }

    await upsertSettingsInDb(result.value)
    return NextResponse.json({ success: true, data: result.value })
  } catch (_err) {
    return NextResponse.json({ error: "Failed to update settings" }, { status: 500 })
  }
}

export async function DELETE(_req: NextRequest) {
  try {
    if (!config.database.usePostgreSQL) {
      return NextResponse.json({ error: "Database not configured" }, { status: 503 })
    }
    await deleteSettingsInDb()
    return NextResponse.json({ success: true })
  } catch (_err) {
    return NextResponse.json({ error: "Failed to delete settings" }, { status: 500 })
  }
}
