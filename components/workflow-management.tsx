"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Progress } from "@/components/ui/progress"
import { Avatar, AvatarFallback, AvatarInitials } from "@/components/ui/avatar"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
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
} from "lucide-react"
import { cn } from "@/lib/utils"

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
  const [taskFilter, setTaskFilter] = useState("all")

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
    return new Date(dateString).toLocaleDateString("it-IT", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    })
  }

  const filteredTasks = mockTasks.filter((task) => {
    if (taskFilter === "all") return true
    if (taskFilter === "my_tasks") return task.assignee === "Admin User"
    if (taskFilter === "overdue") return new Date(task.dueDate) < new Date()
    return task.status === taskFilter
  })

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Workflow Management</h1>
          <p className="text-muted-foreground">Manage verification workflows and task assignments</p>
        </div>
        <div className="flex items-center space-x-2">
          <Button variant="outline">
            <GitBranch className="w-4 h-4 mr-2" />
            Create Workflow
          </Button>
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
          {/* Workflow Overview */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2 space-y-4">
              {mockWorkflows.map((workflow) => (
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
                  </CardContent>
                </Card>
              ))}
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
    </div>
  )
}
