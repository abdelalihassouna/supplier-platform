import { NextResponse } from "next/server"
import { config, validateConfig } from "@/lib/config"
import { query } from "@/lib/db"

export async function GET() {
  try {
    // Validate configuration
    validateConfig()

    // Test database connection via Postgres
    let dbHealthy = true
    try {
      await query("SELECT 1")
    } catch {
      dbHealthy = false
    }

    const health = {
      status: "healthy",
      timestamp: new Date().toISOString(),
      version: config.app.version,
      environment: config.app.environment,
      services: {
        database: dbHealthy ? "healthy" : "unhealthy",
        jaggaer: config.jaggaer.enabled ? "configured" : "not_configured",
      },
      configuration: {
        database: "postgresql",
        jaggaer: config.jaggaer.enabled ? "configured" : "missing_credentials",
      },
    }

    return NextResponse.json(health)
  } catch (error) {
    return NextResponse.json(
      {
        status: "unhealthy",
        error: error instanceof Error ? error.message : "Unknown error",
        timestamp: new Date().toISOString(),
      },
      { status: 500 },
    )
  }
}
