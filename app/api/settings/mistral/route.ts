import { type NextRequest, NextResponse } from "next/server"
import { query } from "@/lib/db"

export async function POST(request: NextRequest) {
  try {
    const { apiKey, model, maxTokens } = await request.json()

    if (!apiKey) {
      return NextResponse.json({ error: "API key is required" }, { status: 400 })
    }

    // Store configuration in system_settings as JSON under key 'mistral_config'
    const payload = {
      apiKey,
      model: model || "mistral-large-latest",
      maxTokens: Number.parseInt(maxTokens) || 4000,
    }

    await query(
      `INSERT INTO system_settings (setting_key, setting_value)
       VALUES ('mistral_config', $1)
       ON CONFLICT (setting_key)
       DO UPDATE SET setting_value = EXCLUDED.setting_value`,
      [JSON.stringify(payload)],
    )

    return NextResponse.json({ success: true, message: "Mistral configuration saved successfully" })
  } catch (error) {
    console.error("Mistral config error:", error)
    return NextResponse.json({ error: "Internal server error", details: (error as Error).message }, { status: 500 })
  }
}

export async function GET(request: NextRequest) {
  try {
    const res = await query<{ setting_value: any }>(
      `SELECT setting_value FROM system_settings WHERE setting_key = 'mistral_config' LIMIT 1`,
    )
    const config = res.rows[0]?.setting_value || {}
    const mistralConfig = typeof config === 'string' ? JSON.parse(config) : config

    return NextResponse.json({
      apiKey: mistralConfig.apiKey ? "***configured***" : "",
      model: mistralConfig.model || "mistral-large-latest",
      maxTokens: mistralConfig.maxTokens || 4000,
    })
  } catch (error) {
    console.error("Mistral config fetch error:", error)
    return NextResponse.json({ error: "Internal server error", details: (error as Error).message }, { status: 500 })
  }
}
