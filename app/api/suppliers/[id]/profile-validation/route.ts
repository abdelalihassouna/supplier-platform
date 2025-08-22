import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/database/postgresql';
import { SupplierProfileValidator } from '@/lib/supplier-profile-validator';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: supplierId } = await params;

    // Check if ID is UUID format to determine query type
    const isUUID = /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/.test(supplierId);
    
    // Fetch supplier with debasic answers from separate table
    const supplierQuery = isUUID ? `
      SELECT 
        s.id,
        s.bravo_id,
        s.company_name,
        sda.answers as debasic_answers
      FROM suppliers s
      LEFT JOIN supplier_debasic_answers sda ON s.id = sda.supplier_id
      WHERE s.id = $1::uuid
      LIMIT 1
    ` : `
      SELECT 
        s.id,
        s.bravo_id,
        s.company_name,
        sda.answers as debasic_answers
      FROM suppliers s
      LEFT JOIN supplier_debasic_answers sda ON s.id = sda.supplier_id
      WHERE s.bravo_id = $1
      LIMIT 1
    `;

    const { rows } = await db.query(supplierQuery, [supplierId]);

    if (rows.length === 0) {
      return NextResponse.json({
        success: false,
        error: 'Supplier not found'
      }, { status: 404 });
    }

    const supplier = rows[0];
    
    // Validate the profile
    const validationSummary = SupplierProfileValidator.validateProfile(supplier.debasic_answers);

    return NextResponse.json({
      success: true,
      data: {
        supplierId: supplier.id,
        bravoId: supplier.bravo_id,
        companyName: supplier.company_name,
        validation: validationSummary,
        lastValidated: new Date().toISOString()
      }
    });

  } catch (error) {
    console.error('Profile validation API error:', error);
    return NextResponse.json({
      success: false,
      error: 'Failed to validate supplier profile',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: supplierId } = await params;
    const body = await request.json();
    const { fieldName } = body;

    // Check if ID is UUID format to determine query type
    const isUUID = /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/.test(supplierId);
    
    // Fetch supplier with debasic answers from separate table
    const supplierQuery = isUUID ? `
      SELECT 
        s.id,
        s.bravo_id,
        s.company_name,
        sda.answers as debasic_answers
      FROM suppliers s
      LEFT JOIN supplier_debasic_answers sda ON s.id = sda.supplier_id
      WHERE s.id = $1::uuid
      LIMIT 1
    ` : `
      SELECT 
        s.id,
        s.bravo_id,
        s.company_name,
        sda.answers as debasic_answers
      FROM suppliers s
      LEFT JOIN supplier_debasic_answers sda ON s.id = sda.supplier_id
      WHERE s.bravo_id = $1
      LIMIT 1
    `;

    const { rows } = await db.query(supplierQuery, [supplierId]);

    if (rows.length === 0) {
      return NextResponse.json({
        success: false,
        error: 'Supplier not found'
      }, { status: 404 });
    }

    const supplier = rows[0];

    if (fieldName) {
      // Validate specific field
      const fieldValidation = SupplierProfileValidator.getFieldValidation(
        supplier.debasic_answers, 
        fieldName
      );

      if (!fieldValidation) {
        return NextResponse.json({
          success: false,
          error: 'Field validation rule not found'
        }, { status: 400 });
      }

      return NextResponse.json({
        success: true,
        data: {
          supplierId: supplier.id,
          fieldName,
          validation: fieldValidation
        }
      });
    }

    // Full profile validation (same as GET)
    const validationSummary = SupplierProfileValidator.validateProfile(supplier.debasic_answers);

    return NextResponse.json({
      success: true,
      data: {
        supplierId: supplier.id,
        bravoId: supplier.bravo_id,
        companyName: supplier.company_name,
        validation: validationSummary,
        lastValidated: new Date().toISOString()
      }
    });

  } catch (error) {
    console.error('Profile validation API error:', error);
    return NextResponse.json({
      success: false,
      error: 'Failed to validate supplier profile',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}
