import PgBoss from 'pg-boss'
import dotenv from 'dotenv'

dotenv.config()

const QUEUE_NAME = 'document-analysis'

function getDatabaseUrl() {
  const envUrl = process.env.DATABASE_URL
  if (envUrl) return envUrl
  const user = encodeURIComponent(process.env.POSTGRES_USER || 'postgres')
  const pass = encodeURIComponent(process.env.POSTGRES_PASSWORD || '')
  const host = process.env.POSTGRES_HOST || 'localhost'
  const port = process.env.POSTGRES_PORT || '5432'
  const db = process.env.POSTGRES_DATABASE || 'db_vai'
  return `postgres://${user}:${pass}@${host}:${port}/${db}`
}

function getAppBaseUrl() {
  const url = process.env.APP_BASE_URL || 'http://localhost:3000'
  return url.replace(/\/$/, '')
}

async function run() {
  const connectionString = getDatabaseUrl()
  const boss = new PgBoss({ connectionString })

  boss.on('error', (err) => {
    console.error('[pg-boss] error:', err)
  })

  console.log(`[worker] starting with DB: ${connectionString}`)
  await boss.start()

  const appBase = getAppBaseUrl()
  console.log(`[worker] using APP_BASE_URL: ${appBase}`)

  await boss.work(QUEUE_NAME, { teamSize: 2, teamConcurrency: 1 }, async (job) => {
    const { attachmentId, docType } = job.data || {}
    if (!attachmentId) {
      console.warn('[worker] Missing attachmentId in job payload, completing as failed')
      return
    }
    try {
      const resp = await fetch(`${appBase}/api/documents/analyze`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ attachmentId, docType })
      })

      if (!resp.ok) {
        const text = await resp.text().catch(() => '')
        throw new Error(`Analyze API failed: ${resp.status} ${text}`)
      }

      const json = await resp.json().catch(() => ({}))
      console.log(`[worker] analysis complete for ${attachmentId}:`, json?.data?.id || 'ok')
    } catch (err) {
      console.error('[worker] job failed:', err)
      throw err
    }
  })

  // Graceful shutdown
  const shutdown = async () => {
    console.log('\n[worker] shutting down...')
    try {
      await boss.stop({ cancel: false })
    } catch (e) {
      // ignore
    }
    process.exit(0)
  }

  process.on('SIGINT', shutdown)
  process.on('SIGTERM', shutdown)
}

run().catch((e) => {
  console.error('[worker] fatal error:', e)
  process.exit(1)
})
