import { type NextRequest, NextResponse } from "next/server"
import { JaggaerAttachmentClient } from "@/lib/jaggaer-client"
import { query } from "@/lib/db"

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams
    const secureToken = searchParams.get("secureToken")
    const fileId = searchParams.get("fileId")
    const fileName = searchParams.get("fileName")

    if (!secureToken && (!fileId || !fileName)) {
      return NextResponse.json(
        { error: "Either secureToken or both fileId and fileName are required" },
        { status: 400 },
      )
    }

    // Load Jaggaer credentials: env preferred, else DB 'jaggaer'
    let baseUrl = process.env.JAGGAER_BASE_URL || ""
    let clientId = process.env.JAGGAER_CLIENT_ID || ""
    let clientSecret = process.env.JAGGAER_CLIENT_SECRET || ""

    console.log("Initial credentials from env:", {
      baseUrl: baseUrl ? `${baseUrl.slice(0, 20)}...` : "empty",
      clientId: clientId ? `${clientId.slice(0, 8)}...` : "empty",
      clientSecret: clientSecret ? "***" : "empty"
    })

    if (!baseUrl || !clientId || !clientSecret) {
      try {
        console.log("Loading credentials from database...")
        const { rows } = await query<{ setting_value: any }>(
          "SELECT setting_value FROM system_settings WHERE setting_key = $1 LIMIT 1",
          ["jaggaer"],
        )
        console.log("DB query result:", rows.length > 0 ? "found settings" : "no settings found")
        
        if (rows.length) {
          const v = rows[0].setting_value || {}
          console.log("DB settings keys:", Object.keys(v))
          baseUrl = baseUrl || String(v.baseUrl || "")
          clientId = clientId || String(v.clientId || "")
          clientSecret = clientSecret || String(v.clientSecret || "")
        }
      } catch (dbError) {
        console.error("Database credential loading failed:", dbError)
      }
    }

    console.log("Final credentials:", {
      baseUrl: baseUrl ? `${baseUrl.slice(0, 20)}...` : "empty",
      clientId: clientId ? `${clientId.slice(0, 8)}...` : "empty",
      clientSecret: clientSecret ? "***" : "empty"
    })

    if (!baseUrl || !clientId || !clientSecret) {
      return NextResponse.json({ 
        error: "Jaggaer configuration missing", 
        details: {
          hasBaseUrl: !!baseUrl,
          hasClientId: !!clientId,
          hasClientSecret: !!clientSecret
        }
      }, { status: 500 })
    }

    // Validate baseUrl format
    if (baseUrl.includes('your_jaggaer_api_url') || !baseUrl.startsWith('http')) {
      return NextResponse.json({ 
        error: "Invalid Jaggaer base URL", 
        details: "Base URL appears to be a placeholder or invalid format"
      }, { status: 500 })
    }

    const client = new JaggaerAttachmentClient({ baseUrl, clientId, clientSecret })
    let blob: Blob

    if (secureToken) {
      blob = await client.downloadBySecureToken(secureToken, fileName || undefined)
    } else {
      blob = await client.downloadByFileId(fileId!, fileName!)
    }

    // Return the file as a response
    const headers = new Headers()
    headers.set("Content-Type", blob.type || "application/octet-stream")
    headers.set("Content-Length", blob.size.toString())

    if (fileName) {
      headers.set("Content-Disposition", `attachment; filename="${fileName}"`)
    }

    return new NextResponse(blob.stream(), {
      status: 200,
      headers,
    })
  } catch (error) {
    console.error("Jaggaer download error:", error)
    return NextResponse.json(
      { error: "Failed to download file", details: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 },
    )
  }
}
