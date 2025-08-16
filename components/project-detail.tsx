"use client"

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Progress } from "@/components/ui/progress"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Calendar, Users, FileText, Settings, Activity } from "lucide-react"

interface ProjectDetailProps {
  project: {
    id: string
    name: string
    description: string
    status: string
    progress: number
    dueDate: string
    team: number
    suppliers: number
    completedTasks: number
    totalTasks: number
    priority: string
  }
}

export function ProjectDetail({ project }: ProjectDetailProps) {
  const getStatusColor = (status: string) => {
    switch (status) {
      case "Completed":
        return "bg-green-500"
      case "In Progress":
        return "bg-blue-500"
      case "Planning":
        return "bg-yellow-500"
      default:
        return "bg-gray-500"
    }
  }

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case "High":
        return "destructive"
      case "Medium":
        return "secondary"
      case "Low":
        return "outline"
      default:
        return "outline"
    }
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div className="space-y-2">
          <div className="flex items-center space-x-3">
            <h1 className="text-3xl font-bold text-foreground">{project.name}</h1>
            <Badge className={getStatusColor(project.status)}>{project.status}</Badge>
            <Badge variant={getPriorityColor(project.priority)}>{project.priority} Priority</Badge>
          </div>
          <p className="text-muted-foreground">{project.description}</p>
        </div>
        <div className="flex space-x-2">
          <Button variant="outline">
            <Settings className="w-4 h-4 mr-2" />
            Settings
          </Button>
          <Button>
            <Activity className="w-4 h-4 mr-2" />
            View Activity
          </Button>
        </div>
      </div>

      {/* Progress Overview */}
      <Card>
        <CardHeader>
          <CardTitle>Project Progress</CardTitle>
          <CardDescription>Overall completion status and key metrics</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span>Overall Progress</span>
              <span>{project.progress}%</span>
            </div>
            <Progress value={project.progress} className="h-3" />
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
            <div className="text-center">
              <div className="text-2xl font-bold text-foreground">{project.completedTasks}</div>
              <div className="text-sm text-muted-foreground">Tasks Completed</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-foreground">{project.totalTasks - project.completedTasks}</div>
              <div className="text-sm text-muted-foreground">Tasks Remaining</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-foreground">{project.suppliers}</div>
              <div className="text-sm text-muted-foreground">Suppliers Involved</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-foreground">{project.team}</div>
              <div className="text-sm text-muted-foreground">Team Members</div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Project Details Tabs */}
      <Tabs defaultValue="overview" className="space-y-4">
        <TabsList>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="tasks">Tasks</TabsTrigger>
          <TabsTrigger value="suppliers">Suppliers</TabsTrigger>
          <TabsTrigger value="documents">Documents</TabsTrigger>
          <TabsTrigger value="team">Team</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-4">
          <div className="grid gap-6 md:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle>Project Timeline</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center space-x-2">
                  <Calendar className="w-4 h-4 text-muted-foreground" />
                  <span className="text-sm">Due Date: {new Date(project.dueDate).toLocaleDateString()}</span>
                </div>
                <div className="space-y-2">
                  <div className="text-sm font-medium">Key Milestones</div>
                  <div className="space-y-1 text-sm text-muted-foreground">
                    <div>• Initial supplier assessment - Completed</div>
                    <div>• Document collection - In Progress</div>
                    <div>• Compliance verification - Pending</div>
                    <div>• Final audit report - Pending</div>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Recent Activity</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="text-sm">
                  <div className="font-medium">Document uploaded</div>
                  <div className="text-muted-foreground">ISO 9001 certificate for Supplier ABC</div>
                  <div className="text-xs text-muted-foreground">2 hours ago</div>
                </div>
                <div className="text-sm">
                  <div className="font-medium">Task completed</div>
                  <div className="text-muted-foreground">DURC verification for 5 suppliers</div>
                  <div className="text-xs text-muted-foreground">1 day ago</div>
                </div>
                <div className="text-sm">
                  <div className="font-medium">Team member added</div>
                  <div className="text-muted-foreground">Maria Rossi joined the project</div>
                  <div className="text-xs text-muted-foreground">3 days ago</div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="tasks">
          <Card>
            <CardHeader>
              <CardTitle>Project Tasks</CardTitle>
              <CardDescription>Track progress on individual project tasks</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="text-center py-8 text-muted-foreground">
                <FileText className="w-12 h-12 mx-auto mb-4 opacity-50" />
                <p>Task management interface will be implemented here</p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="suppliers">
          <Card>
            <CardHeader>
              <CardTitle>Project Suppliers</CardTitle>
              <CardDescription>Suppliers involved in this project</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="text-center py-8 text-muted-foreground">
                <Users className="w-12 h-12 mx-auto mb-4 opacity-50" />
                <p>Supplier list and status will be displayed here</p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="documents">
          <Card>
            <CardHeader>
              <CardTitle>Project Documents</CardTitle>
              <CardDescription>Documents and files related to this project</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="text-center py-8 text-muted-foreground">
                <FileText className="w-12 h-12 mx-auto mb-4 opacity-50" />
                <p>Document management interface will be implemented here</p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="team">
          <Card>
            <CardHeader>
              <CardTitle>Project Team</CardTitle>
              <CardDescription>Team members working on this project</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="text-center py-8 text-muted-foreground">
                <Users className="w-12 h-12 mx-auto mb-4 opacity-50" />
                <p>Team management interface will be implemented here</p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}
