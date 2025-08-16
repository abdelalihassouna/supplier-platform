import { DashboardLayout } from "@/components/dashboard-layout"
import { ProjectDetail } from "@/components/project-detail"

export default function IsoMigrationPage() {
  const projectData = {
    id: "iso-migration",
    name: "ISO 9001 Migration",
    description: "Migration to new ISO 9001:2015 certification standards",
    status: "Planning",
    progress: 25,
    dueDate: "2024-06-15",
    team: 5,
    suppliers: 78,
    completedTasks: 3,
    totalTasks: 12,
    priority: "Medium",
  }

  return (
    <DashboardLayout>
      <ProjectDetail project={projectData} />
    </DashboardLayout>
  )
}
