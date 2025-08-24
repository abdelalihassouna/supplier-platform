"use client"

import { useState, useEffect } from "react"
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
  Calendar,
  XCircle
} from "lucide-react"
import { cn } from "@/lib/utils"

// Analytics data interface
interface AnalyticsData {
  processingEfficiency: any[];
  certificationStatus: any[];
  kpis: any;
  recentActivity: any[];
  complianceAlerts: any[];
  complianceTrends: any[];
  documentStatus: any[];
  timeRange: string;
  generatedAt: string;
  workflowTiming?: {
    kpis: {
      total_runs: number;
      completed_runs: number;
      avg_run_duration_seconds: number;
      p95_run_duration_seconds: number;
      avg_steps_per_run: number;
    };
    throughput: Array<{
      week_label: string;
      runs_count: number;
      avg_run_duration_seconds: number;
    }>;
    steps: Array<{
      step_key: string;
      name: string;
      total: number;
      pass_count: number;
      fail_count: number;
      avg_duration_seconds: number;
      p95_duration_seconds: number;
    }>;
  };
}

// Default/loading data
const defaultKpiData = {
  totalSuppliers: { value: 0, change: 0, trend: "up" },
  qualifiedSuppliers: { value: 0, change: 0, trend: "up" },
  qualificationRate: { value: 0, change: 0, trend: "down" },
  avgProcessingTime: { value: 0, change: 0, trend: "up" },
  complianceScore: { value: 0, change: 0, trend: "up" },
  documentsProcessed: { value: 0, change: 0, trend: "up" },
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

// Mock data for fallback
const fallbackProcessingEfficiency = [
  { week_label: "Week 1", ocr_success_rate: 85, ai_verification_rate: 78, avg_ocr_time_seconds: 12.3 },
  { week_label: "Week 2", ocr_success_rate: 88, ai_verification_rate: 82, avg_ocr_time_seconds: 11.8 },
  { week_label: "Week 3", ocr_success_rate: 91, ai_verification_rate: 85, avg_ocr_time_seconds: 10.5 },
  { week_label: "Week 4", ocr_success_rate: 89, ai_verification_rate: 83, avg_ocr_time_seconds: 11.2 },
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
  const [analyticsData, setAnalyticsData] = useState<AnalyticsData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Fetch analytics data
  const fetchAnalyticsData = async () => {
    try {
      setLoading(true)
      setError(null)
      const response = await fetch(`/api/analytics?timeRange=${timeRange}`)
      if (!response.ok) {
        throw new Error('Failed to fetch analytics data')
      }
      const result = await response.json()
      if (result.success) {
        setAnalyticsData(result.data)
      } else {
        throw new Error(result.error || 'Unknown error')
      }
    } catch (err) {
      console.error('Analytics fetch error:', err)
      setError(err instanceof Error ? err.message : 'Failed to load analytics')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchAnalyticsData()
  }, [timeRange])

  // Transform API data to component format
  const getKpiData = () => {
    if (!analyticsData?.kpis) return defaultKpiData
    
    const kpis = analyticsData.kpis
    return {
      totalSuppliers: { 
        value: kpis.total_suppliers || 0, 
        change: 0, 
        trend: "up" 
      },
      qualifiedSuppliers: { 
        value: Math.round((kpis.total_suppliers || 0) * (kpis.verification_pass_rate || 0) / 100), 
        change: 0, 
        trend: "up" 
      },
      qualificationRate: { 
        value: kpis.verification_pass_rate || 0, 
        change: kpis.ocr_success_rate_change || 0, 
        trend: (kpis.ocr_success_rate_change || 0) >= 0 ? "up" : "down" 
      },
      avgProcessingTime: { 
        value: kpis.avg_ocr_time_seconds || 0, 
        change: 0, 
        trend: "up" 
      },
      complianceScore: { 
        value: kpis.ocr_success_rate || 0, 
        change: kpis.ocr_success_rate_change || 0, 
        trend: (kpis.ocr_success_rate_change || 0) >= 0 ? "up" : "down" 
      },
      documentsProcessed: { 
        value: kpis.total_documents_processed || 0, 
        change: kpis.documents_processed_change || 0, 
        trend: (kpis.documents_processed_change || 0) >= 0 ? "up" : "down" 
      },
    }
  }

  const kpiData = getKpiData()

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("it-IT", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    })
  }

  const formatSeconds = (seconds?: number) => {
    if (seconds === undefined || seconds === null) return "-"
    if (seconds < 1) return `${Math.round(seconds * 1000)}ms`
    if (seconds < 10) return `${seconds.toFixed(1)}s`
    if (seconds < 60) return `${Math.round(seconds)}s`
    const m = Math.floor(seconds / 60)
    const s = Math.round(seconds % 60)
    return `${m}m ${s}s`
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
                    <p className="text-2xl font-bold">{formatSeconds(kpiData.avgProcessingTime.value)}</p>
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
                      label={({ name, percent }) => `${name} ${percent ? (percent * 100).toFixed(0) : 0}%`}
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
          {loading && (
            <Card>
              <CardContent className="p-8 text-center">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
                <p>Loading analytics data...</p>
              </CardContent>
            </Card>
          )}
          
          {error && (
            <Card>
              <CardContent className="p-8">
                <Alert>
                  <AlertTriangle className="h-4 w-4" />
                  <AlertDescription>
                    Error loading analytics: {error}
                    <Button variant="outline" size="sm" onClick={fetchAnalyticsData} className="ml-4">
                      Retry
                    </Button>
                  </AlertDescription>
                </Alert>
              </CardContent>
            </Card>
          )}

          {!loading && !error && (
            <>
              {/* Processing Efficiency Metrics */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <Card>
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm text-muted-foreground">OCR Success Rate</p>
                        <p className="text-2xl font-bold">{analyticsData?.kpis?.ocr_success_rate || 0}%</p>
                        <div className="flex items-center mt-1">
                          <TrendingUp className="w-4 h-4 text-green-600" />
                          <span className="text-sm ml-1 text-green-600">Processing</span>
                        </div>
                      </div>
                      <Zap className="w-8 h-8 text-primary" />
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm text-muted-foreground">AI Verification Rate</p>
                        <p className="text-2xl font-bold">{analyticsData?.kpis?.ai_verification_rate || 0}%</p>
                        <div className="flex items-center mt-1">
                          <TrendingUp className="w-4 h-4 text-blue-600" />
                          <span className="text-sm ml-1 text-blue-600">Automated</span>
                        </div>
                      </div>
                      <Shield className="w-8 h-8 text-blue-600" />
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm text-muted-foreground">Verification Pass Rate</p>
                        <p className="text-2xl font-bold">{analyticsData?.kpis?.verification_pass_rate || 0}%</p>
                        <div className="flex items-center mt-1">
                          <CheckCircle className="w-4 h-4 text-green-600" />
                          <span className="text-sm ml-1 text-green-600">Quality</span>
                        </div>
                      </div>
                      <Target className="w-8 h-8 text-green-600" />
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm text-muted-foreground">Avg Processing Time</p>
                        <p className="text-2xl font-bold">{formatSeconds(analyticsData?.kpis?.avg_ocr_time_seconds)}</p>
                        <div className="flex items-center mt-1">
                          <Clock className="w-4 h-4 text-primary" />
                          <span className="text-sm ml-1 text-muted-foreground">Per document</span>
                        </div>
                      </div>
                      <Clock className="w-8 h-8 text-primary" />
                    </div>
                  </CardContent>
                </Card>
              </div>
              {/* Processing Efficiency Chart */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center">
                    <Zap className="w-5 h-5 mr-2" />
                    Processing Efficiency Trends
                  </CardTitle>
                  <CardDescription>OCR success rate and AI verification rate over time</CardDescription>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={300}>
                    <LineChart data={analyticsData?.processingEfficiency || fallbackProcessingEfficiency}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="week_label" />
                      <YAxis domain={[0, 100]} />
                      <Tooltip />
                      <Legend />
                      <Line
                        type="monotone"
                        dataKey="ocr_success_rate"
                        stroke="#10b981"
                        strokeWidth={3}
                        name="OCR Success Rate %"
                      />
                      <Line
                        type="monotone"
                        dataKey="ai_verification_rate"
                        stroke="#3b82f6"
                        strokeWidth={3}
                        name="AI Verification Rate %"
                      />
                    </LineChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>

              {/* Bulk Verification Timing */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
                <Card>
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm text-muted-foreground">Total Runs</p>
                        <p className="text-2xl font-bold">{analyticsData?.workflowTiming?.kpis?.total_runs || 0}</p>
                      </div>
                      <BarChart3 className="w-8 h-8 text-primary" />
                    </div>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm text-muted-foreground">Completed Runs</p>
                        <p className="text-2xl font-bold">{analyticsData?.workflowTiming?.kpis?.completed_runs || 0}</p>
                      </div>
                      <CheckCircle className="w-8 h-8 text-green-600" />
                    </div>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm text-muted-foreground">Avg Run Duration</p>
                        <p className="text-2xl font-bold">{formatSeconds(analyticsData?.workflowTiming?.kpis?.avg_run_duration_seconds)}</p>
                      </div>
                      <Clock className="w-8 h-8 text-primary" />
                    </div>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm text-muted-foreground">P95 Run Duration</p>
                        <p className="text-2xl font-bold">{formatSeconds(analyticsData?.workflowTiming?.kpis?.p95_run_duration_seconds)}</p>
                      </div>
                      <Clock className="w-8 h-8 text-muted-foreground" />
                    </div>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm text-muted-foreground">Avg Steps / Run</p>
                        <p className="text-2xl font-bold">{analyticsData?.workflowTiming?.kpis?.avg_steps_per_run || 0}</p>
                      </div>
                      <Target className="w-8 h-8 text-primary" />
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* Workflow Throughput & Duration */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center">
                    <Zap className="w-5 h-5 mr-2" />
                    Bulk Workflow Throughput
                  </CardTitle>
                  <CardDescription>Runs per week and average duration</CardDescription>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={300}>
                    <LineChart data={analyticsData?.workflowTiming?.throughput || []}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="week_label" />
                      <YAxis yAxisId="left" orientation="left" />
                      <YAxis yAxisId="right" orientation="right" />
                      <Tooltip formatter={(value: number, name: string, entry: any) => {
                        const key = entry?.dataKey || name
                        const isDuration = key === 'avg_run_duration_seconds' || name === 'Avg Duration'
                        return isDuration ? [formatSeconds(value), 'Avg Duration'] : [value, 'Runs']
                      }} />
                      <Legend />
                      <Line yAxisId="left" type="monotone" dataKey="runs_count" stroke="#3b82f6" strokeWidth={3} name="Runs" />
                      <Line yAxisId="right" type="monotone" dataKey="avg_run_duration_seconds" stroke="#10b981" strokeWidth={3} name="Avg Duration" />
                    </LineChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>

              {/* Step Timing Metrics */}
              <Card>
                <CardHeader>
                  <CardTitle>Step Timing Metrics</CardTitle>
                  <CardDescription>Average and P95 duration per step</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead>
                        <tr className="border-b">
                          <th className="text-left p-2">Step</th>
                          <th className="text-left p-2">Total</th>
                          <th className="text-left p-2">Pass</th>
                          <th className="text-left p-2">Fail</th>
                          <th className="text-left p-2">Avg</th>
                          <th className="text-left p-2">P95</th>
                        </tr>
                      </thead>
                      <tbody>
                        {(analyticsData?.workflowTiming?.steps || []).map((s: any, idx: number) => (
                          <tr key={idx} className="border-b">
                            <td className="p-2 font-medium">{s.name || s.step_key}</td>
                            <td className="p-2">{s.total}</td>
                            <td className="p-2 text-green-600">{s.pass_count}</td>
                            <td className="p-2 text-red-600">{s.fail_count}</td>
                            <td className="p-2">{formatSeconds(s.avg_duration_seconds)}</td>
                            <td className="p-2">{formatSeconds(s.p95_duration_seconds)}</td>
                          </tr>
                        ))}
                        {(!analyticsData?.workflowTiming?.steps || analyticsData.workflowTiming.steps.length === 0) && (
                          <tr>
                            <td className="p-4 text-center text-muted-foreground" colSpan={6}>No workflow step data available</td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                </CardContent>
              </Card>

              {/* Certification Status Overview */}
              <Card>
                <CardHeader>
                  <CardTitle>Document Status Overview</CardTitle>
                  <CardDescription>Current status of all supplier documents</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead>
                        <tr className="border-b">
                          <th className="text-left p-2">Document Type</th>
                          <th className="text-left p-2">Total</th>
                          <th className="text-left p-2">Valid</th>
                          <th className="text-left p-2">Issues</th>
                          <th className="text-left p-2">Failed</th>
                          <th className="text-left p-2">Pending</th>
                          <th className="text-left p-2">Status</th>
                        </tr>
                      </thead>
                      <tbody>
                        {(analyticsData?.documentStatus || []).map((doc: any, index: number) => {
                          const validRate = doc.total > 0 ? (doc.valid / doc.total) * 100 : 0;
                          const status = validRate >= 90 ? 'Good' : validRate >= 70 ? 'Warning' : 'Critical';
                          
                          return (
                            <tr key={index} className="border-b">
                              <td className="p-2 font-medium">{doc.doc_type}</td>
                              <td className="p-2">{doc.total}</td>
                              <td className="p-2 text-green-600">{doc.valid}</td>
                              <td className="p-2 text-yellow-600">{doc.issues}</td>
                              <td className="p-2 text-red-600">{doc.failed}</td>
                              <td className="p-2 text-blue-600">{doc.pending}</td>
                              <td className="p-2">
                                <Badge variant={status === 'Good' ? 'default' : status === 'Warning' ? 'outline' : 'destructive'}>
                                  {status}
                                </Badge>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                    {(!analyticsData?.documentStatus || analyticsData.documentStatus.length === 0) && (
                      <div className="text-center py-8 text-muted-foreground">
                        <FileText className="h-12 w-12 mx-auto mb-4" />
                        <p>No document data available</p>
                        <p className="text-sm">Run a supplier sync to populate document status</p>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>

              {/* Recent Processing Activity */}
              <Card>
                <CardHeader>
                  <CardTitle>Recent Processing Activity</CardTitle>
                  <CardDescription>Latest document processing results (last 24 hours)</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3 max-h-96 overflow-y-auto">
                    {(analyticsData?.recentActivity || []).slice(0, 10).map((activity: any, index: number) => (
                      <div key={index} className="flex items-center justify-between p-3 border rounded-lg">
                        <div className="flex items-center space-x-3">
                          <div className={cn(
                            "w-3 h-3 rounded-full",
                            activity.verification_status === 'completed' && activity.verification_result === 'match' 
                              ? "bg-green-500" 
                              : activity.verification_status === 'completed' && activity.verification_result !== 'match'
                              ? "bg-yellow-500"
                              : activity.analysis_status === 'completed'
                              ? "bg-blue-500"
                              : activity.analysis_status === 'failed'
                              ? "bg-red-500"
                              : "bg-gray-500"
                          )} />
                          <div>
                            <p className="font-medium">{activity.doc_type} - {activity.filename}</p>
                            <p className="text-sm text-muted-foreground">{activity.company_name}</p>
                          </div>
                        </div>
                        <div className="text-right">
                          <Badge variant="outline" className={cn(
                            "text-xs",
                            activity.verification_status === 'completed' && activity.verification_result === 'match'
                              ? "text-green-600 bg-green-100"
                              : activity.verification_status === 'completed' && activity.verification_result !== 'match'
                              ? "text-yellow-600 bg-yellow-100"
                              : activity.analysis_status === 'completed'
                              ? "text-blue-600 bg-blue-100"
                              : "text-gray-600 bg-gray-100"
                          )}>
                            {activity.verification_status === 'completed' 
                              ? (activity.verification_result === 'match' ? 'Verified ✓' : 'Issues Found')
                              : activity.analysis_status === 'completed'
                              ? 'OCR Complete'
                              : activity.analysis_status || 'Processing'
                            }
                          </Badge>
                          <p className="text-xs text-muted-foreground mt-1">
                            {new Date(activity.processed_at).toLocaleString('it-IT')}
                          </p>
                        </div>
                      </div>
                    ))}
                    {(!analyticsData?.recentActivity || analyticsData.recentActivity.length === 0) && (
                      <div className="text-center py-8 text-muted-foreground">
                        No recent processing activity
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            </>
          )}
        </TabsContent>

        <TabsContent value="compliance" className="space-y-6">
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Active Alerts</CardTitle>
                <AlertTriangle className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-red-600">
                  {analyticsData?.complianceAlerts?.length || 0}
                </div>
                <p className="text-xs text-muted-foreground">
                  {analyticsData?.complianceAlerts?.reduce((sum: number, alert: any) => sum + alert.count, 0) || 0} total issues
                </p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Compliance Score</CardTitle>
                <Shield className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-green-600">
                  {analyticsData?.complianceTrends?.at(-1)?.overall_compliance || 0}%
                </div>
                <p className="text-xs text-muted-foreground">Current month average</p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Expiring Soon</CardTitle>
                <Calendar className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-yellow-600">
                  {analyticsData?.complianceAlerts?.find((alert: any) => alert.alert_type === 'expiring_soon')?.count || 0}
                </div>
                <p className="text-xs text-muted-foreground">Next 30 days</p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Non-Compliant</CardTitle>
                <XCircle className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-red-600">
                  {analyticsData?.complianceAlerts?.find((alert: any) => alert.alert_type === 'verification_failed')?.count || 0}
                </div>
                <p className="text-xs text-muted-foreground">Requires attention</p>
              </CardContent>
            </Card>
          </div>

          {/* Compliance Trends */}
          <Card>
            <CardHeader>
              <CardTitle>Compliance Trends</CardTitle>
              <CardDescription>Monthly compliance score over time</CardDescription>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <LineChart data={analyticsData?.complianceTrends || []}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="month_label" />
                  <YAxis domain={[0, 100]} />
                  <Tooltip 
                    formatter={(value: number, name: string) => [
                      `${value}%`, 
                      name === 'overall_compliance' ? 'Overall Compliance' :
                      name === 'processing_compliance' ? 'Processing Compliance' :
                      name === 'verification_compliance' ? 'Verification Compliance' : name
                    ]}
                  />
                  <Line 
                    type="monotone" 
                    dataKey="overall_compliance" 
                    stroke="#10b981" 
                    strokeWidth={2}
                    dot={{ fill: '#10b981' }}
                    name="Overall"
                  />
                  <Line 
                    type="monotone" 
                    dataKey="processing_compliance" 
                    stroke="#3b82f6" 
                    strokeWidth={2}
                    dot={{ fill: '#3b82f6' }}
                    name="Processing"
                  />
                  <Line 
                    type="monotone" 
                    dataKey="verification_compliance" 
                    stroke="#f59e0b" 
                    strokeWidth={2}
                    dot={{ fill: '#f59e0b' }}
                    name="Verification"
                  />
                </LineChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

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
                {(analyticsData?.complianceAlerts || []).map((alert: any, index: number) => (
                  <div key={index} className="flex items-center justify-between p-3 border rounded-lg">
                    <div className="flex items-center space-x-3">
                      <div className={cn(
                        "w-3 h-3 rounded-full",
                        alert.alert_type === 'verification_failed' ? "bg-red-500" :
                        alert.alert_type === 'expiring_soon' ? "bg-yellow-500" :
                        "bg-blue-500"
                      )} />
                      <div>
                        <p className="font-medium">{alert.doc_type}</p>
                        <p className="text-sm text-muted-foreground">{alert.description}</p>
                      </div>
                    </div>
                    <Badge variant={alert.alert_type === 'verification_failed' ? 'destructive' : 'outline'}>
                      {alert.count}
                    </Badge>
                  </div>
                ))}
                {(!analyticsData?.complianceAlerts || analyticsData.complianceAlerts.length === 0) && (
                  <div className="text-center py-8 text-muted-foreground">
                    <Shield className="h-12 w-12 mx-auto mb-4 text-green-500" />
                    <p>No compliance alerts</p>
                    <p className="text-sm">All documents are in good standing</p>
                  </div>
                )}
              </div>
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
                        variant={report.status === "completed" ? 'default' : 'outline'}
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
