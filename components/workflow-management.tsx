"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Progress } from "@/components/ui/progress"
import { Avatar, AvatarFallback, AvatarInitials } from "@/components/ui/avatar"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Checkbox } from "@/components/ui/checkbox"
import { Label } from "@/components/ui/label"
import {
  GitBranch,
  Users,
  Bell,
  Clock,
  CheckCircle,
  XCircle,
  AlertTriangle,
  Send,
  Eye,
  Play,
  ArrowRight,
  Zap,
  FileCheck,
  Workflow,
  ExternalLink,
  Settings,
} from "lucide-react"
import { cn } from "@/lib/utils"
import Link from "next/link"

// Mock workflow data
const mockWorkflows = [
  {
    id: "wf-001",
    name: "Q1 2024 Supplier Audit",
    type: "audit",
    status: "in_progress",
    priority: "high",
    startDate: "2024-01-01T00:00:00Z",
    dueDate: "2024-03-31T23:59:59Z",
    progress: 65,
    assignedTo: "Compliance Team",
    suppliersCount: 45,
    completedSuppliers: 29,
    steps: [
      {
        id: "step-1",
        name: "Initial Assessment",
        status: "completed",
        assignee: "Maria Rossi",
        dueDate: "2024-01-15T00:00:00Z",
      },
      {
        id: "step-2",
        name: "Document Collection",
        status: "completed",
        assignee: "Giuseppe Verdi",
        dueDate: "2024-02-01T00:00:00Z",
      },
      {
        id: "step-3",
        name: "Verification Process",
        status: "in_progress",
        assignee: "Laura Bianchi",
        dueDate: "2024-02-28T00:00:00Z",
      },
      {
        id: "step-4",
        name: "Final Review",
        status: "pending",
        assignee: "Marco Ferrari",
        dueDate: "2024-03-15T00:00:00Z",
      },
      { id: "step-5", name: "Approval", status: "pending", assignee: "Admin User", dueDate: "2024-03-31T00:00:00Z" },
    ],
  },
  {
    id: "wf-002",
    name: "ISO 9001 Migration",
    type: "certification",
    status: "pending",
    priority: "medium",
    startDate: "2024-02-01T00:00:00Z",
    dueDate: "2024-06-30T23:59:59Z",
    progress: 25,
    assignedTo: "Quality Team",
    suppliersCount: 78,
    completedSuppliers: 19,
    steps: [
      {
        id: "step-1",
        name: "Requirements Analysis",
        status: "completed",
        assignee: "Anna Esposito",
        dueDate: "2024-02-15T00:00:00Z",
      },
      {
        id: "step-2",
        name: "Gap Assessment",
        status: "in_progress",
        assignee: "Roberto Ferrari",
        dueDate: "2024-03-01T00:00:00Z",
      },
      {
        id: "step-3",
        name: "Implementation Plan",
        status: "pending",
        assignee: "Giulia Romano",
        dueDate: "2024-04-01T00:00:00Z",
      },
      {
        id: "step-4",
        name: "Certification Process",
        status: "pending",
        assignee: "Marco Rossi",
        dueDate: "2024-05-31T00:00:00Z",
      },
      {
        id: "step-5",
        name: "Final Validation",
        status: "pending",
        assignee: "Admin User",
        dueDate: "2024-06-30T00:00:00Z",
      },
    ],
  },
]

const mockTasks = [
  {
    id: "task-001",
    title: "Review DURC Certificate - Acme Construction",
    description: "Verify DURC certificate compliance for Q1 audit",
    workflowId: "wf-001",
    workflowName: "Q1 2024 Supplier Audit",
    supplierId: "SUP-001",
    supplierName: "Acme Construction Ltd",
    assignee: "Laura Bianchi",
    status: "in_progress",
    priority: "high",
    dueDate: "2024-01-20T00:00:00Z",
    createdDate: "2024-01-15T10:00:00Z",
    estimatedHours: 2,
    actualHours: 1.5,
  },
  {
    id: "task-002",
    title: "ISO 9001 Gap Analysis - TechFlow Solutions",
    description: "Conduct gap analysis for ISO 9001 migration",
    workflowId: "wf-002",
    workflowName: "ISO 9001 Migration",
    supplierId: "SUP-002",
    supplierName: "TechFlow Solutions",
    assignee: "Roberto Ferrari",
    status: "pending",
    priority: "medium",
    dueDate: "2024-01-25T00:00:00Z",
    createdDate: "2024-01-18T14:00:00Z",
    estimatedHours: 4,
    actualHours: 0,
  },
  {
    id: "task-003",
    title: "Final Approval - Milano Engineering",
    description: "Final approval required for supplier qualification",
    workflowId: "wf-001",
    workflowName: "Q1 2024 Supplier Audit",
    supplierId: "SUP-003",
    supplierName: "Milano Engineering",
    assignee: "Admin User",
    status: "requires_approval",
    priority: "high",
    dueDate: "2024-01-22T00:00:00Z",
    createdDate: "2024-01-19T09:00:00Z",
    estimatedHours: 1,
    actualHours: 0,
  },
]

