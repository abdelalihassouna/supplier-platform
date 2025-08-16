import { DashboardLayout } from "@/components/dashboard-layout"
import { DocumentVerificationSystem } from "@/components/document-verification-system"

interface DocumentVerificationPageProps {
  params: {
    documentId: string
  }
}

export default function DocumentVerificationPage({ params }: DocumentVerificationPageProps) {
  return (
    <DashboardLayout>
      <DocumentVerificationSystem documentId={params.documentId} />
    </DashboardLayout>
  )
}
