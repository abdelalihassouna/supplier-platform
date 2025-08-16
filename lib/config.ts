export const config = {
  // Database Configuration
  database: {
    // Use PostgreSQL if explicitly enabled, otherwise use Supabase
    usePostgreSQL: process.env.USE_POSTGRESQL === "true",

    // PostgreSQL Configuration
    postgresql: {
      host: process.env.POSTGRES_HOST || "localhost",
      port: Number.parseInt(process.env.POSTGRES_PORT || "5432"),
      database: process.env.POSTGRES_DATABASE || "db_vai",
      user: process.env.POSTGRES_USER || "postgres",
      password: process.env.POSTGRES_PASSWORD || "Python92",
      ssl: process.env.NODE_ENV === "production",
      enabled: !!(
        process.env.POSTGRES_HOST &&
        process.env.POSTGRES_DATABASE &&
        process.env.POSTGRES_USER &&
        process.env.POSTGRES_PASSWORD
      ),
    },

    // Supabase Configuration (legacy/fallback)
    supabase: {
      url: process.env.NEXT_PUBLIC_SUPABASE_URL || "",
      anonKey: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "",
      serviceRoleKey: process.env.SUPABASE_SERVICE_ROLE_KEY || "",
      enabled: !!(
        process.env.NEXT_PUBLIC_SUPABASE_URL &&
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY &&
        process.env.SUPABASE_SERVICE_ROLE_KEY
      ),
    },
  },

  // Authentication Configuration
  auth: {
    redirectUrl:
      process.env.NEXT_PUBLIC_DEV_SUPABASE_REDIRECT_URL || process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000",
    siteUrl: process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000",
  },

  // Jaggaer Integration Configuration
  jaggaer: {
    baseUrl: process.env.JAGGAER_BASE_URL || "",
    clientId: process.env.JAGGAER_CLIENT_ID || "",
    clientSecret: process.env.JAGGAER_CLIENT_SECRET || "",
    enabled: !!(process.env.JAGGAER_BASE_URL && process.env.JAGGAER_CLIENT_ID && process.env.JAGGAER_CLIENT_SECRET),
  },

  mistral: {
    apiKey: process.env.MISTRAL_API_KEY || "",
    model: process.env.MISTRAL_MODEL || "mistral-large-latest",
    maxTokens: Number.parseInt(process.env.MISTRAL_MAX_TOKENS || "4000"),
    enabled: !!process.env.MISTRAL_API_KEY,
  },

  storage: {
    blobToken: process.env.BLOB_READ_WRITE_TOKEN || "",
    enabled: !!process.env.BLOB_READ_WRITE_TOKEN,
  },

  // Application Configuration
  app: {
    name: "Supplier Certification Platform",
    version: "1.0.0",
    environment: process.env.NODE_ENV || "development",
  },
} as const

export function validateConfig() {
  const missing: string[] = []
  const warnings: string[] = []

  // Check database configuration
  if (config.database.usePostgreSQL) {
    // Validate PostgreSQL configuration
    if (!config.database.postgresql.host) missing.push("POSTGRES_HOST")
    if (!config.database.postgresql.database) missing.push("POSTGRES_DATABASE")
    if (!config.database.postgresql.user) missing.push("POSTGRES_USER")
    if (!config.database.postgresql.password) missing.push("POSTGRES_PASSWORD")

    console.log("🐘 Using PostgreSQL database")
  } else {
    // Validate Supabase configuration
    if (!config.database.supabase.url) missing.push("NEXT_PUBLIC_SUPABASE_URL")
    if (!config.database.supabase.anonKey) missing.push("NEXT_PUBLIC_SUPABASE_ANON_KEY")
    if (!config.database.supabase.serviceRoleKey) missing.push("SUPABASE_SERVICE_ROLE_KEY")

    console.log("☁️ Using Supabase database")
  }

  // Check optional integrations
  if (!config.jaggaer.enabled) {
    warnings.push("Jaggaer integration not configured - supplier sync will be disabled")
  }

  if (!config.mistral.enabled) {
    warnings.push("Mistral OCR not configured - document extraction will be disabled")
  }

  if (!config.storage.enabled) {
    warnings.push("Blob storage not configured - file uploads will be disabled")
  }

  // Log warnings
  if (warnings.length > 0) {
    console.warn("⚠️ Configuration warnings:")
    warnings.forEach((warning) => console.warn(`  - ${warning}`))
  }

  // Throw error for missing required variables
  if (missing.length > 0) {
    throw new Error(`Missing required environment variables: ${missing.join(", ")}`)
  }

  return true
}

export function getDatabaseType(): "postgresql" | "supabase" {
  return config.database.usePostgreSQL ? "postgresql" : "supabase"
}

export function isFeatureEnabled(feature: "jaggaer" | "mistral" | "storage"): boolean {
  switch (feature) {
    case "jaggaer":
      return config.jaggaer.enabled
    case "mistral":
      return config.mistral.enabled
    case "storage":
      return config.storage.enabled
    default:
      return false
  }
}
