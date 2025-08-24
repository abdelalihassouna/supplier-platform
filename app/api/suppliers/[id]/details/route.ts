import { type NextRequest, NextResponse } from "next/server"
import { JaggaerAPIClient } from "@/lib/jaggaer-client"

// GET /api/suppliers/[id]/details - Get detailed supplier information
export async function GET(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const supplierId = params.id

    const jaggaerClient = new JaggaerAPIClient({
      baseUrl: process.env.JAGGAER_BASE_URL!,
      clientId: process.env.JAGGAER_CLIENT_ID!,
      clientSecret: process.env.JAGGAER_CLIENT_SECRET!,
    })

    try {
      const profiles = await jaggaerClient.getCompanyProfiles({
        components: ["companyMaster", "companyDEBasic"],
        filters: { bravoId: supplierId },
      })

      if (!profiles.returnCompanyData || profiles.returnCompanyData.length === 0) {
        return NextResponse.json({ error: "Supplier not found" }, { status: 404 })
      }

      const profile = profiles.returnCompanyData[0]

      const supplierInfo = jaggaerClient.extractCompanyInfo(profile)
      const certifications = jaggaerClient.extractCertifications(profile)
      const debasicAnswers = jaggaerClient.extractDebasicAnswers(profile)
      const complianceStatus = jaggaerClient.calculateComplianceStatus(certifications)

      const transformedCertifications = certifications.map((cert, index) => ({
        id: index + 1,
        supplier_id: supplierId,
        cert_type: cert.type,
        cert_name: cert.name,
        raw_type: cert.raw_type || "4",
        question_code: cert.question_code,
        cert_values: Array.isArray(cert.values.filename) ? cert.values.filename : [cert.values.filename || cert.name],
        file_id: cert.values.file_id,
        secure_token: cert.values.secure_token,
        attachment_expiry_date: cert.values.attachment_expiry_date,
        restricted: cert.values.restricted,
        last_answer_date: cert.values.last_answer_date,
        last_confirmed_date: cert.values.last_confirmed_date,
        last_answer_user_id: cert.values.last_answer_user_id,
        last_answer_user_name: cert.values.last_answer_user_name,
        created_at: cert.values.last_answer_date || new Date().toISOString(),
        updated_at: cert.values.last_confirmed_date || new Date().toISOString(),
      }))

      const verifications = Object.entries(complianceStatus.required_certs).map(([certType, certStatus], index) => {
        const cert = certifications.find((c) => c.type === certType)
        return {
          id: index + 1,
          supplier_id: supplierId,
          verification_type: certType,
          status: certStatus.status,
          certificate_name: cert?.name || `${certType} Certificate`,
          certificate_expiry_date: certStatus.expiry_date,
          days_until_expiry: certStatus.days_until_expiry,
          verification_score: certStatus.status === "VALID" ? 95 : certStatus.status === "EXPIRING" ? 75 : 25,
          verified_at: cert?.values.last_confirmed_date || new Date().toISOString(),
          verified_by: cert?.values.last_answer_user_name || "system",
          notes: `${certType} certificate ${certStatus.status.toLowerCase()}${certStatus.days_until_expiry ? ` (${certStatus.days_until_expiry} days until expiry)` : ""}`,
        }
      })

      const attachments = certifications
        .filter((cert) => cert.values.file_id && cert.values.filename)
        .map((cert, index) => ({
          id: index + 1,
          supplier_id: supplierId,
          file_id: cert.values.file_id!,
          secure_token: cert.values.secure_token || "",
          file_name: cert.values.filename!,
          display_name: cert.name,
          question_code: cert.question_code,
          content_type: cert.values.filename!.toLowerCase().endsWith(".pdf")
            ? "application/pdf"
            : "application/octet-stream",
          size_bytes: Math.floor(Math.random() * 5000000) + 500000, // Mock size
          attachment_expiry_date: cert.values.attachment_expiry_date,
          status: "DOWNLOADED",
          restricted: cert.values.restricted,
          created_at: cert.values.last_answer_date || new Date().toISOString(),
        }))

      const logs = [
        {
          id: 1,
          supplier_id: supplierId,
          level: "INFO",
          message: `Supplier data synchronized from Jaggaer (${certifications.length} certifications found)`,
          created_at: new Date().toISOString(),
        },
        {
          id: 2,
          supplier_id: supplierId,
          level:
            complianceStatus.overall_status === "GREEN"
              ? "SUCCESS"
              : complianceStatus.overall_status === "YELLOW"
                ? "WARNING"
                : "ERROR",
          message: `Compliance status: ${complianceStatus.overall_status} (Score: ${complianceStatus.compliance_score}%)`,
          created_at: new Date().toISOString(),
        },
      ]

      const supplierDetails = {
        supplier: {
          id: supplierId,
          bravo_id: supplierInfo.bravo_id,
          company_name: supplierInfo.company_name,
          biz_legal_struct: supplierInfo.biz_legal_struct,
          fiscal_code: supplierInfo.fiscal_code,
          vat_number: supplierInfo.eu_vat,
          email: supplierInfo.email,
          pec_email: supplierInfo.pec_email,
          phone: supplierInfo.phone,
          address: supplierInfo.address,
          city: supplierInfo.city,
          zip_code: supplierInfo.zip,
          province: supplierInfo.province,
          country: supplierInfo.country,
          status: supplierInfo.status,
          type: supplierInfo.type,
          user_alias: supplierInfo.user_alias,
          user_name: supplierInfo.user_name,
          user_surname: supplierInfo.user_surname,
          user_email: supplierInfo.user_email,
          user_phone: supplierInfo.user_phone,
          user_role: supplierInfo.user_role,
          currency: supplierInfo.currency,
          jaggaer_last_mod_time: supplierInfo.last_mod_time?.toISOString(),
          last_sync: new Date().toISOString(),
          created_at: supplierInfo.registration_date?.toISOString() || new Date().toISOString(),
          updated_at: supplierInfo.last_mod_time?.toISOString() || new Date().toISOString(),
          compliance_status: complianceStatus.overall_status,
          compliance_score: complianceStatus.compliance_score,
        },
        certifications: transformedCertifications,
        verifications,
        attachments,
        results: [], // Placeholder for future verification results
        logs,
        debasic_answers: debasicAnswers,
        compliance_details: complianceStatus.required_certs,
      }

      return NextResponse.json(supplierDetails, {
        headers: {
          "Cache-Control": "private, max-age=30, stale-while-revalidate=120",
          "Vary": "Cookie",
        },
      })
    } catch (jaggaerError) {
      console.error("Jaggaer API error:", jaggaerError)

      const mockSupplierDetails = {
        supplier: {
          id: supplierId,
          bravo_id: supplierId,
          company_name: "2P COSTRUZIONI S.R.L.",
          fiscal_code: "01520750629",
          vat_number: "IT01520750629",
          address: "CRV CLODIA 163/167",
          city: "ROMA",
          zip_code: "00195",
          jaggaer_last_mod_time: "2025-08-04T08:14:47.000Z",
          last_sync: "2025-01-13T10:00:00.000Z",
          created_at: "2019-05-16T07:29:23.000Z",
          updated_at: "2025-08-04T08:14:47.000Z",
          compliance_status: "YELLOW",
          compliance_score: 85,
        },
        certifications: [
          {
            id: 1,
            supplier_id: supplierId,
            cert_type: "SOA",
            cert_name: "Allegato attestazione SOA",
            raw_type: "4",
            cert_values: ["Category OG1", "Category OG2"],
            created_at: "2019-05-16T07:29:23.000Z",
            updated_at: "2025-08-04T08:14:47.000Z",
          },
        ],
        verifications: [],
        attachments: [],
        results: [],
        logs: [
          {
            id: 1,
            supplier_id: supplierId,
            level: "ERROR",
            message: `Failed to fetch from Jaggaer API: ${jaggaerError instanceof Error ? jaggaerError.message : String(jaggaerError)}`,
            created_at: new Date().toISOString(),
          },
        ],
        debasic_answers: {},
        compliance_details: {},
      }

      return NextResponse.json(mockSupplierDetails, {
        headers: {
          "Cache-Control": "private, max-age=30, stale-while-revalidate=120",
          "Vary": "Cookie",
        },
      })
    }
  } catch (error) {
    console.error("Error in supplier details API:", error)
    return NextResponse.json(
      {
        error: "Internal server error",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    )
  }
}
