'use client'

import React from 'react'
import { DashboardLayout } from "@/components/dashboard-layout"
import { WorkflowBuilder } from "@/components/workflow/WorkflowBuilder"

export default function WorkflowBuilderPage() {
  return (
    <DashboardLayout>
      <WorkflowBuilder />
    </DashboardLayout>
  )
}
