import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';
import { DocumentValidators, DocumentType } from '@/lib/document-schemas';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { analysisId, validatedFields, validationStatus, validationNotes, userId } = body;

    if (!analysisId || !validatedFields || !validationStatus) {
      return NextResponse.json({ 
        error: 'Analysis ID, validated fields, and validation status are required' 
      }, { status: 400 });
    }

    // Get existing analysis
    const { rows: analysisRows } = await query<any>(
      'SELECT * FROM document_analysis WHERE id = $1 LIMIT 1',
      [analysisId]
    );
    const analysis = analysisRows[0];

    if (!analysis) {
      return NextResponse.json({ error: 'Analysis not found' }, { status: 404 });
    }

    // Normalize the validated fields
    const normalizedFields = DocumentValidators.normalizeFields(
      analysis.doc_type as DocumentType, 
      validatedFields
    );

    // Update analysis with validation and clear any previous errors
    const { rows: updatedRows } = await query<any>(
      `UPDATE document_analysis
       SET extracted_fields = $1::jsonb,
           validation_status = $2,
           validation_notes = $3,
           validated_by = $4,
           validated_at = NOW(),
           analysis_error = NULL,
           updated_at = NOW()
       WHERE id = $5
       RETURNING *`,
      [JSON.stringify(normalizedFields), validationStatus, validationNotes, userId, analysisId]
    );
    const updatedAnalysis = updatedRows[0];

    return NextResponse.json({
      success: true,
      data: updatedAnalysis,
      message: 'Document validation completed successfully'
    });

  } catch (error) {
    console.error('Document validation error:', error);
    return NextResponse.json({
      error: 'Internal server error',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}

// Get validation statistics
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const supplierId = searchParams.get('supplierId');

    let queryText = 'SELECT validation_status, doc_type, analysis_status FROM document_analysis';
    let queryParams: any[] = [];

    if (supplierId) {
      queryText += ' WHERE supplier_id = $1';
      queryParams = [supplierId];
    }

    const { rows: data } = await query<any>(queryText, queryParams);

    // Calculate statistics
    const stats = {
      total: data.length,
      pending: data.filter((d: any) => d.validation_status === 'pending').length,
      approved: data.filter((d: any) => d.validation_status === 'approved').length,
      rejected: data.filter((d: any) => d.validation_status === 'rejected').length,
      needs_review: data.filter((d: any) => d.validation_status === 'needs_review').length,
      by_type: {} as Record<string, any>
    };

    // Group by document type
    const typeGroups = data.reduce((acc: any, item: any) => {
      if (!acc[item.doc_type]) {
        acc[item.doc_type] = { total: 0, pending: 0, approved: 0, rejected: 0, needs_review: 0 };
      }
      acc[item.doc_type].total++;
      acc[item.doc_type][item.validation_status]++;
      return acc;
    }, {} as Record<string, any>);

    stats.by_type = typeGroups;

    return NextResponse.json({ success: true, data: stats });

  } catch (error) {
    console.error('Get validation stats error:', error);
    return NextResponse.json({
      error: 'Failed to retrieve validation statistics',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}
