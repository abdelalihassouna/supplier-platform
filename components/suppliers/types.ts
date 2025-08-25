export interface Supplier {
  id: string
  bravo_id: string
  ext_code: string
  company_name: string
  fiscal_code: string
  vat_number: string
  email: string
  pec_email: string
  phone: string
  address: string
  city: string
  province: string
  zip_code: string
  country: string
  status: string
  supplier_type: string
  registration_date: string | null
  jaggaer_last_mod_time: string | null
  last_sync: string | null
  created_at: string
  updated_at: string
  total_documents: number
  verified_documents: number
  verification_progress: number
  certifications: Array<{
    id: string
    certification_type: string
    certification_name: string
    status: string
    expiry_date: string | null
    values: string[]
  }>
  verification_status: "PENDING" | "IN_PROGRESS" | "QUALIFIED" | "REJECTED" | "EXPIRED"
}
