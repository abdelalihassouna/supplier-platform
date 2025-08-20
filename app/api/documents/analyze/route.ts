import { NextRequest, NextResponse } from 'next/server';
import { MistralDocumentClient } from '@/lib/mistral-client';
import { DocumentType, DocumentTypeDetector, DOCUMENT_TYPES, DocumentValidators } from '@/lib/document-schemas';
import { query } from '@/lib/db';

export async function POST(request: NextRequest) {
  try {
    const startTs = Date.now()
    // Parse request body
    const body = await request.json();
    const { attachmentId, docType, pages } = body;

    if (!attachmentId) {
      return NextResponse.json({ error: 'Attachment ID is required' }, { status: 400 });
    }

    // Get attachment from database (local PostgreSQL)
    const { rows: attachmentRows } = await query<any>(
      'SELECT * FROM supplier_attachments WHERE id = $1 LIMIT 1',
      [attachmentId]
    );
    const attachment = attachmentRows[0];

    if (!attachment) {
      return NextResponse.json({ error: 'Attachment not found' }, { status: 404 });
    }

    if (!attachment.file_data) {
      return NextResponse.json({ error: 'No file data available for analysis' }, { status: 400 });
    }

    // Detect document type if not provided
    let detectedDocType: DocumentType | null = docType;
    if (!detectedDocType) {
      detectedDocType = DocumentTypeDetector.detectType(
        attachment.filename || attachment.original_filename || '',
        attachment.cert_type
      );
    }

    if (!detectedDocType || !DOCUMENT_TYPES.includes(detectedDocType)) {
      return NextResponse.json({ 
        error: 'Could not determine document type. Please specify manually.' 
      }, { status: 400 });
    }

    // Check if analysis already exists
    const { rows: existingRows } = await query<any>(
      'SELECT * FROM document_analysis WHERE attachment_id = $1 LIMIT 1',
      [attachmentId]
    );
    const existingAnalysis = existingRows[0];

    if (existingAnalysis && existingAnalysis.analysis_status === 'completed') {
      return NextResponse.json({
        success: true,
        data: existingAnalysis,
        message: 'Analysis already completed'
      });
    }

    // Create or update analysis record
    const analysisData = {
      supplier_id: attachment.supplier_id,
      attachment_id: attachmentId,
      doc_type: detectedDocType,
      analysis_status: 'processing',
      mistral_model: 'mistral-ocr-latest',
      pages_analyzed: pages || [0, 1]
    };

    let analysisId: string;
    if (existingAnalysis) {
      const { rows } = await query<{ id: string }>(
        `UPDATE document_analysis
         SET supplier_id = $1,
             attachment_id = $2,
             doc_type = $3,
             analysis_status = $4,
             mistral_model = $5,
             pages_analyzed = $6,
             updated_at = NOW()
         WHERE id = $7
         RETURNING id`,
        [
          analysisData.supplier_id,
          analysisData.attachment_id,
          analysisData.doc_type,
          analysisData.analysis_status,
          analysisData.mistral_model,
          analysisData.pages_analyzed,
          existingAnalysis.id,
        ]
      );
      analysisId = rows[0]?.id || existingAnalysis.id;
    } else {
      const { rows } = await query<{ id: string }>(
        `INSERT INTO document_analysis (
           supplier_id, attachment_id, doc_type, analysis_status, mistral_model, pages_analyzed
         ) VALUES ($1, $2, $3, $4, $5, $6)
         RETURNING id`,
        [
          analysisData.supplier_id,
          analysisData.attachment_id,
          analysisData.doc_type,
          analysisData.analysis_status,
          analysisData.mistral_model,
          analysisData.pages_analyzed,
        ]
      );
      analysisId = rows[0]?.id || '';
    }

    // Update attachment status
    await query(
      `UPDATE supplier_attachments
       SET analysis_status = 'processing', analysis_requested_at = NOW()
       WHERE id = $1`,
      [attachmentId]
    );

    try {
      // Initialize Mistral client
      const mistralClient = new MistralDocumentClient();
      
      // Convert file data to Buffer (node-postgres returns Buffer for bytea)
      const fileBuffer: Buffer = Buffer.isBuffer(attachment.file_data)
        ? (attachment.file_data as Buffer)
        : Buffer.from(attachment.file_data);
      
      // Extract data using Mistral OCR
      const result = await mistralClient.extractFromDocument(
        detectedDocType,
        fileBuffer,
        attachment.filename || attachment.original_filename || 'document',
        pages
      );

      // Compute telemetry and costs
      const endTs = Date.now()
      const durationMs = Math.max(0, endTs - startTs)
      const processedPages = Array.isArray(result?.meta?.pages_processed)
        ? (result.meta.pages_processed as number[]).length
        : (Array.isArray(analysisData.pages_analyzed) ? (analysisData.pages_analyzed as number[]).length : 0)
      const annotationUsed = (process.env.ANALYSIS_WITH_ANNOTATION === 'true')
      const ratePerThousand = annotationUsed ? 3.0 : 1.0
      const analysisCost = processedPages > 0 ? (ratePerThousand * (processedPages / 1000)) : 0

      // Ensure extra columns exist (idempotent)
      await query(
        `DO $$
         BEGIN
           IF NOT EXISTS (
             SELECT 1 FROM information_schema.columns 
             WHERE table_name = 'document_analysis' AND column_name = 'analysis_duration_ms'
           ) THEN
             ALTER TABLE document_analysis 
               ADD COLUMN analysis_duration_ms BIGINT,
               ADD COLUMN analysis_cost_eur NUMERIC(10,4),
               ADD COLUMN pages_count INTEGER,
               ADD COLUMN annotation_used BOOLEAN DEFAULT false;
           END IF;
         END $$;`
      )

      // Update analysis with results
      const { rows: finalRows } = await query<any>(
        `UPDATE document_analysis
         SET extracted_fields = $1::jsonb,
             analysis_status = 'completed',
             pages_analyzed = $2,
             validation_status = 'pending',
             analysis_duration_ms = $3,
             analysis_cost_eur = $4,
             pages_count = $5,
             annotation_used = $6,
             updated_at = NOW()
         WHERE id = $7
         RETURNING *`,
        [
          JSON.stringify(result.fields),
          result.meta.pages_processed || analysisData.pages_analyzed,
          durationMs,
          analysisCost,
          processedPages,
          annotationUsed,
          analysisId,
        ]
      );
      const finalAnalysis = finalRows[0];

      // Update attachment status
      await query(
        `UPDATE supplier_attachments SET analysis_status = 'completed' WHERE id = $1`,
        [attachmentId]
      );

      return NextResponse.json({
        success: true,
        data: finalAnalysis,
        message: 'Document analysis completed successfully'
      });

    } catch (analysisError) {
      console.error('Analysis failed:', analysisError);
      
      // Update analysis with error
      await query(
        `UPDATE document_analysis
         SET analysis_status = 'failed',
             analysis_error = $1,
             updated_at = NOW()
         WHERE id = $2`,
        [analysisError instanceof Error ? analysisError.message : 'Unknown error', analysisId]
      );

      // Update attachment status
      await query(
        `UPDATE supplier_attachments SET analysis_status = 'failed' WHERE id = $1`,
        [attachmentId]
      );

      return NextResponse.json({
        error: 'Document analysis failed',
        details: analysisError instanceof Error ? analysisError.message : 'Unknown error'
      }, { status: 500 });
    }

  } catch (error) {
    console.error('Document analysis error:', error);
    return NextResponse.json({
      error: 'Internal server error',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}

// Get analysis results
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const attachmentId = searchParams.get('attachmentId');
    const supplierId = searchParams.get('supplierId');

    if (attachmentId) {
      // Get specific analysis with selected attachment fields
      const { rows } = await query<any>(
        `SELECT da.*, sa.filename, sa.original_filename, sa.cert_type, sa.content_type
         FROM document_analysis da
         LEFT JOIN supplier_attachments sa ON sa.id = da.attachment_id
         WHERE da.attachment_id = $1
         LIMIT 1`,
        [attachmentId]
      );
      const data = rows[0] || null;

      // Normalize legacy extracted_fields if present in older format
      if (data && data.extracted_fields) {
        try {
          // If previous runs stored full OCR payload, try to extract actual fields
          const ef = data.extracted_fields as any;
          let fields: Record<string, any> | null = null;

          // Case 1: documentAnnotation string containing the fields JSON
          if (typeof ef.documentAnnotation === 'string') {
            try {
              fields = JSON.parse(ef.documentAnnotation);
            } catch {
              fields = null;
            }
          }

          // Case 2: output/document_annotation keys in various shapes (defensive)
          if (!fields && typeof ef.document_annotation === 'object') {
            fields = ef.document_annotation;
          }
          if (!fields && typeof ef.output_document_annotation === 'object') {
            fields = ef.output_document_annotation;
          }
          if (!fields && typeof ef.output_structured === 'object') {
            fields = ef.output_structured;
          }

          // If we extracted something, normalize it into expected shape
          if (fields && data.doc_type) {
            const normalized = DocumentValidators.normalizeFields(data.doc_type as DocumentType, fields);
            data.extracted_fields = normalized;
          }
        } catch {
          // leave as-is if any error occurs
        }
      }

      return NextResponse.json({ success: true, data });
    }

    if (supplierId) {
      // Get all analyses for supplier
      const { rows } = await query<any>(
        `SELECT da.*, sa.filename, sa.original_filename, sa.cert_type, sa.content_type
         FROM document_analysis da
         LEFT JOIN supplier_attachments sa ON sa.id = da.attachment_id
         WHERE da.supplier_id = $1
         ORDER BY da.created_at DESC`,
        [supplierId]
      );
      return NextResponse.json({ success: true, data: rows });
    }

    return NextResponse.json({ error: 'Either attachmentId or supplierId is required' }, { status: 400 });

  } catch (error) {
    console.error('Get analysis error:', error);
    return NextResponse.json({
      error: 'Failed to retrieve analysis',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}
