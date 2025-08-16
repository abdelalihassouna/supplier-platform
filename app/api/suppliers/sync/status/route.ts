import { type NextRequest, NextResponse } from "next/server"
import { query } from "@/lib/db"

// GET /api/suppliers/sync/status - Get sync status and statistics
export async function GET(request: NextRequest) {
  try {
    // Get last sync log
    const lastSyncRes = await query<any>(
      `SELECT * FROM supplier_sync_logs ORDER BY created_at DESC LIMIT 1`,
    )
    const lastSync = lastSyncRes.rows[0]

    // Supplier statistics
    const totalSuppliersRes = await query<{ count: number }>(
      `SELECT COUNT(*)::int as count FROM suppliers`,
    )
    const totalSuppliers = totalSuppliersRes.rows[0]?.count || 0

    const activeSuppliersRes = await query<{ count: number }>(
      `SELECT COUNT(*)::int as count FROM suppliers WHERE status = 'ACTIVE'`,
    )
    const activeSuppliers = activeSuppliersRes.rows[0]?.count || 0

    const pendingVerificationRes = await query<{ count: number }>(
      `SELECT COUNT(*)::int as count FROM suppliers WHERE verification_status = 'PENDING'`,
    )
    const pendingVerification = pendingVerificationRes.rows[0]?.count || 0

    const expiredCertificatesRes = await query<{ count: number }>(
      `SELECT COUNT(*)::int as count FROM supplier_certifications WHERE expiry_date < NOW()`,
    )
    const expiredCertificates = expiredCertificatesRes.rows[0]?.count || 0

    const lastFullSyncRes = await query<{ completed_at: string }>(
      `SELECT completed_at FROM supplier_sync_logs WHERE sync_type = 'FULL' AND status = 'COMPLETED' ORDER BY completed_at DESC LIMIT 1`,
    )
    const lastFullSync = lastFullSyncRes.rows[0]

    const currentSyncRes = await query<{ id: string }>(
      `SELECT id FROM supplier_sync_logs WHERE status = 'IN_PROGRESS' LIMIT 1`,
    )
    const currentSync = currentSyncRes.rows[0]

    const settingsRes = await query<{ setting_value: string }>(
      `SELECT setting_value FROM system_settings WHERE setting_key = 'sync_frequency' LIMIT 1`,
    )
    const syncFrequency = settingsRes.rows[0]?.setting_value || "DAILY"

    // Calculate next scheduled sync (simplified logic)
    const nextScheduledSync = new Date()
    nextScheduledSync.setDate(nextScheduledSync.getDate() + 1)
    nextScheduledSync.setHours(8, 0, 0, 0) // 8 AM next day

    const syncStatus = {
      last_sync: lastSync || null,
      statistics: {
        total_suppliers: totalSuppliers || 0,
        active_suppliers: activeSuppliers || 0,
        pending_verification: pendingVerification || 0,
        expired_certificates: expiredCertificates || 0,
        last_full_sync: lastFullSync?.completed_at || null,
        sync_frequency: syncFrequency,
      },
      is_syncing: !!currentSync,
      next_scheduled_sync: nextScheduledSync.toISOString(),
    }

    return NextResponse.json(syncStatus)
  } catch (error) {
    console.error("Error in sync status API:", error)
    return NextResponse.json({ error: "Failed to get sync status", details: (error as Error).message }, { status: 500 })
  }
}
