import { NextRequest, NextResponse } from 'next/server'
import { DatabaseClient } from '@/lib/database/postgresql'

// Make sure we’re on Node runtime (pg is not Edge-compatible)
export const runtime = 'nodejs'
// Avoid caching the GET route (or implement your own revalidation logic)
export const dynamic = 'force-dynamic'

function parseBooleanParam(value: string | null): boolean | null {
  if (value === null) return null
  const v = value.trim().toLowerCase()
  if (v === 'true' || v === '1' || v === 'yes') return true
  if (v === 'false' || v === '0' || v === 'no') return false
  return null
}

export async function GET(request: NextRequest) {
  const db = new DatabaseClient()
  try {
    const { searchParams } = new URL(request.url)
    const templateType = searchParams.get('type')
    const activeParam = parseBooleanParam(searchParams.get('active'))

    let query = `
      SELECT 
        id,
        name,
        description,
        template_type,
        nodes,
        edges,
        config,
        is_active,
        is_default,
        created_at,
        updated_at,
        version,
        tags
      FROM workflow_templates
      WHERE 1=1
    `
    const params: any[] = []
    let i = 1

    if (templateType) {
      query += ` AND template_type = $${i++}`
      params.push(templateType)
    }

    if (activeParam !== null) {
      query += ` AND is_active = $${i++}`
      params.push(activeParam)
    }

    query += ` ORDER BY is_default DESC, created_at DESC`

    const result = await db.query(query, params)

    return NextResponse.json({
      success: true,
      templates: result.rows,
    })
  } catch (error) {
    console.error('Error fetching workflow templates:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to fetch workflow templates' },
      { status: 500 }
    )
  } finally {
    // If DatabaseClient uses a pool, you likely do NOT want to call end() here.
    // await db.end?.()
  }
}

export async function POST(request: NextRequest) {
  const db = new DatabaseClient()
  try {
    const body = await request.json()

    // Basic validation
    const name = typeof body?.name === 'string' ? body.name.trim() : ''
    const description = typeof body?.description === 'string' ? body.description : null
    const nodes = Array.isArray(body?.nodes) ? body.nodes : []
    const edges = Array.isArray(body?.edges) ? body.edges : []
    const config = body?.config ?? {}
    const tags = body?.tags ?? [] // adjust handling below to match your column type

    if (!name) {
      return NextResponse.json(
        { success: false, error: 'Name is required' },
        { status: 400 }
      )
    }

    // If you want to allow scaffolding an empty flow, keep as-is.
    // If not, uncomment the checks below.
    // if (nodes.length === 0) {
    //   return NextResponse.json(
    //     { success: false, error: 'Nodes cannot be empty' },
    //     { status: 400 }
    //   )
    // }
    // if (edges.length === 0) {
    //   return NextResponse.json(
    //     { success: false, error: 'Edges cannot be empty' },
    //     { status: 400 }
    //   )
    // }

    const query = `
      INSERT INTO workflow_templates (
        name,
        description,
        template_type,
        nodes,
        edges,
        config,
        tags,
        created_by
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
      RETURNING *
    `

    // IMPORTANT: adjust this to your DB column types
    // - If nodes/edges/config are jsonb: JSON.stringify(...)
    // - If tags is text[]: pass as an array directly (PostgreSQL will handle it)
    const params = [
      name,
      description,
      'custom',
      JSON.stringify(nodes),
      JSON.stringify(edges),
      JSON.stringify(config || {}),
      tags || [], // Pass array directly for PostgreSQL text[] column
      null, // created_by (plug in authenticated user id if/when available)
    ]

    const result = await db.query(query, params)

    return NextResponse.json({
      success: true,
      id: result.rows[0].id,
      template: result.rows[0],
    })
  } catch (error) {
    console.error('Error creating workflow template:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to create workflow template' },
      { status: 500 }
    )
  } finally {
    // If DatabaseClient uses a pool, you likely do NOT want to call end() here.
    // await db.end?.()
  }
}