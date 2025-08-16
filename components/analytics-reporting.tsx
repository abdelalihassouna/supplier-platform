"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Progress } from "@/components/ui/progress"
import { Alert, AlertDescription } from "@/components/ui/alert"
import {
  LineChart,
  Line,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  AreaChart,
  Area,
} from "recharts"
import {
  TrendingUp,
  TrendingDown,
  BarChart3,
  PieChartIcon,
  Download,
  AlertTriangle,
  CheckCircle,
  Clock,
  Target,
  Users,
  FileText,
  Shield,
  Zap,
} from "lucide-react"
import { cn } from "@/lib/utils"

// Mock analytics data
const kpiData = {
  totalSuppliers: { value: 1247, change: 12, trend: "up" },
  qualifiedSuppliers: { value: 892, change: 8, trend: "up" },
  qualificationRate: { value: 71.5, change: -2.3, trend: "down" },
  avgProcessingTime: { value: 14.2, change: -18, trend: "up" },
  complianceScore: { value: 94.2, change: 3.1, trend: "up" },
  documentsProcessed: { value: 3456, change: 22, trend: "up" },
}

const monthlyTrends = [
  { month: "Jan", qualified: 65, processing: 18.5, compliance: 91.2 },
  { month: "Feb", qualified: 68, processing: 17.2, compliance: 92.1 },
  { month: "Mar", qualified: 72, processing: 16.8, compliance: 93.5 },
  { month: "Apr", qualified: 69, processing: 15.9, compliance: 93.8 },
  { month: "May", qualified: 74, processing: 14.7, compliance: 94.2 },
  { month: "Jun", qualified: 71, processing: 14.2, compliance: 94.2 },
]

const supplierStatusDistribution = [
  { name: "Qualified Q1", value: 156, color: "#8b5cf6" },
  { name: "Completed", value: 892, color: "#10b981" },
  { name: "In Progress", value: 234, color: "#3b82f6" },
  { name: "Pending", value: 53, color: "#f59e0b" },
  { name: "Error", value: 23, color: "#ef4444" },
  { name: "Not Started", value: 45, color: "#6b7280" },
]

const certificationTypes = [
  { type: "DURC", total: 1247, valid: 1156, expiring: 67, expired: 24 },
  { type: "ISO 9001", total: 892, valid: 834, expiring: 43, expired: 15 },
  { type: "SOA", total: 678, valid: 612, expiring: 52, expired: 14 },
  { type: "White List", total: 445, valid: 423, expiring: 18, expired: 4 },
  { type: "ISO 14001", total: 234, valid: 218, expiring: 12, expired: 4 },
]

const processingEfficiency = [
  { week: "Week 1", automated: 85, manual: 15, avgTime: 12.3 },
  { week: "Week 2", automated: 88, manual: 12, avgTime: 11.8 },
  { week: "Week 3", automated: 91, manual: 9, avgTime: 10.5 },
  { week: "Week 4", automated: 89, manual: 11, avgTime: 11.2 },
]

const complianceAlerts = [
  {
    id: "alert-001",
    type: "document_expiring",
    severity: "high",
    title: "67 DURC Certificates Expiring",
    description: "67 DURC certificates will expire within 30 days",
    affectedSuppliers: 67,
    dueDate: "2024-02-15T00:00:00Z",
  },
  {
    id: "alert-002",
    type: "regulatory_change",
    severity: "medium",
    title: "New ISO 9001:2024 Standard",
    description: "New ISO 9001:2024 standard requirements effective March 2024",
    affectedSuppliers: 892,
    dueDate: "2024-03-01T00:00:00Z",
  },
  {
    id: "alert-003",
    type: "compliance_issue",
    severity: "high",
    title: "SOA Certification Gaps",
    description: "52 suppliers have SOA certificates expiring soon",
    affectedSuppliers: 52,
    dueDate: "2024-01-31T00:00:00Z",
  },
]

