import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import { Building2, CheckCircle, Clock, AlertTriangle, TrendingUp, Users, FileCheck, Shield } from "lucide-react"

export function DashboardOverview() {
  const stats = [
    {
      title: "Total Suppliers",
      value: "1,247",
      change: "+12%",
      icon: Building2,
      color: "text-blue-600",
    },
    {
      title: "Qualified Suppliers",
      value: "892",
      change: "+8%",
      icon: CheckCircle,
      color: "text-green-600",
    },
    {
      title: "In Progress",
      value: "234",
      change: "+15%",
      icon: Clock,
      color: "text-yellow-600",
    },
    {
      title: "Compliance Issues",
      value: "23",
      change: "-5%",
      icon: AlertTriangle,
      color: "text-red-600",
    },
  ]

  const recentActivity = [
    {
      supplier: "Acme Construction Ltd",
      action: "DURC verification completed",
      status: "success",
      time: "2 hours ago",
    },
    {
      supplier: "TechFlow Solutions",
      action: "ISO 9001 certificate uploaded",
      status: "pending",
      time: "4 hours ago",
    },
    {
      supplier: "Milano Engineering",
      action: "SOA certification expired",
      status: "warning",
      time: "6 hours ago",
    },
  ]

  return (
    <div className="space-y-6">
      {/* Welcome Header */}
      <div className="space-y-2">
        <h1 className="text-3xl font-bold text-foreground">Welcome to Supplier Platform</h1>
        <p className="text-muted-foreground">Empower Your Procurement. Certify with Confidence.</p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {stats.map((stat, index) => (
          <Card key={index}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">{stat.title}</CardTitle>
              <stat.icon className={`w-4 h-4 ${stat.color}`} />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stat.value}</div>
              <p className="text-xs text-muted-foreground">
                <span className="text-green-600">{stat.change}</span> from last month
              </p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Main Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Verification Progress */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="flex items-center">
              <TrendingUp className="w-5 h-5 mr-2" />
              Verification Progress
            </CardTitle>
            <CardDescription>Current status of supplier verification workflows</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span>Q1 2024 Audit</span>
                <span>78% Complete</span>
              </div>
              <Progress value={78} className="h-2" />
            </div>
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span>ISO 9001 Migration</span>
                <span>45% Complete</span>
              </div>
              <Progress value={45} className="h-2" />
            </div>
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span>DURC Renewals</span>
                <span>92% Complete</span>
              </div>
              <Progress value={92} className="h-2" />
            </div>
          </CardContent>
        </Card>

        {/* Quick Actions */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <Shield className="w-5 h-5 mr-2" />
              Quick Actions
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex items-center justify-between p-3 bg-muted rounded-lg">
              <div className="flex items-center">
                <Users className="w-4 h-4 mr-2 text-primary" />
                <span className="text-sm">New Supplier</span>
              </div>
              <Badge variant="secondary">Add</Badge>
            </div>
            <div className="flex items-center justify-between p-3 bg-muted rounded-lg">
              <div className="flex items-center">
                <FileCheck className="w-4 h-4 mr-2 text-primary" />
                <span className="text-sm">Bulk Verify</span>
              </div>
              <Badge variant="secondary">Start</Badge>
            </div>
            <div className="flex items-center justify-between p-3 bg-muted rounded-lg">
              <div className="flex items-center">
                <AlertTriangle className="w-4 h-4 mr-2 text-primary" />
                <span className="text-sm">Review Alerts</span>
              </div>
              <Badge variant="destructive">23</Badge>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Recent Activity */}
      <Card>
        <CardHeader>
          <CardTitle>Recent Activity</CardTitle>
          <CardDescription>Latest updates from your supplier verification workflows</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {recentActivity.map((activity, index) => (
              <div key={index} className="flex items-center justify-between p-4 border rounded-lg">
                <div className="flex items-center space-x-3">
                  <div
                    className={`w-2 h-2 rounded-full ${
                      activity.status === "success"
                        ? "bg-green-500"
                        : activity.status === "warning"
                          ? "bg-yellow-500"
                          : "bg-blue-500"
                    }`}
                  />
                  <div>
                    <p className="font-medium">{activity.supplier}</p>
                    <p className="text-sm text-muted-foreground">{activity.action}</p>
                  </div>
                </div>
                <div className="text-right">
                  <Badge
                    variant={
                      activity.status === "success"
                        ? "default"
                        : activity.status === "warning"
                          ? "destructive"
                          : "secondary"
                    }
                  >
                    {activity.status}
                  </Badge>
                  <p className="text-xs text-muted-foreground mt-1">{activity.time}</p>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
