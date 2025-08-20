import { DashboardLayout } from "@/components/dashboard-layout"
import { SupplierDetailView } from "@/components/supplier-detail-view"

interface SupplierDetailPageProps {
  params: Promise<{
    id: string
  }>
}

export default async function SupplierDetailPage({ params }: SupplierDetailPageProps) {
  const { id } = await params
  return (
    <DashboardLayout>
      <SupplierDetailView supplierId={id} />
    </DashboardLayout>
  )
}