const detailedReports = [
  {
    id: "report-001",
    name: "Q1 2024 Supplier Audit Report",
    description: "Comprehensive audit results for Q1 2024",
    type: "audit",
    generatedDate: "2024-01-15T10:00:00Z",
    suppliers: 45,
    status: "completed",
  },
  {
    id: "report-002",
    name: "ISO 9001 Migration Status",
    description: "Current status of ISO 9001 migration project",
    type: "certification",
    generatedDate: "2024-01-12T14:30:00Z",
    suppliers: 78,
    status: "in_progress",
  },
  {
    id: "report-003",
    name: "Compliance Monitoring Dashboard",
    description: "Monthly compliance monitoring report",
    type: "compliance",
    generatedDate: "2024-01-10T09:00:00Z",
    suppliers: 1247,
    status: "completed",
  },
]

export function AnalyticsReporting() {
  const [activeTab, setActiveTab] = useState("overview")
  const [timeRange, setTimeRange] = useState("6months")

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("it-IT", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    })
  }

  const getAlertColor = (severity: string) => {
    switch (severity) {
      case "high":
        return "border-red-200 bg-red-50 text-red-800"
      case "medium":
        return "border-yellow-200 bg-yellow-50 text-yellow-800"
      case "low":
        return "border-blue-200 bg-blue-50 text-blue-800"
      default:
        return "border-gray-200 bg-gray-50 text-gray-800"
    }
  }

  const getTrendIcon = (trend: string, change: number) => {
    if (trend === "up") {
      return <TrendingUp className="w-4 h-4 text-green-600" />
    } else {
      return <TrendingDown className="w-4 h-4 text-red-600" />
    }
  }

  const getTrendColor = (trend: string) => {
    return trend === "up" ? "text-green-600" : "text-red-600"
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Analytics & Reporting</h1>
          <p className="text-muted-foreground">Comprehensive insights and performance metrics</p>
        </div>
        <div className="flex items-center space-x-2">
          <Select value={timeRange} onValueChange={setTimeRange}>
            <SelectTrigger className="w-40">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="1month">Last Month</SelectItem>
              <SelectItem value="3months">Last 3 Months</SelectItem>
              <SelectItem value="6months">Last 6 Months</SelectItem>
              <SelectItem value="1year">Last Year</SelectItem>
            </SelectContent>
          </Select>
          <Button variant="outline">
            <Download className="w-4 h-4 mr-2" />
            Export Report
          </Button>
        </div>
      </div>

      {/* Main Content Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="overview">Executive Overview</TabsTrigger>
          <TabsTrigger value="performance">Performance Metrics</TabsTrigger>
          <TabsTrigger value="compliance">Compliance Monitoring</TabsTrigger>
          <TabsTrigger value="reports">Detailed Reports</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-6">
          {/* KPI Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">Total Suppliers</p>
                    <p className="text-2xl font-bold">{kpiData.totalSuppliers.value.toLocaleString()}</p>
                    <div className="flex items-center mt-1">
                      {getTrendIcon(kpiData.totalSuppliers.trend, kpiData.totalSuppliers.change)}
                      <span className={cn("text-sm ml-1", getTrendColor(kpiData.totalSuppliers.trend))}>
                        {kpiData.totalSuppliers.change > 0 ? "+" : ""}
                        {kpiData.totalSuppliers.change}%
                      </span>
                    </div>
                  </div>
                  <Users className="w-8 h-8 text-primary" />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">Qualified Suppliers</p>
                    <p className="text-2xl font-bold">{kpiData.qualifiedSuppliers.value.toLocaleString()}</p>
                    <div className="flex items-center mt-1">
                      {getTrendIcon(kpiData.qualifiedSuppliers.trend, kpiData.qualifiedSuppliers.change)}
                      <span className={cn("text-sm ml-1", getTrendColor(kpiData.qualifiedSuppliers.trend))}>
                        {kpiData.qualifiedSuppliers.change > 0 ? "+" : ""}
                        {kpiData.qualifiedSuppliers.change}%
                      </span>
                    </div>
                  </div>
                  <CheckCircle className="w-8 h-8 text-green-600" />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">Qualification Rate</p>
                    <p className="text-2xl font-bold">{kpiData.qualificationRate.value}%</p>
                    <div className="flex items-center mt-1">
                      {getTrendIcon(kpiData.qualificationRate.trend, kpiData.qualificationRate.change)}
                      <span className={cn("text-sm ml-1", getTrendColor(kpiData.qualificationRate.trend))}>
                        {kpiData.qualificationRate.change > 0 ? "+" : ""}
                        {kpiData.qualificationRate.change}%
                      </span>
                    </div>
                  </div>
                  <Target className="w-8 h-8 text-primary" />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">Avg Processing Time</p>
                    <p className="text-2xl font-bold">{kpiData.avgProcessingTime.value} days</p>
                    <div className="flex items-center mt-1">
                      {getTrendIcon(kpiData.avgProcessingTime.trend, kpiData.avgProcessingTime.change)}
                      <span className={cn("text-sm ml-1", getTrendColor(kpiData.avgProcessingTime.trend))}>
                        {kpiData.avgProcessingTime.change > 0 ? "+" : ""}
                        {kpiData.avgProcessingTime.change}%
                      </span>
                    </div>
                  </div>
                  <Clock className="w-8 h-8 text-primary" />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">Compliance Score</p>
                    <p className="text-2xl font-bold">{kpiData.complianceScore.value}%</p>
                    <div className="flex items-center mt-1">
                      {getTrendIcon(kpiData.complianceScore.trend, kpiData.complianceScore.change)}
                      <span className={cn("text-sm ml-1", getTrendColor(kpiData.complianceScore.trend))}>
                        {kpiData.complianceScore.change > 0 ? "+" : ""}
                        {kpiData.complianceScore.change}%
                      </span>
                    </div>
                  </div>
                  <Shield className="w-8 h-8 text-green-600" />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">Documents Processed</p>
                    <p className="text-2xl font-bold">{kpiData.documentsProcessed.value.toLocaleString()}</p>
                    <div className="flex items-center mt-1">
                      {getTrendIcon(kpiData.documentsProcessed.trend, kpiData.documentsProcessed.change)}
                      <span className={cn("text-sm ml-1", getTrendColor(kpiData.documentsProcessed.trend))}>
                        {kpiData.documentsProcessed.change > 0 ? "+" : ""}
                        {kpiData.documentsProcessed.change}%
                      </span>
                    </div>
                  </div>
                  <FileText className="w-8 h-8 text-primary" />
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Charts */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Monthly Trends */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <BarChart3 className="w-5 h-5 mr-2" />
                  Monthly Trends
                </CardTitle>
                <CardDescription>Qualification rates and processing times over time</CardDescription>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <LineChart data={monthlyTrends}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="month" />
                    <YAxis />
                    <Tooltip />
                    <Legend />
                    <Line type="monotone" dataKey="qualified" stroke="#8b5cf6" name="Qualification Rate %" />
                    <Line type="monotone" dataKey="processing" stroke="#3b82f6" name="Processing Time (days)" />
                  </LineChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            {/* Supplier Status Distribution */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <PieChartIcon className="w-5 h-5 mr-2" />
                  Supplier Status Distribution
                </CardTitle>
                <CardDescription>Current status breakdown of all suppliers</CardDescription>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <PieChart>
                    <Pie
                      data={supplierStatusDistribution}
                      cx="50%"
                      cy="50%"
                      labelLine={false}
                      label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                      outerRadius={80}
                      fill="#8884d8"
                      dataKey="value"
                    >
                      {supplierStatusDistribution.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="performance" className="space-y-6">
          {/* Processing Efficiency */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <Zap className="w-5 h-5 mr-2" />
                Processing Efficiency
              </CardTitle>
              <CardDescription>Automated vs manual processing and average processing times</CardDescription>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <AreaChart data={processingEfficiency}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="week" />
                  <YAxis />
                  <Tooltip />
                  <Legend />
                  <Area
                    type="monotone"
                    dataKey="automated"
                    stackId="1"
                    stroke="#10b981"
                    fill="#10b981"
                    name="Automated %"
                  />
                  <Area type="monotone" dataKey="manual" stackId="1" stroke="#f59e0b" fill="#f59e0b" name="Manual %" />
                </AreaChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          {/* Certification Status Overview */}
          <Card>
            <CardHeader>
              <CardTitle>Certification Status Overview</CardTitle>
              <CardDescription>Status breakdown by certification type</CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Certification Type</TableHead>
                    <TableHead>Total</TableHead>
                    <TableHead>Valid</TableHead>
                    <TableHead>Expiring Soon</TableHead>
                    <TableHead>Expired</TableHead>
                    <TableHead>Compliance Rate</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {certificationTypes.map((cert) => (
                    <TableRow key={cert.type}>
                      <TableCell className="font-medium">{cert.type}</TableCell>
                      <TableCell>{cert.total}</TableCell>
                      <TableCell>
                        <div className="flex items-center">
                          <CheckCircle className="w-4 h-4 mr-1 text-green-600" />
                          {cert.valid}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center">
                          <AlertTriangle className="w-4 h-4 mr-1 text-yellow-600" />
                          {cert.expiring}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center">
                          <Clock className="w-4 h-4 mr-1 text-red-600" />
                          {cert.expired}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center space-x-2">
                          <Progress value={(cert.valid / cert.total) * 100} className="w-16 h-2" />
                          <span className="text-sm">{Math.round((cert.valid / cert.total) * 100)}%</span>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="compliance" className="space-y-6">
          {/* Compliance Alerts */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <AlertTriangle className="w-5 h-5 mr-2" />
                Compliance Alerts
              </CardTitle>
              <CardDescription>Active compliance issues requiring attention</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {complianceAlerts.map((alert) => (
                  <Alert key={alert.id} className={getAlertColor(alert.severity)}>
                    <AlertTriangle className="h-4 w-4" />
                    <AlertDescription>
                      <div className="space-y-2">
                        <div className="flex items-center justify-between">
                          <strong>{alert.title}</strong>
                          <Badge variant="outline" className={cn("text-xs", getAlertColor(alert.severity))}>
                            {alert.severity} priority
                          </Badge>
                        </div>
                        <p>{alert.description}</p>
                        <div className="flex items-center justify-between text-sm">
                          <span>Affected suppliers: {alert.affectedSuppliers}</span>
                          <span>Due: {formatDate(alert.dueDate)}</span>
                        </div>
                      </div>
                    </AlertDescription>
                  </Alert>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Compliance Trends */}
          <Card>
            <CardHeader>
              <CardTitle>Compliance Score Trends</CardTitle>
              <CardDescription>Overall compliance performance over time</CardDescription>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <LineChart data={monthlyTrends}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="month" />
                  <YAxis domain={[85, 100]} />
                  <Tooltip />
                  <Legend />
                  <Line
                    type="monotone"
                    dataKey="compliance"
                    stroke="#10b981"
                    name="Compliance Score %"
                    strokeWidth={3}
                  />
                </LineChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="reports" className="space-y-6">
          {/* Report Generation */}
          <Card>
            <CardHeader>
              <CardTitle>Generate New Report</CardTitle>
              <CardDescription>Create custom reports for audit and compliance purposes</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <Select>
                  <SelectTrigger>
                    <SelectValue placeholder="Report Type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="audit">Audit Report</SelectItem>
                    <SelectItem value="compliance">Compliance Report</SelectItem>
                    <SelectItem value="performance">Performance Report</SelectItem>
                    <SelectItem value="certification">Certification Status</SelectItem>
                  </SelectContent>
                </Select>
                <Select>
                  <SelectTrigger>
                    <SelectValue placeholder="Time Period" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="last_month">Last Month</SelectItem>
                    <SelectItem value="last_quarter">Last Quarter</SelectItem>
                    <SelectItem value="last_year">Last Year</SelectItem>
                    <SelectItem value="custom">Custom Range</SelectItem>
                  </SelectContent>
                </Select>
                <Button>
                  <Download className="w-4 h-4 mr-2" />
                  Generate Report
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Available Reports */}
          <Card>
            <CardHeader>
              <CardTitle>Available Reports</CardTitle>
              <CardDescription>Previously generated reports ready for download</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {detailedReports.map((report) => (
                  <div key={report.id} className="flex items-center justify-between p-4 border rounded-lg">
                    <div className="space-y-1">
                      <h4 className="font-medium">{report.name}</h4>
                      <p className="text-sm text-muted-foreground">{report.description}</p>
                      <div className="flex items-center space-x-4 text-sm text-muted-foreground">
                        <span>Type: {report.type}</span>
                        <span>Suppliers: {report.suppliers}</span>
                        <span>Generated: {formatDate(report.generatedDate)}</span>
                      </div>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Badge
                        variant="outline"
                        className={cn(
                          "text-xs",
                          report.status === "completed" ? "text-green-600 bg-green-100" : "text-blue-600 bg-blue-100",
                        )}
                      >
                        {report.status}
                      </Badge>
                      <Button variant="ghost" size="sm">
                        <Download className="w-4 h-4" />
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
