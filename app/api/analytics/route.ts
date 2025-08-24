import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const timeRange = searchParams.get('timeRange') || '6months';
    
    // Calculate date range based on timeRange parameter
    const getDateRange = (range: string) => {
      const now = new Date();
      switch (range) {
        case '1month':
          return new Date(now.getFullYear(), now.getMonth() - 1, now.getDate());
        case '3months':
          return new Date(now.getFullYear(), now.getMonth() - 3, now.getDate());
        case '6months':
          return new Date(now.getFullYear(), now.getMonth() - 6, now.getDate());
        case '1year':
          return new Date(now.getFullYear() - 1, now.getMonth(), now.getDate());
        default:
          return new Date(now.getFullYear(), now.getMonth() - 6, now.getDate());
      }
    };
    
    const fromDate = getDateRange(timeRange);

    // 1. Processing Efficiency Metrics
    const processingEfficiencyQuery = `
      WITH processing_stats AS (
        SELECT 
          DATE_TRUNC('week', da.created_at) as week_start,
          COUNT(*) as total_documents,
          COUNT(CASE WHEN da.analysis_status = 'completed' THEN 1 END) as completed_ocr,
          COUNT(CASE WHEN da.analysis_status = 'failed' THEN 1 END) as failed_ocr,
          AVG(CASE WHEN da.analysis_duration_ms IS NOT NULL THEN da.analysis_duration_ms / 1000.0 END) as avg_ocr_time_seconds,
          COUNT(CASE WHEN dv.verification_status = 'completed' THEN 1 END) as completed_ai_verification,
          COUNT(CASE WHEN dv.verification_status = 'failed' THEN 1 END) as failed_ai_verification,
          AVG(CASE WHEN dv.processing_time_ms IS NOT NULL THEN dv.processing_time_ms / 1000.0 END) as avg_ai_verification_time_seconds
        FROM document_analysis da
        LEFT JOIN document_verification dv ON da.id = dv.analysis_id
        WHERE da.created_at >= $1
        GROUP BY DATE_TRUNC('week', da.created_at)
        ORDER BY week_start DESC
        LIMIT 8
      )
      SELECT 
        TO_CHAR(week_start, 'Week DD/MM') as week_label,
        total_documents,
        ROUND((completed_ocr::numeric / NULLIF(total_documents, 0)) * 100, 1) as ocr_success_rate,
        ROUND((failed_ocr::numeric / NULLIF(total_documents, 0)) * 100, 1) as ocr_failure_rate,
        ROUND(avg_ocr_time_seconds::numeric, 1) as avg_ocr_time_seconds,
        ROUND((completed_ai_verification::numeric / NULLIF(completed_ocr, 0)) * 100, 1) as ai_verification_rate,
        ROUND(avg_ai_verification_time_seconds::numeric, 1) as avg_ai_verification_time_seconds
      FROM processing_stats
      ORDER BY week_start ASC
    `;

    const { rows: processingEfficiency } = await query(processingEfficiencyQuery, [fromDate]);

    // 2. Certification Status Overview by Document Type
    const certificationStatusQuery = `
      WITH document_stats AS (
        SELECT 
          da.doc_type,
          COUNT(*) as total_documents,
          COUNT(CASE WHEN da.analysis_status = 'completed' THEN 1 END) as ocr_completed,
          COUNT(CASE WHEN da.analysis_status = 'failed' THEN 1 END) as ocr_failed,
          COUNT(CASE WHEN dv.verification_status = 'completed' THEN 1 END) as ai_verified,
          COUNT(CASE WHEN dv.verification_status = 'failed' THEN 1 END) as ai_failed,
          COUNT(CASE WHEN dv.verification_result = 'match' THEN 1 END) as verification_passed,
          COUNT(CASE WHEN dv.verification_result IN ('mismatch', 'partial_match') THEN 1 END) as verification_failed,
          AVG(CASE WHEN da.analysis_duration_ms IS NOT NULL THEN da.analysis_duration_ms / 1000.0 END) as avg_processing_time
        FROM document_analysis da
        LEFT JOIN document_verification dv ON da.id = dv.analysis_id
        WHERE da.created_at >= $1 AND da.doc_type IS NOT NULL
        GROUP BY da.doc_type
      )
      SELECT 
        doc_type,
        total_documents,
        ocr_completed,
        ocr_failed,
        ai_verified,
        ai_failed,
        verification_passed,
        verification_failed,
        ROUND((ocr_completed::numeric / NULLIF(total_documents, 0)) * 100, 1) as ocr_success_rate,
        ROUND((ai_verified::numeric / NULLIF(ocr_completed, 0)) * 100, 1) as ai_verification_rate,
        ROUND((verification_passed::numeric / NULLIF(ai_verified, 0)) * 100, 1) as verification_pass_rate,
        ROUND(avg_processing_time::numeric, 1) as avg_processing_time_seconds
      FROM document_stats
      ORDER BY total_documents DESC
    `;

    const { rows: certificationStatus } = await query(certificationStatusQuery, [fromDate]);

    // 3. Overall KPIs
    const kpiQuery = `
      WITH current_period AS (
        SELECT 
          COUNT(DISTINCT s.id) as total_suppliers,
          COUNT(DISTINCT da.id) as total_documents_processed,
          COUNT(CASE WHEN da.analysis_status = 'completed' THEN 1 END) as successful_ocr,
          COUNT(CASE WHEN dv.verification_status = 'completed' THEN 1 END) as successful_ai_verification,
          COUNT(CASE WHEN dv.verification_result = 'match' THEN 1 END) as passed_verifications,
          AVG(CASE WHEN da.analysis_duration_ms IS NOT NULL THEN da.analysis_duration_ms / 1000.0 END) as avg_ocr_time,
          AVG(CASE WHEN dv.processing_time_ms IS NOT NULL THEN dv.processing_time_ms / 1000.0 END) as avg_ai_time
        FROM suppliers s
        LEFT JOIN document_analysis da ON s.id = da.supplier_id AND da.created_at >= $1
        LEFT JOIN document_verification dv ON da.id = dv.analysis_id
      ),
      previous_period AS (
        SELECT 
          COUNT(DISTINCT s.id) as total_suppliers,
          COUNT(DISTINCT da.id) as total_documents_processed,
          COUNT(CASE WHEN da.analysis_status = 'completed' THEN 1 END) as successful_ocr,
          COUNT(CASE WHEN dv.verification_status = 'completed' THEN 1 END) as successful_ai_verification,
          COUNT(CASE WHEN dv.verification_result = 'match' THEN 1 END) as passed_verifications
        FROM suppliers s
        LEFT JOIN document_analysis da ON s.id = da.supplier_id 
          AND da.created_at >= $2 AND da.created_at < $1
        LEFT JOIN document_verification dv ON da.id = dv.analysis_id
      )
      SELECT 
        cp.total_suppliers,
        cp.total_documents_processed,
        ROUND((cp.successful_ocr::numeric / NULLIF(cp.total_documents_processed, 0)) * 100, 1) as ocr_success_rate,
        ROUND((cp.successful_ai_verification::numeric / NULLIF(cp.successful_ocr, 0)) * 100, 1) as ai_verification_rate,
        ROUND((cp.passed_verifications::numeric / NULLIF(cp.successful_ai_verification, 0)) * 100, 1) as verification_pass_rate,
        ROUND(cp.avg_ocr_time::numeric, 1) as avg_ocr_time_seconds,
        ROUND(cp.avg_ai_time::numeric, 1) as avg_ai_verification_time_seconds,
        -- Calculate percentage changes
        CASE 
          WHEN pp.total_documents_processed > 0 THEN 
            ROUND(((cp.total_documents_processed - pp.total_documents_processed)::numeric / pp.total_documents_processed) * 100, 1)
          ELSE 0 
        END as documents_processed_change,
        CASE 
          WHEN pp.successful_ocr > 0 THEN 
            ROUND(((cp.successful_ocr::numeric / NULLIF(cp.total_documents_processed, 0) * 100) - 
                   (pp.successful_ocr::numeric / NULLIF(pp.total_documents_processed, 0) * 100)), 1)
          ELSE 0 
        END as ocr_success_rate_change
      FROM current_period cp, previous_period pp
    `;

    const previousFromDate = new Date(fromDate);
    previousFromDate.setTime(previousFromDate.getTime() - (Date.now() - fromDate.getTime()));
    
    const { rows: kpiData } = await query(kpiQuery, [fromDate, previousFromDate]);

    // 4. Recent Processing Activity (last 24 hours)
    const recentActivityQuery = `
      SELECT 
        da.doc_type,
        da.analysis_status,
        dv.verification_status,
        dv.verification_result,
        da.created_at as processed_at,
        sa.filename,
        s.company_name
      FROM document_analysis da
      LEFT JOIN document_verification dv ON da.id = dv.analysis_id
      LEFT JOIN supplier_attachments sa ON da.attachment_id = sa.id
      LEFT JOIN suppliers s ON da.supplier_id = s.id
      WHERE da.created_at >= NOW() - INTERVAL '24 hours'
      ORDER BY da.created_at DESC
      LIMIT 50
    `;

    const { rows: recentActivity } = await query(recentActivityQuery);

    // 5. Compliance Alerts - Documents expiring soon or with verification issues
    const complianceAlertsQuery = `
      WITH expiring_documents AS (
        SELECT 
          da.doc_type,
          COUNT(*) as count,
          'expiring_soon' as alert_type,
          'Documents expiring within 30 days' as description
        FROM document_analysis da
        WHERE da.extracted_fields->>'scadenza_validita' IS NOT NULL
          AND da.extracted_fields->>'data_scadenza' IS NOT NULL
          AND (
            TO_DATE(da.extracted_fields->>'scadenza_validita', 'DD/MM/YYYY') BETWEEN NOW() AND NOW() + INTERVAL '30 days'
            OR TO_DATE(da.extracted_fields->>'data_scadenza', 'DD/MM/YYYY') BETWEEN NOW() AND NOW() + INTERVAL '30 days'
          )
        GROUP BY da.doc_type
      ),
      verification_failures AS (
        SELECT 
          da.doc_type,
          COUNT(*) as count,
          'verification_failed' as alert_type,
          'Documents with verification failures' as description
        FROM document_analysis da
        LEFT JOIN document_verification dv ON da.id = dv.analysis_id
        WHERE (dv.verification_status = 'failed' OR dv.verification_result IN ('mismatch', 'partial_match'))
          AND da.created_at >= NOW() - INTERVAL '7 days'
        GROUP BY da.doc_type
      ),
      missing_documents AS (
        SELECT 
          'MISSING' as doc_type,
          COUNT(DISTINCT s.id) as count,
          'missing_documents' as alert_type,
          'Suppliers without required documents' as description
        FROM suppliers s
        LEFT JOIN document_analysis da ON s.id = da.supplier_id
        WHERE da.id IS NULL
      )
      SELECT * FROM (
        SELECT doc_type, count, alert_type, description FROM expiring_documents
        UNION ALL
        SELECT doc_type, count, alert_type, description FROM verification_failures
        UNION ALL
        SELECT doc_type, count, alert_type, description FROM missing_documents
      ) alerts
      WHERE count > 0
      ORDER BY count DESC
    `;

    const { rows: complianceAlerts } = await query(complianceAlertsQuery);

    // 6. Compliance Trends - Monthly compliance scores
    const complianceTrendsQuery = `
      WITH monthly_compliance AS (
        SELECT 
          DATE_TRUNC('month', da.created_at) as month_start,
          COUNT(*) as total_documents,
          COUNT(CASE WHEN dv.verification_result = 'match' THEN 1 END) as passed_verifications,
          COUNT(CASE WHEN da.analysis_status = 'completed' THEN 1 END) as completed_analysis
        FROM document_analysis da
        LEFT JOIN document_verification dv ON da.id = dv.analysis_id
        WHERE da.created_at >= $1
        GROUP BY DATE_TRUNC('month', da.created_at)
        ORDER BY month_start ASC
      )
      SELECT 
        TO_CHAR(month_start, 'Mon YYYY') as month_label,
        total_documents,
        completed_analysis,
        passed_verifications,
        ROUND((completed_analysis::numeric / NULLIF(total_documents, 0)) * 100, 1) as processing_compliance,
        ROUND((passed_verifications::numeric / NULLIF(completed_analysis, 0)) * 100, 1) as verification_compliance,
        ROUND((passed_verifications::numeric / NULLIF(total_documents, 0)) * 100, 1) as overall_compliance
      FROM monthly_compliance
    `;

    const { rows: complianceTrends } = await query(complianceTrendsQuery, [fromDate]);

    // 7. Document Status Summary for Compliance Overview
    const documentStatusQuery = `
      SELECT 
        da.doc_type,
        COUNT(*) as total,
        COUNT(CASE WHEN da.analysis_status = 'completed' AND dv.verification_result = 'match' THEN 1 END) as valid,
        COUNT(CASE WHEN da.analysis_status = 'completed' AND dv.verification_result IN ('mismatch', 'partial_match') THEN 1 END) as issues,
        COUNT(CASE WHEN da.analysis_status = 'failed' OR dv.verification_status = 'failed' THEN 1 END) as failed,
        COUNT(CASE WHEN da.analysis_status = 'pending' OR da.analysis_status = 'processing' THEN 1 END) as pending
      FROM document_analysis da
      LEFT JOIN document_verification dv ON da.id = dv.analysis_id
      WHERE da.created_at >= $1 AND da.doc_type IS NOT NULL
      GROUP BY da.doc_type
      ORDER BY total DESC
    `;

    const { rows: documentStatus } = await query(documentStatusQuery, [fromDate]);

    // 8. Bulk Verification Timing - Run-level KPIs
    const runMetricsQuery = `
      WITH runs AS (
        SELECT 
          id, status, started_at, ended_at,
          EXTRACT(EPOCH FROM (COALESCE(ended_at, NOW()) - started_at)) AS duration_seconds
        FROM workflow_runs
        WHERE started_at >= $1
      ),
      steps_per_run AS (
        SELECT run_id, COUNT(*) AS step_count
        FROM workflow_step_results
        GROUP BY run_id
      )
      SELECT 
        COUNT(*) AS total_runs,
        COUNT(*) FILTER (WHERE status = 'completed') AS completed_runs,
        ROUND(AVG(duration_seconds)::numeric, 1) AS avg_run_duration_seconds,
        ROUND((PERCENTILE_CONT(0.95) WITHIN GROUP (ORDER BY duration_seconds))::numeric, 1) AS p95_run_duration_seconds,
        ROUND(AVG(sp.step_count), 1) AS avg_steps_per_run
      FROM runs r
      LEFT JOIN steps_per_run sp ON sp.run_id = r.id
    `;
    const { rows: runKpis } = await query(runMetricsQuery, [fromDate]);

    // 9. Bulk Verification Timing - Weekly throughput and average duration
    const workflowThroughputQuery = `
      WITH runs AS (
        SELECT 
          DATE_TRUNC('week', started_at) AS week_start,
          EXTRACT(EPOCH FROM (COALESCE(ended_at, NOW()) - started_at)) AS duration_seconds
        FROM workflow_runs
        WHERE started_at >= $1
      )
      SELECT 
        TO_CHAR(week_start, 'Week DD/MM') AS week_label,
        COUNT(*) AS runs_count,
        ROUND(AVG(duration_seconds)::numeric, 1) AS avg_run_duration_seconds
      FROM runs
      GROUP BY week_start
      ORDER BY week_start ASC
      LIMIT 12
    `;
    const { rows: workflowThroughput } = await query(workflowThroughputQuery, [fromDate]);

    // 10. Bulk Verification Timing - Step-level metrics
    const stepMetricsQuery = `
      WITH steps AS (
        SELECT 
          wsr.step_key, wsr.name, wsr.status,
          EXTRACT(EPOCH FROM (COALESCE(wsr.ended_at, NOW()) - wsr.started_at)) AS duration_seconds
        FROM workflow_step_results wsr
        JOIN workflow_runs wr ON wr.id = wsr.run_id
        WHERE wr.started_at >= $1
      )
      SELECT 
        step_key,
        MAX(name) AS name,
        COUNT(*) AS total,
        COUNT(*) FILTER (WHERE status = 'pass') AS pass_count,
        COUNT(*) FILTER (WHERE status = 'fail') AS fail_count,
        ROUND(AVG(duration_seconds)::numeric, 1) AS avg_duration_seconds,
        ROUND((PERCENTILE_CONT(0.95) WITHIN GROUP (ORDER BY duration_seconds))::numeric, 1) AS p95_duration_seconds
      FROM steps
      GROUP BY step_key
      ORDER BY avg_duration_seconds DESC
    `;
    const { rows: stepMetrics } = await query(stepMetricsQuery, [fromDate]);

    return NextResponse.json({
      success: true,
      data: {
        processingEfficiency: processingEfficiency || [],
        certificationStatus: certificationStatus || [],
        kpis: kpiData[0] || {},
        recentActivity: recentActivity || [],
        complianceAlerts: complianceAlerts || [],
        complianceTrends: complianceTrends || [],
        documentStatus: documentStatus || [],
        // New bulk verification timing analytics
        workflowTiming: {
          kpis: runKpis?.[0] || {},
          throughput: workflowThroughput || [],
          steps: stepMetrics || []
        },
        timeRange,
        generatedAt: new Date().toISOString()
      }
    });

  } catch (error) {
    console.error('Analytics API error:', error);
    return NextResponse.json({
      error: 'Failed to fetch analytics data',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}