const mockNotifications = [
  {
    id: "notif-001",
    type: "task_overdue",
    title: "Task Overdue",
    message: "DURC verification for Acme Construction is overdue",
    severity: "high",
    timestamp: "2024-01-20T10:30:00Z",
    read: false,
    actionUrl: "/tasks/task-001",
  },
  {
    id: "notif-002",
    type: "document_expiring",
    title: "Document Expiring Soon",
    message: "SOA certificate for Napoli Logistics expires in 30 days",
    severity: "medium",
    timestamp: "2024-01-19T15:45:00Z",
    read: false,
    actionUrl: "/suppliers/SUP-004",
  },
  {
    id: "notif-003",
    type: "approval_required",
    title: "Approval Required",
    message: "Milano Engineering qualification requires your approval",
    severity: "high",
    timestamp: "2024-01-19T09:15:00Z",
    read: true,
    actionUrl: "/tasks/task-003",
  },
]

export function WorkflowManagement() {
  const [activeTab, setActiveTab] = useState("workflows")
  const [selectedWorkflow, setSelectedWorkflow] = useState<string | null>(null)
  const [selectedSuppliers, setSelectedSuppliers] = useState<string[]>([])
  const [showBulkDialog, setShowBulkDialog] = useState(false)
  const [taskFilter, setTaskFilter] = useState("all")
  const [q1WorkflowResults, setQ1WorkflowResults] = useState<any>(null)
  const [isRunningQ1, setIsRunningQ1] = useState(false)
  const [selectedSupplierId, setSelectedSupplierId] = useState<string | null>(null)
  const [workflows, setWorkflows] = useState<any[]>([])
  const [suppliers, setSuppliers] = useState<any[]>([])
  const [workflowRuns, setWorkflowRuns] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [createWorkflowOpen, setCreateWorkflowOpen] = useState(false)
  const [createWorkflowData, setCreateWorkflowData] = useState({
    supplierId: '',
    includeSOA: false,
    includeWhiteList: false
  })

  // Load real data on component mount
  useEffect(() => {
    const loadData = async () => {
      try {
        // Load suppliers
        const suppliersResponse = await fetch('/api/suppliers')
        if (suppliersResponse.ok) {
          const suppliersData = await suppliersResponse.json()
          setSuppliers(suppliersData.suppliers || [])
        }
      } catch (error) {
        console.error('Failed to load data:', error)
      } finally {
        setLoading(false)
      }
    }

    loadData()
  }, [])

  // Load workflow runs when a supplier is selected
  useEffect(() => {
    const loadRuns = async () => {
      if (!selectedSupplierId) return
      try {
        const resp = await fetch(`/api/workflows/q1/run?supplierId=${encodeURIComponent(selectedSupplierId)}`)
        if (resp.ok) {
          const data = await resp.json()
          setWorkflowRuns(data.runs || [])
        }
      } catch (e) {
        console.error('Failed to load workflow runs:', e)
      }
    }
    loadRuns()
  }, [selectedSupplierId])

  const getStatusColor = (status: string) => {
    switch (status) {
      case "completed":
        return "text-green-600 bg-green-100"
      case "in_progress":
        return "text-blue-600 bg-blue-100"
      case "pending":
        return "text-gray-600 bg-gray-100"
      case "requires_approval":
        return "text-purple-600 bg-purple-100"
      case "overdue":
        return "text-red-600 bg-red-100"
      default:
        return "text-gray-600 bg-gray-100"
    }
  }

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case "high":
        return "text-red-600 bg-red-100"
      case "medium":
        return "text-yellow-600 bg-yellow-100"
      case "low":
        return "text-green-600 bg-green-100"
      default:
        return "text-gray-600 bg-gray-100"
    }
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "completed":
        return <CheckCircle className="w-4 h-4" />
      case "in_progress":
        return <Play className="w-4 h-4" />
      case "pending":
        return <Clock className="w-4 h-4" />
      case "requires_approval":
        return <AlertTriangle className="w-4 h-4" />
      case "overdue":
        return <XCircle className="w-4 h-4" />
      default:
        return <Clock className="w-4 h-4" />
    }
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("it-IT", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    })
  }

  const formatDateTime = (dateString: string) => {
    return new Date(dateString).toLocaleString("it-IT", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    })
  }

  // Convert workflow runs to task-like format for display
  const tasksFromWorkflows = workflowRuns.flatMap(run => 
    run.steps?.map((step: any) => ({
      id: `${run.id}-${step.step_key}`,
      title: `${step.name} - ${suppliers.find(s => s.id === run.supplier_id)?.company_name || 'Unknown Supplier'}`,
      description: step.issues?.join(', ') || `${step.name} for Q1 workflow`,
      workflowId: run.id,
      workflowName: 'Q1 Supplier Qualification',
      supplierId: run.supplier_id,
      supplierName: suppliers.find(s => s.id === run.supplier_id)?.company_name || 'Unknown Supplier',
      assignee: 'System',
      status: step.status === 'pass' ? 'completed' : step.status === 'fail' ? 'requires_approval' : 'pending',
      priority: step.status === 'fail' ? 'high' : 'medium',
      dueDate: step.ended_at || step.started_at,
      createdDate: step.started_at,
      estimatedHours: 1,
      actualHours: step.ended_at ? 1 : 0,
    })) || []
  )

  const allTasks = workflowRuns.length > 0 ? tasksFromWorkflows : [...mockTasks]

  const filteredTasks = allTasks.filter((task) => {
    if (taskFilter === "all") return true
    if (taskFilter === "my_tasks") return task.assignee === "Admin User"
    if (taskFilter === "overdue") return new Date(task.dueDate) < new Date()
    return task.status === taskFilter
  })

  const runQ1Workflow = async (supplierId: string, options = { includeSOA: true, includeWhiteList: true }) => {
    setIsRunningQ1(true)
    setSelectedSupplierId(supplierId)
    
    try {
      const response = await fetch('/api/workflows/q1/run', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          supplierId,
          ...options,
        }),
      })

      if (!response.ok) {
        throw new Error('Failed to run Q1 workflow')
      }

      const result = await response.json()
      setQ1WorkflowResults(result)

      // Immediately refresh workflow runs list
      try {
        const workflowsResponse = await fetch(`/api/workflows/q1/run?supplierId=${encodeURIComponent(supplierId)}`)
        if (workflowsResponse.ok) {
          const workflowsData = await workflowsResponse.json()
          setWorkflowRuns(workflowsData.runs || [])
        }
      } catch (e) {
        console.error('Failed to refresh workflow runs after trigger:', e)
      }
    } catch (error) {
      console.error('Q1 workflow failed:', error)
      alert('Failed to run Q1 workflow. Please try again.')
    } finally {
      setIsRunningQ1(false)
    }
  }

  const handleCreateWorkflow = async () => {
    if (!createWorkflowData.supplierId) {
      alert('Please select a supplier')
      return
    }

    await runQ1Workflow(createWorkflowData.supplierId, {
      includeSOA: createWorkflowData.includeSOA,
      includeWhiteList: createWorkflowData.includeWhiteList
    })

    // Reset form and close dialog
    setCreateWorkflowData({
      supplierId: '',
      includeSOA: false,
      includeWhiteList: false
    })
    setCreateWorkflowOpen(false)
  }

  // Poll workflow runs while a run is in progress
  useEffect(() => {
    if (!isRunningQ1 || !selectedSupplierId) return

    const interval = setInterval(async () => {
      try {
        const workflowsResponse = await fetch(`/api/workflows/q1/run?supplierId=${encodeURIComponent(selectedSupplierId)}`)
        if (workflowsResponse.ok) {
          const workflowsData = await workflowsResponse.json()
          setWorkflowRuns(workflowsData.runs || [])
          // Stop polling if all runs have status not equal to 'running'
          const anyRunning = (workflowsData.runs || []).some((r: any) => r.status === 'running')
          if (!anyRunning) {
            clearInterval(interval)
          }
        }
      } catch (e) {
        console.error('Polling workflow runs failed:', e)
      }
    }, 3000)

    return () => clearInterval(interval)
  }, [isRunningQ1, selectedSupplierId])

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Workflows</h2>
          <p className="text-muted-foreground">
            Manage and monitor your supplier verification workflows
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => openBulkDialog()}>
            <Users className="w-4 h-4 mr-2" />
            Bulk Workflow
          </Button>
          <Button variant="outline" asChild>
            <Link href="/workflows/builder">
              <Settings className="w-4 h-4 mr-2" />
              Workflow Builder
            </Link>
          </Button>
          <Dialog open={createWorkflowOpen} onOpenChange={setCreateWorkflowOpen}>
            <DialogTrigger asChild>
              <Button>
                <Play className="w-4 h-4 mr-2" />
                Create Workflow
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[425px]">
              <DialogHeader>
                <DialogTitle>Create Q1 Workflow</DialogTitle>
                <DialogDescription>
                  Create a new Q1 supplier qualification workflow for a selected supplier.
                </DialogDescription>
              </DialogHeader>
              <div className="grid gap-4 py-4">
                <div className="space-y-2">
                  <Label htmlFor="supplier">Supplier</Label>
                  <Select 
                    value={createWorkflowData.supplierId} 
                    onValueChange={(value) => setCreateWorkflowData(prev => ({ ...prev, supplierId: value }))}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select a supplier" />
                    </SelectTrigger>
                    <SelectContent>
                      {suppliers.map((supplier) => (
                        <SelectItem key={supplier.id} value={supplier.id}>
                          {supplier.company_name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-3">
                  <Label>Workflow Options</Label>
                  <div className="flex items-center space-x-2">
                    <Checkbox 
                      id="includeSOA"
                      checked={createWorkflowData.includeSOA}
                      onCheckedChange={(checked) => 
                        setCreateWorkflowData(prev => ({ ...prev, includeSOA: !!checked }))
                      }
                    />
                    <Label htmlFor="includeSOA" className="text-sm font-normal">
                      Include SOA verification
                    </Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Checkbox 
                      id="includeWhiteList"
                      checked={createWorkflowData.includeWhiteList}
                      onCheckedChange={(checked) => 
                        setCreateWorkflowData(prev => ({ ...prev, includeWhiteList: !!checked }))
                      }
                    />
                    <Label htmlFor="includeWhiteList" className="text-sm font-normal">
                      Include White List verification
                    </Label>
                  </div>
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setCreateWorkflowOpen(false)}>
                  Cancel
                </Button>
                <Button onClick={handleCreateWorkflow} disabled={!createWorkflowData.supplierId || isRunningQ1}>
                  {isRunningQ1 ? 'Creating...' : 'Create Workflow'}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
          <Select onValueChange={(supplierId) => runQ1Workflow(supplierId)} disabled={isRunningQ1 || suppliers.length === 0}>
            <SelectTrigger className="w-48">
              <SelectValue placeholder={isRunningQ1 ? "Running Q1..." : "Run Q1 for Supplier"} />
            </SelectTrigger>
            <SelectContent>
              {suppliers.map((supplier) => (
                <SelectItem key={supplier.id} value={supplier.id}>
                  {supplier.company_name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button>
            <Users className="w-4 h-4 mr-2" />
            Assign Tasks
          </Button>
        </div>
      </div>

      {/* Main Content Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="workflows">Workflows</TabsTrigger>
          <TabsTrigger value="tasks">Tasks</TabsTrigger>
          <TabsTrigger value="approvals">Approvals</TabsTrigger>
          <TabsTrigger value="notifications">Notifications</TabsTrigger>
        </TabsList>

        <TabsContent value="workflows" className="space-y-6">
          {/* Q1 Workflow Results */}
          {q1WorkflowResults && (
            <Card className="mb-6">
              <CardHeader>
                <CardTitle className="flex items-center">
                  <FileCheck className="w-5 h-5 mr-2" />
                  Q1 Workflow Results
                </CardTitle>
                <CardDescription>
                  Supplier ID: {selectedSupplierId} • Status: {q1WorkflowResults.overall}
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <span className="font-medium">Overall Result:</span>
                    <Badge className={cn("text-xs", 
                      q1WorkflowResults.overall === 'qualified' ? 'text-green-600 bg-green-100' :
                      q1WorkflowResults.overall === 'conditionally_qualified' ? 'text-yellow-600 bg-yellow-100' :
                      'text-red-600 bg-red-100'
                    )} variant="outline">
                      {q1WorkflowResults.overall?.replace('_', ' ')}
                    </Badge>
                  </div>
                  
                  <div className="space-y-2">
                    <h4 className="font-medium">Step Results:</h4>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                      {q1WorkflowResults.steps?.map((step: any) => (
                        <div key={step.step_key} className="flex items-center justify-between p-2 border rounded">
                          <span className="text-sm">{step.name}</span>
                          <div className="flex items-center space-x-1">
                            {getStatusIcon(step.status)}
                            <Badge className={cn("text-xs", getStatusColor(step.status))} variant="outline">
                              {step.status}
                            </Badge>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  {q1WorkflowResults.notes?.length > 0 && (
                    <div className="space-y-2">
                      <h4 className="font-medium">Issues:</h4>
                      <ul className="text-sm text-muted-foreground space-y-1">
                        {q1WorkflowResults.notes.map((note: string, index: number) => (
                          <li key={index}>• {note}</li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Workflow Overview */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2 space-y-4">
              {loading ? (
                <Card>
                  <CardContent className="p-6">
                    <div className="text-center text-muted-foreground">Loading workflows...</div>
                  </CardContent>
                </Card>
              ) : workflowRuns.length > 0 ? (
                workflowRuns.map((run) => (
                  <Card
                    key={run.id}
                    className="cursor-pointer hover:shadow-md transition-shadow"
                    onClick={() => setSelectedWorkflow(run.id)}
                  >
                    <CardHeader>
                      <div className="flex items-center justify-between">
                        <div className="space-y-1">
                          <CardTitle className="flex items-center">
                            <GitBranch className="w-5 h-5 mr-2" />
                            Q1 Qualification - {suppliers.find(s => s.id === run.supplier_id)?.company_name || 'Unknown Supplier'}
                          </CardTitle>
                          <CardDescription>
                            Started: {formatDate(run.started_at)} • {run.steps?.length || 0} steps
                          </CardDescription>
                        </div>
                        <div className="flex items-center space-x-2">
                          <Badge className={cn("text-xs", 
                            run.overall === 'qualified' ? 'text-green-600 bg-green-100' :
                            run.overall === 'conditionally_qualified' ? 'text-yellow-600 bg-yellow-100' :
                            run.overall === 'not_qualified' ? 'text-red-600 bg-red-100' :
                            'text-blue-600 bg-blue-100'
                          )} variant="outline">
                            {run.overall?.replace('_', ' ') || run.status}
                          </Badge>
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div className="space-y-2">
                        <div className="flex items-center justify-between text-sm">
                          <span>Progress</span>
                          <span>
                            {run.steps?.filter((s: any) => s.status === 'pass').length || 0}/{run.steps?.length || 0} steps passed
                          </span>
                        </div>
                        <Progress 
                          value={run.steps?.length ? (run.steps.filter((s: any) => s.status === 'pass').length / run.steps.length) * 100 : 0} 
                          className="h-2" 
                        />
                      </div>
                      <div className="flex items-center justify-between text-sm text-muted-foreground">
                        <span>Status: {run.status}</span>
                        <span>
                          {run.ended_at ? `Completed: ${formatDate(run.ended_at)}` : 'In Progress'}
                        </span>
                      </div>
                      <div className="flex gap-2 pt-2">
                        <Button variant="outline" size="sm" asChild>
                          <Link href={`/workflows/${run.supplier_id}`}>
                            <Workflow className="w-4 h-4 mr-1" />
                            View Flow
                          </Link>
                        </Button>
                        <Button variant="ghost" size="sm">
                          <Eye className="w-4 h-4" />
                        </Button>
                        <Button variant="secondary" size="sm" onClick={() => openBulkDialog([run.supplier_id])}>
                          <Users className="w-4 h-4 mr-1" />
                          Bulk
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                ))
              ) : (
                mockWorkflows.map((workflow) => (
                <Card
                  key={workflow.id}
                  className="cursor-pointer hover:shadow-md transition-shadow"
                  onClick={() => setSelectedWorkflow(workflow.id)}
                >
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <div className="space-y-1">
                        <CardTitle className="flex items-center">
                          <GitBranch className="w-5 h-5 mr-2" />
                          {workflow.name}
                        </CardTitle>
                        <CardDescription>
                          {workflow.assignedTo} • {workflow.suppliersCount} suppliers
                        </CardDescription>
                      </div>
                      <div className="flex items-center space-x-2">
                        <Badge className={cn("text-xs", getPriorityColor(workflow.priority))} variant="outline">
                          {workflow.priority}
                        </Badge>
                        <Badge className={cn("text-xs", getStatusColor(workflow.status))} variant="outline">
                          {workflow.status.replace("_", " ")}
                        </Badge>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="space-y-2">
                      <div className="flex items-center justify-between text-sm">
                        <span>Progress</span>
                        <span>
                          {workflow.progress}% ({workflow.completedSuppliers}/{workflow.suppliersCount})
                        </span>
                      </div>
                      <Progress value={workflow.progress} className="h-2" />
                    </div>
                    <div className="flex items-center justify-between text-sm text-muted-foreground">
                      <span>Due: {formatDate(workflow.dueDate)}</span>
                      <span>
                        {workflow.steps.filter((s) => s.status === "completed").length}/{workflow.steps.length} steps
                        completed
                      </span>
                    </div>
                    <div className="flex gap-2 pt-2">
                      <Button variant="outline" size="sm" asChild>
                        <Link href={`/workflows/${suppliers[0]?.id || '11594'}`}>
                          <Workflow className="w-4 h-4 mr-1" />
                          View Flow
                        </Link>
                      </Button>
                      <Button variant="ghost" size="sm">
                        <Eye className="w-4 h-4" />
                      </Button>
                      <Button variant="secondary" size="sm" onClick={() => openBulkDialog([suppliers[0]?.id?.toString() || '11594'])}>
                        <Users className="w-4 h-4 mr-1" />
                        Bulk
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              )))}
            </div>

            {/* Workflow Details */}
            <div className="space-y-4">
              {selectedWorkflow && (
                <Card>
                  <CardHeader>
                    <CardTitle>Workflow Steps</CardTitle>
                    <CardDescription>Process flow visualization</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      {mockWorkflows
                        .find((w) => w.id === selectedWorkflow)
                        ?.steps.map((step, index) => (
                          <div key={step.id} className="flex items-start space-x-3">
                            <div className="flex flex-col items-center">
                              <div
                                className={cn(
                                  "flex items-center justify-center w-8 h-8 rounded-full",
                                  getStatusColor(step.status),
                                )}
                              >
                                {getStatusIcon(step.status)}
                              </div>
                              {index < mockWorkflows.find((w) => w.id === selectedWorkflow)!.steps.length - 1 && (
                                <div className="w-px h-6 bg-border mt-2" />
                              )}
                            </div>
                            <div className="flex-1 space-y-1">
                              <p className="font-medium text-sm">{step.name}</p>
                              <p className="text-xs text-muted-foreground">{step.assignee}</p>
                              <p className="text-xs text-muted-foreground">Due: {formatDate(step.dueDate)}</p>
                            </div>
                          </div>
                        ))}
                    </div>
                  </CardContent>
                </Card>
              )}
            </div>
          </div>
        </TabsContent>

        <TabsContent value="tasks" className="space-y-6">
          {/* Task Filters */}
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center space-x-4">
                <Select value={taskFilter} onValueChange={setTaskFilter}>
                  <SelectTrigger className="w-48">
                    <SelectValue placeholder="Filter tasks" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Tasks</SelectItem>
                    <SelectItem value="my_tasks">My Tasks</SelectItem>
                    <SelectItem value="pending">Pending</SelectItem>
                    <SelectItem value="in_progress">In Progress</SelectItem>
                    <SelectItem value="requires_approval">Requires Approval</SelectItem>
                    <SelectItem value="overdue">Overdue</SelectItem>
                  </SelectContent>
                </Select>
                <div className="flex items-center space-x-2 text-sm text-muted-foreground">
                  <span>{filteredTasks.length} tasks</span>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Task List */}
          <div className="space-y-4">
            {filteredTasks.map((task) => (
              <Card key={task.id}>
                <CardContent className="p-4">
                  <div className="flex items-start justify-between">
                    <div className="space-y-2">
                      <div className="flex items-center space-x-2">
                        <h3 className="font-semibold">{task.title}</h3>
                        <Badge className={cn("text-xs", getPriorityColor(task.priority))} variant="outline">
                          {task.priority}
                        </Badge>
                        <Badge className={cn("text-xs", getStatusColor(task.status))} variant="outline">
                          {task.status.replace("_", " ")}
                        </Badge>
                      </div>
                      <p className="text-sm text-muted-foreground">{task.description}</p>
                      <div className="flex items-center space-x-4 text-sm text-muted-foreground">
                        <span>Workflow: {task.workflowName}</span>
                        <span>Supplier: {task.supplierName}</span>
                        <span>Due: {formatDate(task.dueDate)}</span>
                      </div>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Avatar className="w-8 h-8">
                        <AvatarFallback>
                          <AvatarInitials name={task.assignee} />
                        </AvatarFallback>
                      </Avatar>
                      <div className="text-right">
                        <p className="text-sm font-medium">{task.assignee}</p>
                        <p className="text-xs text-muted-foreground">
                          {task.actualHours}h / {task.estimatedHours}h
                        </p>
                      </div>
                      <Button variant="ghost" size="sm">
                        <Eye className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="approvals" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <CheckCircle className="w-5 h-5 mr-2" />
                Pending Approvals
              </CardTitle>
              <CardDescription>Multi-level approval workflows</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {mockTasks
                  .filter((task) => task.status === "requires_approval")
                  .map((task) => (
                    <div key={task.id} className="p-4 border rounded-lg">
                      <div className="space-y-4">
                        <div className="flex items-start justify-between">
                          <div className="space-y-2">
                            <h4 className="font-medium">{task.title}</h4>
                            <p className="text-sm text-muted-foreground">{task.description}</p>
                            <div className="flex items-center space-x-4 text-sm text-muted-foreground">
                              <span>Supplier: {task.supplierName}</span>
                              <span>Requested by: {task.assignee}</span>
                              <span>Due: {formatDate(task.dueDate)}</span>
                            </div>
                          </div>
                          <Badge className={cn("text-xs", getPriorityColor(task.priority))} variant="outline">
                            {task.priority} priority
                          </Badge>
                        </div>
                        <div className="space-y-3">
                          <div>
                            <label className="text-sm font-medium">Approval Comments</label>
                            <Textarea placeholder="Add your approval comments..." className="mt-1" rows={3} />
                          </div>
                          <div className="flex items-center space-x-2">
                            <Button size="sm">
                              <CheckCircle className="w-4 h-4 mr-1" />
                              Approve
                            </Button>
                            <Button size="sm" variant="outline">
                              <XCircle className="w-4 h-4 mr-1" />
                              Reject
                            </Button>
                            <Button size="sm" variant="outline">
                              <Send className="w-4 h-4 mr-1" />
                              Request Changes
                            </Button>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="notifications" className="space-y-6">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="flex items-center">
                  <Bell className="w-5 h-5 mr-2" />
                  Notification Center
                </CardTitle>
                <Button variant="outline" size="sm">
                  Mark All Read
                </Button>
              </div>
              <CardDescription>Real-time alerts and notifications</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {mockNotifications.map((notification) => (
                  <div
                    key={notification.id}
                    className={cn("p-4 border rounded-lg", !notification.read && "bg-muted/50")}
                  >
                    <div className="flex items-start justify-between">
                      <div className="space-y-1">
                        <div className="flex items-center space-x-2">
                          <h4 className="font-medium">{notification.title}</h4>
                          <Badge
                            className={cn(
                              "text-xs",
                              notification.severity === "high"
                                ? "text-red-600 bg-red-100"
                                : notification.severity === "medium"
                                  ? "text-yellow-600 bg-yellow-100"
                                  : "text-blue-600 bg-blue-100",
                            )}
                            variant="outline"
                          >
                            {notification.severity}
                          </Badge>
                          {!notification.read && <div className="w-2 h-2 bg-primary rounded-full" />}
                        </div>
                        <p className="text-sm text-muted-foreground">{notification.message}</p>
                        <p className="text-xs text-muted-foreground">{formatDateTime(notification.timestamp)}</p>
                      </div>
                      <Button variant="ghost" size="sm">
                        <ArrowRight className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Bulk Workflow Dialog */}
      <Dialog open={showBulkDialog} onOpenChange={setShowBulkDialog}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Run Bulk Q1 Workflow</DialogTitle>
            <DialogDescription>
              Select suppliers to run Q1 verification workflow for multiple suppliers at once.
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4">
            <div className="max-h-96 overflow-y-auto">
              <div className="space-y-2">
                {suppliers.map((supplier) => (
                  <div key={supplier.id} className="flex items-center space-x-2 p-2 border rounded">
                    <Checkbox
                      id={`supplier-${supplier.id}`}
                      checked={selectedSuppliers.includes(supplier.id.toString())}
                      onCheckedChange={(checked) => {
                        if (checked) {
                          setSelectedSuppliers(prev => [...prev, supplier.id.toString()])
                        } else {
                          setSelectedSuppliers(prev => prev.filter(id => id !== supplier.id.toString()))
                        }
                      }}
                    />
                    <Label htmlFor={`supplier-${supplier.id}`} className="flex-1 cursor-pointer">
                      <div className="flex justify-between items-center">
                        <div>
                          <p className="font-medium">{supplier.company_name}</p>
                          <p className="text-sm text-muted-foreground">{supplier.email}</p>
                        </div>
                        <Badge variant="outline">{supplier.status}</Badge>
                      </div>
                    </Label>
                  </div>
                ))}
              </div>
            </div>
            
            <div className="flex items-center justify-between text-sm text-muted-foreground">
              <span>{selectedSuppliers.length} suppliers selected</span>
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  if (selectedSuppliers.length === suppliers.length) {
                    setSelectedSuppliers([])
                  } else {
                    setSelectedSuppliers(suppliers.map(s => s.id.toString()))
                  }
                }}
              >
                {selectedSuppliers.length === suppliers.length ? 'Deselect All' : 'Select All'}
              </Button>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowBulkDialog(false)}>
              Cancel
            </Button>
            <Button 
              onClick={handleBulkWorkflow}
              disabled={selectedSuppliers.length === 0 || isRunningQ1}
            >
              {isRunningQ1 ? 'Running...' : `Start Workflow for ${selectedSuppliers.length} Suppliers`}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )

  // Helper functions
  function openBulkDialog(supplierIds: string[] = []) {
    setSelectedSuppliers(supplierIds)
    setShowBulkDialog(true)
  }

  async function handleBulkWorkflow() {
    if (selectedSuppliers.length === 0) return
    
    setIsRunningQ1(true)
    try {
      // Run workflows for all selected suppliers in parallel
      const workflowPromises = selectedSuppliers.map(async (supplierId) => {
        const response = await fetch('/api/workflows/start', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ 
            supplierId, 
            options: { 
              includeSOA: true, 
              checkWhitelist: true 
            } 
          })
        })
        
        if (!response.ok) {
          throw new Error(`Failed to start workflow for supplier ${supplierId}`)
        }
        
        return response.json()
      })

      const results = await Promise.allSettled(workflowPromises)
      
      // Show results summary
      const successful = results.filter(r => r.status === 'fulfilled').length
      const failed = results.filter(r => r.status === 'rejected').length
      
      alert(`Bulk workflow started: ${successful} successful, ${failed} failed`)
      
      // Refresh workflow runs
      window.location.reload()
      setShowBulkDialog(false)
      setSelectedSuppliers([])
      
    } catch (error) {
      console.error('Bulk workflow error:', error)
      alert('Failed to start bulk workflow')
    } finally {
      setIsRunningQ1(false)
    }
  }
}
