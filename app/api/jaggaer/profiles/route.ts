import { type NextRequest, NextResponse } from "next/server"
import { JaggaerAPIClient } from "@/lib/jaggaer-client"
import { query } from "@/lib/db"

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams
    const componentsParam = searchParams.get("components")
    const components = componentsParam ? componentsParam.split(",") : []
    const startParam = searchParams.get("start")
    const start = Number.parseInt(startParam ?? "1")
    const batchSizeParam = searchParams.get("batchSize")
    const batchSize = Number.parseInt(batchSizeParam ?? "100")
    const maxTotalParam = searchParams.get("maxTotal")
    const maxTotal = maxTotalParam ? Number.parseInt(maxTotalParam) : undefined

    // Prefer DB system_settings('jaggaer'); fallback to env only if missing
    let baseUrl = ""
    let clientId = ""
    let clientSecret = ""
    try {
      const { rows } = await query<{ setting_value: any }>(
        "SELECT setting_value FROM system_settings WHERE setting_key = $1 LIMIT 1",
        ["jaggaer"],
      )
      if (rows.length) {
        const v = rows[0].setting_value || {}
        baseUrl = String(v.baseUrl || "")
        clientId = String(v.clientId || "")
        clientSecret = String(v.clientSecret || "")
      }
    } catch (_) {
      // ignore to avoid leaking details; will fall back to env below
    }
    if (!baseUrl) baseUrl = process.env.JAGGAER_BASE_URL || ""
    if (!clientId) clientId = process.env.JAGGAER_CLIENT_ID || ""
    if (!clientSecret) clientSecret = process.env.JAGGAER_CLIENT_SECRET || ""

    // Basic validation
    if (!baseUrl || !clientId || !clientSecret) {
      return NextResponse.json({ error: "Jaggaer configuration missing" }, { status: 500 })
    }
    try {
      const trimmed = baseUrl.trim()
      // eslint-disable-next-line no-new
      new URL(trimmed)
      baseUrl = trimmed
    } catch {
      return NextResponse.json({ error: "Invalid Jaggaer baseUrl" }, { status: 400 })
    }

    const config = { baseUrl, clientId, clientSecret }

    const client = new JaggaerAPIClient(config)

    if (searchParams.get("all") === "true") {
      const profiles = await client.getAllCompanyProfiles({
        components: components.length > 0 ? components : undefined,
        batchSize,
        maxTotal,
      })

      // Extract and normalize company info
      const companies = profiles.map((profile) => ({
        ...client.extractCompanyInfo(profile),
        certifications: client.extractCertifications(profile),
        answers: client.extractDebasicAnswers(profile),
        raw_profile: profile, // Include raw data for debugging
      }))

      return NextResponse.json({
        success: true,
        data: companies,
        total: companies.length,
      })
    } else {
      const response = await client.getCompanyProfiles({
        components: components.length > 0 ? components : undefined,
        start,
      })

      return NextResponse.json({
        success: true,
        data: response,
      })
    }
  } catch (error) {
    console.error("Jaggaer API error:", error)
    return NextResponse.json(
      { error: "Failed to fetch company profiles", details: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 },
    )
  }
}
