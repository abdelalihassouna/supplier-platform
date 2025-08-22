import { NextRequest, NextResponse } from 'next/server'
import { DatabaseClient } from '@/lib/database/postgresql'

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const db = new DatabaseClient()
    
    const query = `
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
      WHERE id = $1
    `
    
    const result = await db.query(query, [params.id])
    
    if (result.rows.length === 0) {
      return NextResponse.json(
        { success: false, error: 'Workflow template not found' },
        { status: 404 }
      )
    }
    
    return NextResponse.json({
      success: true,
      template: result.rows[0]
    })
  } catch (error) {
    console.error('Error fetching workflow template:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to fetch workflow template' },
      { status: 500 }
    )
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const body = await request.json()
    const { name, description, nodes, edges, config, tags, is_active } = body
    
    const db = new DatabaseClient()
    
    const query = `
      UPDATE workflow_templates 
      SET 
        name = COALESCE($2, name),
        description = COALESCE($3, description),
        nodes = COALESCE($4, nodes),
        edges = COALESCE($5, edges),
        config = COALESCE($6, config),
        tags = COALESCE($7, tags),
        is_active = COALESCE($8, is_active),
        version = version + 1,
        updated_at = now()
      WHERE id = $1
      RETURNING *
    `
    
    const result = await db.query(query, [
      params.id,
      name,
      description,
      nodes ? JSON.stringify(nodes) : null,
      edges ? JSON.stringify(edges) : null,
      config ? JSON.stringify(config) : null,
      tags,
      is_active
    ])
    
    if (result.rows.length === 0) {
      return NextResponse.json(
        { success: false, error: 'Workflow template not found' },
        { status: 404 }
      )
    }
    
    return NextResponse.json({
      success: true,
      template: result.rows[0]
    })
  } catch (error) {
    console.error('Error updating workflow template:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to update workflow template' },
      { status: 500 }
    )
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const db = new DatabaseClient()
    
    const query = `
      DELETE FROM workflow_templates 
      WHERE id = $1 AND template_type = 'custom'
      RETURNING id
    `
    
    const result = await db.query(query, [params.id])
    
    if (result.rows.length === 0) {
      return NextResponse.json(
        { success: false, error: 'Workflow template not found or cannot be deleted' },
        { status: 404 }
      )
    }
    
    return NextResponse.json({
      success: true,
      message: 'Workflow template deleted successfully'
    })
  } catch (error) {
    console.error('Error deleting workflow template:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to delete workflow template' },
      { status: 500 }
    )
  }
}
