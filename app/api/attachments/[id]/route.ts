import { NextRequest, NextResponse } from "next/server"
import { query } from "@/lib/db"

// GET /api/attachments/[id] - Download attachment directly from database
export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id: attachmentId } = await params

    // Fetch attachment from database
    const { rows } = await query(
      `SELECT filename, original_filename, content_type, file_size, file_data, download_status
       FROM supplier_attachments 
       WHERE id = $1::uuid AND download_status = 'success'`,
      [attachmentId]
    )

    if (!rows.length) {
      return NextResponse.json({ error: "Attachment not found or not available" }, { status: 404 })
    }

    const attachment = rows[0]
    
    if (!attachment.file_data) {
      return NextResponse.json({ error: "Attachment data not available" }, { status: 404 })
    }

    // Create response with file data
    const headers = new Headers()
    headers.set("Content-Type", attachment.content_type || "application/octet-stream")
    headers.set("Content-Length", attachment.file_size?.toString() || "0")
    
    const filename = attachment.filename || attachment.original_filename || "attachment"
    headers.set("Content-Disposition", `inline; filename="${filename}"`)

    return new NextResponse(attachment.file_data, {
      status: 200,
      headers,
    })

  } catch (error) {
    console.error("Attachment download error:", error)
    return NextResponse.json(
      { error: "Failed to download attachment", details: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 }
    )
  }
}
