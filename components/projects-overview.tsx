"use client"

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Progress } from "@/components/ui/progress"
import { FolderOpen, Calendar, Users, CheckCircle, Clock, Plus, MoreHorizontal } from "lucide-react"
import Link from "next/link"

export function ProjectsOverview() {
  const projects = [
    {
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
      href: "/projects/q1-audit",
    },
    {
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
      href: "/projects/iso-migration",
    },
    {
      id: "durc-automation",
      name: "DURC Automation",
      description: "Automated DURC document verification and renewal tracking",
      status: "Completed",
      progress: 100,
      dueDate: "2024-01-15",
      team: 3,
      suppliers: 120,
      completedTasks: 8,
      totalTasks: 8,
      priority: "Low",
      href: "/projects/durc-automation",
    },
  ]

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
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Projects</h1>
          <p className="text-muted-foreground">Manage supplier certification projects and compliance initiatives</p>
        </div>
        <Button>
          <Plus className="w-4 h-4 mr-2" />
          New Project
        </Button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Projects</CardTitle>
            <FolderOpen className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">3</div>
            <p className="text-xs text-muted-foreground">+1 from last month</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Projects</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">2</div>
            <p className="text-xs text-muted-foreground">Currently in progress</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Suppliers Involved</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">243</div>
            <p className="text-xs text-muted-foreground">Across all projects</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Completion Rate</CardTitle>
            <CheckCircle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">63%</div>
            <p className="text-xs text-muted-foreground">Average across projects</p>
          </CardContent>
        </Card>
      </div>

      {/* Projects List */}
      <div className="space-y-4">
        <h2 className="text-xl font-semibold">All Projects</h2>
        <div className="grid gap-6">
          {projects.map((project) => (
            <Card key={project.id} className="hover:shadow-md transition-shadow">
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div className="space-y-2">
                    <div className="flex items-center space-x-2">
                      <CardTitle className="text-lg">
                        <Link href={project.href} className="hover:text-primary">
                          {project.name}
                        </Link>
                      </CardTitle>
                      <Badge variant={getPriorityColor(project.priority)}>{project.priority}</Badge>
                    </div>
                    <CardDescription>{project.description}</CardDescription>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Badge className={getStatusColor(project.status)}>{project.status}</Badge>
                    <Button variant="ghost" size="sm">
                      <MoreHorizontal className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Progress */}
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span>Progress</span>
                    <span>{project.progress}%</span>
                  </div>
                  <Progress value={project.progress} className="h-2" />
                </div>

                {/* Project Stats */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                  <div className="flex items-center space-x-2">
                    <Calendar className="w-4 h-4 text-muted-foreground" />
                    <span>Due: {new Date(project.dueDate).toLocaleDateString()}</span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Users className="w-4 h-4 text-muted-foreground" />
                    <span>{project.team} team members</span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <FolderOpen className="w-4 h-4 text-muted-foreground" />
                    <span>{project.suppliers} suppliers</span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <CheckCircle className="w-4 h-4 text-muted-foreground" />
                    <span>
                      {project.completedTasks}/{project.totalTasks} tasks
                    </span>
                  </div>
                </div>

                {/* Actions */}
                <div className="flex space-x-2 pt-2">
                  <Link href={project.href}>
                    <Button variant="outline" size="sm">
                      View Details
                    </Button>
                  </Link>
                  <Button variant="ghost" size="sm">
                    Edit Project
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </div>
  )
}
