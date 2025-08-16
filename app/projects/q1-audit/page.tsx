import { DashboardLayout } from "@/components/dashboard-layout"
import { ProjectDetail } from "@/components/project-detail"

export default function Q1AuditPage() {
  const projectData = {
    id: "q1-audit",
    name: "Q1 2024 Audit",
    description: "Quarterly supplier compliance audit and verification",
    status: "In Progress",
    progress: 65,
    dueDate: "2024-03-31",
    team: 8,
    suppliers: 45,
    completedTasks: 13,
    totalTasks: 20,
    priority: "High",
  }

  return (
    <DashboardLayout>
      <ProjectDetail project={projectData} />
    </DashboardLayout>
  )
}
