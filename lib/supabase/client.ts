import { createClientComponentClient } from "@supabase/auth-helpers-nextjs"

// Check if Supabase environment variables are available
export const isSupabaseConfigured =
  typeof process.env.NEXT_PUBLIC_SUPABASE_URL === "string" &&
  process.env.NEXT_PUBLIC_SUPABASE_URL.length > 0 &&
  typeof process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY === "string" &&
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY.length > 0

// Create a singleton instance of the Supabase client for Client Components
export const supabase = createClientComponentClient()

// Database types
export interface Supplier {
  id: string
  bravo_id?: string
  company_name: string
  fiscal_code?: string
  vat_number?: string
  legal_form?: string
  address?: string
  city?: string
  province?: string
  postal_code?: string
  country?: string
  phone?: string
  email?: string
  website?: string
  pec_email?: string
  legal_representative?: string
  verification_status: "not_started" | "in_progress" | "completed" | "error" | "pending" | "qualified_q1"
  compliance_score: number
  last_sync_date?: string
  created_at: string
  updated_at: string
}

export interface SupplierCertification {
  id: string
  supplier_id: string
  certification_type: string
  certification_name: string
  issuing_authority?: string
  certificate_number?: string
  issue_date?: string
  expiry_date?: string
  status: "valid" | "expired" | "pending" | "invalid"
  attachment_id?: string
  created_at: string
  updated_at: string
}

export interface Attachment {
  id: string
  supplier_id: string
  filename: string
  original_filename: string
  file_type: string
  file_size?: number
  storage_path: string
  document_type?: string
  secure_token?: string
  jaggaer_attachment_id?: string
  upload_date: string
  uploaded_by?: string
  created_at: string
}

export interface UserProfile {
  id: string
  email: string
  full_name?: string
  role: "admin" | "manager" | "user"
  department?: string
  phone?: string
  avatar_url?: string
  created_at: string
  updated_at: string
}
