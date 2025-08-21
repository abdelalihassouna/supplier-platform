import { type NextRequest, NextResponse } from "next/server"
import { AIVerificationService } from "@/lib/ai-verification-service"
import { query } from "@/lib/db"

// POST /api/documents/verify - Start AI verification for a document
export async function POST(request: NextRequest) {
  try {
    const { analysisId, docType, forceRerun = false } = await request.json()

    console.log('Verification request for analysisId:', analysisId, 'docType:', docType)

    if (!analysisId) {
      return NextResponse.json(
        { error: "Analysis ID is required" },
        { status: 400 }
      )
    }

    if (!docType) {
      return NextResponse.json(
        { error: "Document type is required" },
        { status: 400 }
      )
    }

    const validDocTypes = ['DURC', 'VISURA', 'SOA', 'ISO', 'CCIAA']
    if (!validDocTypes.includes(docType)) {
      return NextResponse.json(
        { error: `Invalid document type. Must be one of: ${validDocTypes.join(', ')}` },
        { status: 400 }
      )
    }

    // Check if analysis exists and is completed
    const { rows } = await query(
      `SELECT id, doc_type, analysis_status, supplier_id 
       FROM document_analysis 
       WHERE id = $1`,
      [analysisId]
    )

    console.log('Found analysis:', rows[0])

    if (!rows.length) {
      return NextResponse.json(
        { error: "Document analysis not found" },
        { status: 404 }
      )
    }

    const analysis = rows[0]
    if (analysis.analysis_status !== 'completed') {
      return NextResponse.json(
        { error: "Document analysis must be completed before verification" },
        { status: 400 }
      )
    }

    // Check if verification tables exist and create if needed
    try {
      await query(`
        CREATE TABLE IF NOT EXISTS document_verification (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          analysis_id UUID NOT NULL,
          supplier_id UUID NOT NULL,
          doc_type TEXT NOT NULL,
          verification_status TEXT NOT NULL DEFAULT 'pending',
          verification_result TEXT NOT NULL DEFAULT 'unknown',
          confidence_score DECIMAL(5,2) DEFAULT 0.00,
          field_comparisons JSONB NOT NULL DEFAULT '{}',
          discrepancies JSONB NOT NULL DEFAULT '[]',
          ai_analysis TEXT,
          verification_notes TEXT,
          verified_by TEXT DEFAULT 'ai_agent',
          verification_model TEXT,
          processing_time_ms INTEGER,
          created_at TIMESTAMPTZ DEFAULT NOW(),
          updated_at TIMESTAMPTZ DEFAULT NOW()
        )
      `)

      await query(`
        CREATE TABLE IF NOT EXISTS verification_rules (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          doc_type TEXT NOT NULL,
          field_name TEXT NOT NULL,
          rule_type TEXT NOT NULL,
          threshold DECIMAL(5,2) DEFAULT 80.00,
          is_required BOOLEAN DEFAULT true,
          validation_regex TEXT,
          expected_values TEXT[],
          created_at TIMESTAMPTZ DEFAULT NOW(),
          UNIQUE(doc_type, field_name, rule_type)
        )
      `)

      // Insert default DURC rules if they don't exist
      await query(`
        INSERT INTO verification_rules (doc_type, field_name, rule_type, threshold, is_required, expected_values) VALUES
        ('DURC', 'denominazione_ragione_sociale', 'fuzzy_match', 85.00, true, NULL),
        ('DURC', 'codice_fiscale', 'exact_match', 100.00, true, NULL),
        ('DURC', 'sede_legale', 'fuzzy_match', 80.00, true, NULL),
        ('DURC', 'risultato', 'status_check', 100.00, true, ARRAY['RISULTA REGOLARE', 'REGOLARE']),
        ('DURC', 'scadenza_validita', 'date_validation', 100.00, true, NULL)
        ON CONFLICT (doc_type, field_name, rule_type) DO NOTHING
      `)
    } catch (tableError) {
      console.error('Error creating verification tables:', tableError)
    }

    // Check if verification already exists
    const { rows: existingVerification } = await query(
      `SELECT id, verification_status, verification_result 
       FROM document_verification 
       WHERE analysis_id = $1`,
      [analysisId]
    )

    if (existingVerification.length > 0 && !forceRerun) {
      return NextResponse.json({
        success: true,
        message: "Verification already exists",
        data: existingVerification[0]
      })
    }

    // If forceRerun is true, delete existing verification to create a new one
    if (existingVerification.length > 0 && forceRerun) {
      await query(
        `DELETE FROM document_verification WHERE analysis_id = $1`,
        [analysisId]
      )
      console.log('Deleted existing verification for re-run')
    }

    // Start verification process
    const verificationService = new AIVerificationService()
    
    // Use the universal verification method that supports all document types
    const result = await verificationService.verifyDocument(analysisId, docType)
    
    return NextResponse.json({
      success: true,
      message: `${docType} verification completed`,
      data: result
    })

  } catch (error) {
    console.error("Document verification error:", error)
    return NextResponse.json(
      { 
        error: "Verification failed", 
        details: error instanceof Error ? error.message : "Unknown error" 
      },
      { status: 500 }
    )
  }
}

// GET /api/documents/verify?analysisId=uuid - Get verification results
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams
    const analysisId = searchParams.get("analysisId")

    if (!analysisId) {
      return NextResponse.json(
        { error: "Analysis ID is required" },
        { status: 400 }
      )
    }

    const { rows } = await query(
      `SELECT dv.*, da.doc_type, da.extracted_fields, s.company_name
       FROM document_verification dv
       JOIN document_analysis da ON dv.analysis_id = da.id
       JOIN suppliers s ON dv.supplier_id = s.id
       WHERE dv.analysis_id = $1
       ORDER BY dv.created_at DESC
       LIMIT 1`,
      [analysisId]
    )

    if (!rows.length) {
      return NextResponse.json(
        { error: "Verification not found" },
        { status: 404 }
      )
    }

    return NextResponse.json({
      success: true,
      data: rows[0]
    })

  } catch (error) {
    console.error("Get verification error:", error)
    return NextResponse.json(
      { 
        error: "Failed to get verification results", 
        details: error instanceof Error ? error.message : "Unknown error" 
      },
      { status: 500 }
    )
  }
}

// GET /api/documents/verify/pending - Get documents pending verification
export async function GET_PENDING(request: NextRequest) {
  try {
    const { rows } = await query(
      `SELECT da.id, da.doc_type, da.created_at, s.company_name, sa.filename
       FROM document_analysis da
       JOIN suppliers s ON da.supplier_id = s.id
       JOIN supplier_attachments sa ON da.attachment_id = sa.id
       LEFT JOIN document_verification dv ON da.id = dv.analysis_id
       WHERE da.analysis_status = 'completed' 
         AND da.needs_verification = true
         AND dv.id IS NULL
       ORDER BY da.verification_priority DESC, da.created_at ASC
       LIMIT 50`
    )

    return NextResponse.json({
      success: true,
      data: rows
    })

  } catch (error) {
    console.error("Get pending verification error:", error)
    return NextResponse.json(
      { 
        error: "Failed to get pending verifications", 
        details: error instanceof Error ? error.message : "Unknown error" 
      },
      { status: 500 }
    )
  }
}
