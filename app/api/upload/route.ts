import { type NextRequest, NextResponse } from "next/server"

// POST /api/upload - Handle file uploads
export async function POST(request: NextRequest) {
  try {
    // Local storage for uploads is not configured in this environment.
    // Implement file storage (filesystem/S3/etc.) and DB insert into `attachments` if needed.
    return NextResponse.json(
      {
        error: "File upload not implemented",
        details: "Local storage is not configured. Implement filesystem or object storage and DB persistence.",
      },
      { status: 501 },
    )
  } catch (error) {
    return NextResponse.json(
      { error: "Internal server error", details: (error as Error).message },
      { status: 500 },
    )
  }
}
