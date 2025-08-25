export type VerificationStatus =
  | "PENDING"
  | "IN_PROGRESS"
  | "QUALIFIED"
  | "REJECTED"
  | "EXPIRED"

export const statusConfig: Record<VerificationStatus, { label: string; color: string; count: number }> = {
  PENDING: { label: "Pending", color: "bg-yellow-100 text-yellow-800", count: 0 },
  IN_PROGRESS: { label: "In Progress", color: "bg-blue-100 text-blue-800", count: 0 },
  QUALIFIED: { label: "Qualified", color: "bg-green-100 text-green-800", count: 0 },
  REJECTED: { label: "Rejected", color: "bg-red-100 text-red-800", count: 0 },
  EXPIRED: { label: "Expired", color: "bg-gray-100 text-gray-800", count: 0 },
}

// Q1 verification steps (SOA included by default) in order
export const Q1_STEPS = [
  { key: 'registration', name: 'Registration Check' },
  { key: 'preliminary', name: 'Preliminary Data Verification' },
  { key: 'durc', name: 'DURC Verification' },
  { key: 'whitelist_insurance', name: 'White List & Insurance' },
  { key: 'visura', name: 'Qualification Questionnaire (VISURA)' },
  { key: 'certifications', name: 'Certifications Verification' },
  { key: 'soa', name: 'SOA Verification' },
  { key: 'scorecard', name: 'Q1 Scorecard Generation' },
  { key: 'finalize', name: 'Final Outcome & Follow-up' },
] as const
