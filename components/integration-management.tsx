"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Progress } from "@/components/ui/progress"
import { Textarea } from "@/components/ui/textarea"
import {
  CheckCircle,
  XCircle,
  AlertTriangle,
  RefreshCw,
  Settings,
  Activity,
  Clock,
  Database,
  Globe,
  Shield,
  AlertCircle,
  Download,
  TestTube,
  Bell,
  TrendingUp,
  FileText,
  Zap,
  Server,
  Eye,
  Webhook,
  Code,
  Layers,
  Filter,
  ArrowRightLeft,
  Workflow,
  Timer,
} from "lucide-react"
import { JaggaerIntegration } from "./jaggaer-integration"

interface Integration {
  id: string
  name: string
  type: "government" | "erp" | "certification" | "payment" | "compliance"
  status: "connected" | "disconnected" | "error" | "syncing" | "testing"
  lastSync: string
  nextSync: string
  endpoint: string
  description: string
  icon: any
  healthScore: number
  responseTime: number
  uptime: number
  compliance: "compliant" | "warning" | "critical"
}

interface RealTimeMetric {
  timestamp: string
  responseTime: number
  status: "success" | "error"
  integration: string
}

interface WebhookConfig {
  id: string
  name: string
  url: string
  events: string[]
  status: "active" | "inactive" | "error"
  lastTriggered: string
  successRate: number
}

interface DataMapping {
  id: string
  name: string
  sourceField: string
  targetField: string
  transformation: string
  validation: string
}

interface IntegrationDependency {
  id: string
  name: string
  dependsOn: string[]
  status: "satisfied" | "blocked" | "partial"
}

export function IntegrationManagement() {
  const [integrations, setIntegrations] = useState<Integration[]>([
    {
      id: "jaggaer",
      name: "Jaggaer ERP",
      type: "erp",
      status: "connected",
      lastSync: "2024-01-15 14:30",
      nextSync: "2024-01-15 18:30",
      endpoint: "https://api.jaggaer.com/v2",
      description: "Supplier master data synchronization",
      icon: Database,
      healthScore: 98,
      responseTime: 245,
      uptime: 99.8,
      compliance: "compliant",
    },
    {
      id: "durc",
      name: "DURC Verification",
      type: "government",
      status: "connected",
      lastSync: "2024-01-15 12:15",
      nextSync: "2024-01-16 12:15",
      endpoint: "https://servizi.inps.it/durc",
      description: "Italian tax compliance verification",
      icon: Shield,
      healthScore: 95,
      responseTime: 1200,
      uptime: 97.2,
      compliance: "compliant",
    },
    {
      id: "soa",
      name: "SOA Registry",
      type: "certification",
      status: "error",
      lastSync: "2024-01-14 09:45",
      nextSync: "Paused",
      endpoint: "https://www.anticorruzione.it/soa",
      description: "Construction qualification certificates",
      icon: Globe,
      healthScore: 45,
      responseTime: 0,
      uptime: 78.5,
      compliance: "critical",
    },
    {
      id: "whitelist",
      name: "White List ANAC",
      type: "government",
      status: "syncing",
      lastSync: "2024-01-15 15:00",
      nextSync: "2024-01-15 16:00",
      endpoint: "https://www.anticorruzione.it/whitelist",
      description: "Anti-mafia certification verification",
      icon: CheckCircle,
      healthScore: 92,
      responseTime: 850,
      uptime: 96.1,
      compliance: "compliant",
    },
    {
      id: "iso",
      name: "ISO Certification DB",
      type: "certification",
      status: "disconnected",
      lastSync: "2024-01-10 11:20",
      nextSync: "Not scheduled",
      endpoint: "https://www.iso.org/certifications",
      description: "ISO 9001/14001 certificate validation",
      icon: Activity,
      healthScore: 0,
      responseTime: 0,
      uptime: 0,
      compliance: "warning",
    },
    {
      id: "agenzia-entrate",
      name: "Agenzia delle Entrate",
      type: "government",
      status: "connected",
      lastSync: "2024-01-15 13:45",
      nextSync: "2024-01-16 13:45",
      endpoint: "https://telematici.agenziaentrate.gov.it",
      description: "Tax registration and VAT verification",
      icon: FileText,
      healthScore: 89,
      responseTime: 950,
      uptime: 94.7,
      compliance: "compliant",
    },
    {
      id: "inail",
      name: "INAIL Registry",
      type: "compliance",
      status: "connected",
      lastSync: "2024-01-15 11:20",
      nextSync: "2024-01-16 11:20",
      endpoint: "https://servizi.inail.it/api",
      description: "Workplace safety compliance verification",
      icon: Shield,
      healthScore: 91,
      responseTime: 780,
      uptime: 95.3,
      compliance: "compliant",
    },
    {
      id: "camera-commercio",
      name: "Camera di Commercio",
      type: "government",
      status: "testing",
      lastSync: "2024-01-15 10:15",
      nextSync: "2024-01-15 22:15",
      endpoint: "https://www.registroimprese.it/api",
      description: "Business registry and company information",
      icon: Globe,
      healthScore: 87,
      responseTime: 650,
      uptime: 93.8,
      compliance: "warning",
    },
  ])

  const [realTimeMetrics, setRealTimeMetrics] = useState<RealTimeMetric[]>([])
  const [selectedIntegration, setSelectedIntegration] = useState<string>("")

  const [webhooks, setWebhooks] = useState<WebhookConfig[]>([
    {
      id: "supplier-update",
      name: "Supplier Status Update",
      url: "https://your-app.com/webhooks/supplier-update",
      events: ["supplier.verified", "supplier.rejected", "document.expired"],
      status: "active",
      lastTriggered: "2024-01-15 14:45",
      successRate: 98.5,
    },
    {
      id: "compliance-alert",
      name: "Compliance Alert",
      url: "https://your-app.com/webhooks/compliance",
      events: ["compliance.warning", "compliance.critical"],
      status: "active",
      lastTriggered: "2024-01-15 13:20",
      successRate: 100,
    },
  ])

  const [dataMappings, setDataMappings] = useState<DataMapping[]>([
    {
      id: "durc-mapping",
      name: "DURC Response Mapping",
      sourceField: "response.stato_durc",
      targetField: "compliance_status",
      transformation: "map({'REGOLARE': 'compliant', 'IRREGOLARE': 'non_compliant'})",
      validation: "required|in:compliant,non_compliant",
    },
    {
      id: "soa-mapping",
      name: "SOA Certificate Mapping",
      sourceField: "certificato.data_scadenza",
      targetField: "expiry_date",
      transformation: "parseDate(value, 'DD/MM/YYYY')",
      validation: "required|date|after:today",
    },
  ])

  const [dependencies, setDependencies] = useState<IntegrationDependency[]>([
    {
      id: "supplier-verification",
      name: "Complete Supplier Verification",
      dependsOn: ["durc", "soa", "whitelist", "agenzia-entrate"],
      status: "partial",
    },
    {
      id: "qualification-workflow",
      name: "Q1 Qualification Workflow",
      dependsOn: ["supplier-verification", "iso"],
      status: "blocked",
    },
  ])

  useEffect(() => {
    const interval = setInterval(() => {
      const newMetric: RealTimeMetric = {
        timestamp: new Date().toISOString(),
        responseTime: Math.random() * 2000 + 200,
        status: Math.random() > 0.1 ? "success" : "error",
        integration: integrations[Math.floor(Math.random() * integrations.length)].name,
      }
      setRealTimeMetrics((prev) => [...prev.slice(-19), newMetric])
    }, 5000)

    return () => clearInterval(interval)
  }, [integrations])

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "connected":
        return <CheckCircle className="h-4 w-4 text-green-500" />
      case "disconnected":
        return <XCircle className="h-4 w-4 text-gray-400" />
      case "error":
        return <AlertTriangle className="h-4 w-4 text-red-500" />
      case "syncing":
        return <RefreshCw className="h-4 w-4 text-blue-500 animate-spin" />
      case "testing":
        return <TestTube className="h-4 w-4 text-purple-500" />
      default:
        return <AlertCircle className="h-4 w-4 text-yellow-500" />
    }
  }

  const getComplianceColor = (compliance: string) => {
    switch (compliance) {
      case "compliant":
        return "text-green-600 bg-green-100"
      case "warning":
        return "text-yellow-600 bg-yellow-100"
      case "critical":
        return "text-red-600 bg-red-100"
      default:
        return "text-gray-600 bg-gray-100"
    }
  }

  const testIntegration = async (integrationId: string) => {
    setIntegrations((prev) =>
      prev.map((int) => (int.id === integrationId ? { ...int, status: "testing" as const } : int)),
    )

    // Simulate test
    setTimeout(() => {
      setIntegrations((prev) =>
        prev.map((int) =>
          int.id === integrationId
            ? { ...int, status: "connected" as const, healthScore: Math.random() * 20 + 80 }
            : int,
        ),
      )
    }, 3000)
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Integration Management</h1>
          <p className="text-gray-600">Monitor and configure external system connections</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm">
            <Download className="h-4 w-4 mr-2" />
            Export Logs
          </Button>
          <Button variant="outline" size="sm">
            <Bell className="h-4 w-4 mr-2" />
            Alerts
          </Button>
          <Button size="sm">
            <RefreshCw className="h-4 w-4 mr-2" />
            Sync All
          </Button>
        </div>
      </div>

      {/* Enhanced Status Overview */}
      <div className="grid grid-cols-1 md:grid-cols-6 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-green-100 rounded-lg">
                <CheckCircle className="h-5 w-5 text-green-600" />
              </div>
              <div>
                <p className="text-sm text-gray-600">Connected</p>
                <p className="text-xl font-semibold">{integrations.filter((i) => i.status === "connected").length}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-red-100 rounded-lg">
                <XCircle className="h-5 w-5 text-red-600" />
              </div>
              <div>
                <p className="text-sm text-gray-600">Errors</p>
                <p className="text-xl font-semibold">{integrations.filter((i) => i.status === "error").length}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-blue-100 rounded-lg">
                <RefreshCw className="h-5 w-5 text-blue-600" />
              </div>
              <div>
                <p className="text-sm text-gray-600">Syncing</p>
                <p className="text-xl font-semibold">{integrations.filter((i) => i.status === "syncing").length}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-purple-100 rounded-lg">
                <TestTube className="h-5 w-5 text-purple-600" />
              </div>
              <div>
                <p className="text-sm text-gray-600">Testing</p>
                <p className="text-xl font-semibold">{integrations.filter((i) => i.status === "testing").length}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-green-100 rounded-lg">
                <TrendingUp className="h-5 w-5 text-green-600" />
              </div>
              <div>
                <p className="text-sm text-gray-600">Avg Health</p>
                <p className="text-xl font-semibold">
                  {Math.round(integrations.reduce((acc, i) => acc + i.healthScore, 0) / integrations.length)}%
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-violet-100 rounded-lg">
                <Zap className="h-5 w-5 text-violet-600" />
              </div>
              <div>
                <p className="text-sm text-gray-600">Avg Response</p>
                <p className="text-xl font-semibold">
                  {Math.round(
                    integrations.filter((i) => i.responseTime > 0).reduce((acc, i) => acc + i.responseTime, 0) /
                      integrations.filter((i) => i.responseTime > 0).length,
                  )}
                  ms
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="status" className="space-y-4">
        <TabsList className="grid w-full grid-cols-9">
          <TabsTrigger value="status">Status</TabsTrigger>
          <TabsTrigger value="realtime">Real-time</TabsTrigger>
          <TabsTrigger value="configuration">Config</TabsTrigger>
          <TabsTrigger value="testing">Testing</TabsTrigger>
          <TabsTrigger value="compliance">Compliance</TabsTrigger>
          <TabsTrigger value="webhooks">Webhooks</TabsTrigger>
          <TabsTrigger value="mapping">Data Mapping</TabsTrigger>
          <TabsTrigger value="workflows">Workflows</TabsTrigger>
          <TabsTrigger value="jaggaer">Jaggaer</TabsTrigger>
        </TabsList>

        <TabsContent value="status" className="space-y-4">
          <div className="grid gap-4">
            {integrations.map((integration) => {
              const IconComponent = integration.icon
              return (
                <Card key={integration.id}>
                  <CardContent className="p-6">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-4">
                        <div className="p-3 bg-violet-100 rounded-lg">
                          <IconComponent className="h-6 w-6 text-violet-600" />
                        </div>
                        <div className="flex-1">
                          <div className="flex items-center gap-3">
                            <h3 className="font-semibold">{integration.name}</h3>
                            {getStatusIcon(integration.status)}
                            <Badge className={getComplianceColor(integration.compliance)}>
                              {integration.compliance}
                            </Badge>
                          </div>
                          <p className="text-sm text-gray-600 mt-1">{integration.description}</p>
                          <div className="flex items-center gap-6 mt-3">
                            <div className="flex items-center gap-2">
                              <span className="text-xs text-gray-500">Health:</span>
                              <Progress value={integration.healthScore} className="w-16 h-2" />
                              <span className="text-xs font-medium">{integration.healthScore}%</span>
                            </div>
                            <div className="flex items-center gap-2">
                              <span className="text-xs text-gray-500">Response:</span>
                              <span className="text-xs font-medium">{integration.responseTime}ms</span>
                            </div>
                            <div className="flex items-center gap-2">
                              <span className="text-xs text-gray-500">Uptime:</span>
                              <span className="text-xs font-medium">{integration.uptime}%</span>
                            </div>
                          </div>
                          <div className="flex items-center gap-4 mt-2 text-xs text-gray-500">
                            <span>Last sync: {integration.lastSync}</span>
                            <span>Next sync: {integration.nextSync}</span>
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => testIntegration(integration.id)}
                          disabled={integration.status === "testing"}
                        >
                          <TestTube className="h-4 w-4 mr-2" />
                          Test
                        </Button>
                        <Button variant="outline" size="sm">
                          <Settings className="h-4 w-4 mr-2" />
                          Configure
                        </Button>
                        <Button variant="outline" size="sm" disabled={integration.status === "syncing"}>
                          <RefreshCw
                            className={`h-4 w-4 mr-2 ${integration.status === "syncing" ? "animate-spin" : ""}`}
                          />
                          Sync Now
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )
            })}
          </div>
        </TabsContent>

        <TabsContent value="realtime" className="space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Activity className="h-5 w-5" />
                  Live Performance Metrics
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {realTimeMetrics.slice(-5).map((metric, index) => (
                    <div key={index} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                      <div className="flex items-center gap-3">
                        {metric.status === "success" ? (
                          <CheckCircle className="h-4 w-4 text-green-500" />
                        ) : (
                          <XCircle className="h-4 w-4 text-red-500" />
                        )}
                        <div>
                          <p className="font-medium text-sm">{metric.integration}</p>
                          <p className="text-xs text-gray-500">{new Date(metric.timestamp).toLocaleTimeString()}</p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="text-sm font-medium">{Math.round(metric.responseTime)}ms</p>
                        <p className={`text-xs ${metric.status === "success" ? "text-green-600" : "text-red-600"}`}>
                          {metric.status}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Eye className="h-5 w-5" />
                  System Alerts
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <div className="flex items-start gap-3 p-3 bg-red-50 rounded-lg">
                    <AlertTriangle className="h-4 w-4 text-red-500 mt-0.5" />
                    <div>
                      <p className="font-medium text-red-900 text-sm">SOA Registry Down</p>
                      <p className="text-xs text-red-700">Connection failed for 2+ hours</p>
                      <p className="text-xs text-red-600 mt-1">Impact: High - Qualification blocked</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-3 p-3 bg-yellow-50 rounded-lg">
                    <Clock className="h-4 w-4 text-yellow-500 mt-0.5" />
                    <div>
                      <p className="font-medium text-yellow-900 text-sm">DURC Slow Response</p>
                      <p className="text-xs text-yellow-700">Response time above 1000ms</p>
                      <p className="text-xs text-yellow-600 mt-1">Impact: Medium - Delays expected</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-3 p-3 bg-blue-50 rounded-lg">
                    <Server className="h-4 w-4 text-blue-500 mt-0.5" />
                    <div>
                      <p className="font-medium text-blue-900 text-sm">Camera di Commercio Testing</p>
                      <p className="text-xs text-blue-700">Integration test in progress</p>
                      <p className="text-xs text-blue-600 mt-1">ETA: 2 minutes</p>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="configuration" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Integration Configuration</CardTitle>
              <CardDescription>
                Configure API endpoints, authentication, and sync schedules for Italian regulatory systems
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-4">
                  <div>
                    <Label htmlFor="integration-select">Select Integration</Label>
                    <Select value={selectedIntegration} onValueChange={setSelectedIntegration}>
                      <SelectTrigger>
                        <SelectValue placeholder="Choose integration to configure" />
                      </SelectTrigger>
                      <SelectContent>
                        {integrations.map((integration) => (
                          <SelectItem key={integration.id} value={integration.id}>
                            {integration.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label htmlFor="endpoint">API Endpoint</Label>
                    <Input id="endpoint" placeholder="https://api.example.com/v1" />
                  </div>
                  <div>
                    <Label htmlFor="api-key">API Key / Certificate</Label>
                    <Input id="api-key" type="password" placeholder="Enter API key or certificate path" />
                  </div>
                  <div>
                    <Label htmlFor="timeout">Timeout (seconds)</Label>
                    <Input id="timeout" type="number" placeholder="30" />
                  </div>
                  <div>
                    <Label htmlFor="rate-limit">Rate Limit (requests/minute)</Label>
                    <Input id="rate-limit" type="number" placeholder="60" />
                  </div>
                </div>
                <div className="space-y-4">
                  <div>
                    <Label htmlFor="sync-frequency">Sync Frequency</Label>
                    <Select>
                      <SelectTrigger>
                        <SelectValue placeholder="Select frequency" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="realtime">Real-time</SelectItem>
                        <SelectItem value="hourly">Every Hour</SelectItem>
                        <SelectItem value="daily">Daily</SelectItem>
                        <SelectItem value="weekly">Weekly</SelectItem>
                        <SelectItem value="manual">Manual Only</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="flex items-center justify-between">
                    <Label htmlFor="auto-retry">Auto Retry on Failure</Label>
                    <Switch id="auto-retry" />
                  </div>
                  <div className="flex items-center justify-between">
                    <Label htmlFor="notifications">Email Notifications</Label>
                    <Switch id="notifications" />
                  </div>
                  <div className="flex items-center justify-between">
                    <Label htmlFor="compliance-alerts">Compliance Alerts</Label>
                    <Switch id="compliance-alerts" />
                  </div>
                  <div>
                    <Label htmlFor="retry-attempts">Max Retry Attempts</Label>
                    <Input id="retry-attempts" type="number" placeholder="3" />
                  </div>
                  <div>
                    <Label htmlFor="webhook-url">Webhook URL (Optional)</Label>
                    <Input id="webhook-url" placeholder="https://your-app.com/webhook" />
                  </div>
                </div>
              </div>
              <div>
                <Label htmlFor="custom-headers">Custom Headers (JSON)</Label>
                <Textarea
                  id="custom-headers"
                  placeholder='{"Authorization": "Bearer token", "X-Custom-Header": "value"}'
                  className="h-20"
                />
              </div>
              <div className="flex justify-end gap-2">
                <Button variant="outline">Test Connection</Button>
                <Button variant="outline">Validate Configuration</Button>
                <Button>Save Configuration</Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="testing" className="space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>Integration Test Suite</CardTitle>
                <CardDescription>Test individual integrations and validate responses</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label htmlFor="test-integration">Select Integration to Test</Label>
                  <Select>
                    <SelectTrigger>
                      <SelectValue placeholder="Choose integration" />
                    </SelectTrigger>
                    <SelectContent>
                      {integrations.map((integration) => (
                        <SelectItem key={integration.id} value={integration.id}>
                          {integration.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label htmlFor="test-type">Test Type</Label>
                  <Select>
                    <SelectTrigger>
                      <SelectValue placeholder="Select test type" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="connectivity">Connectivity Test</SelectItem>
                      <SelectItem value="authentication">Authentication Test</SelectItem>
                      <SelectItem value="data-sync">Data Sync Test</SelectItem>
                      <SelectItem value="performance">Performance Test</SelectItem>
                      <SelectItem value="compliance">Compliance Validation</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label htmlFor="test-data">Test Data (JSON)</Label>
                  <Textarea
                    id="test-data"
                    placeholder='{"supplier_id": "12345", "document_type": "DURC"}'
                    className="h-24"
                  />
                </div>
                <div className="flex gap-2">
                  <Button className="flex-1">
                    <TestTube className="h-4 w-4 mr-2" />
                    Run Test
                  </Button>
                  <Button variant="outline">
                    <Download className="h-4 w-4 mr-2" />
                    Export Results
                  </Button>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Test Results</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="p-4 bg-green-50 rounded-lg">
                    <div className="flex items-center gap-2 mb-2">
                      <CheckCircle className="h-4 w-4 text-green-500" />
                      <span className="font-medium text-green-900">DURC Verification - Connectivity Test</span>
                    </div>
                    <p className="text-sm text-green-700">Connection successful</p>
                    <div className="mt-2 text-xs text-green-600">
                      <p>Response time: 245ms</p>
                      <p>Status code: 200</p>
                      <p>Timestamp: 2024-01-15 15:30:45</p>
                    </div>
                  </div>
                  <div className="p-4 bg-red-50 rounded-lg">
                    <div className="flex items-center gap-2 mb-2">
                      <XCircle className="h-4 w-4 text-red-500" />
                      <span className="font-medium text-red-900">SOA Registry - Authentication Test</span>
                    </div>
                    <p className="text-sm text-red-700">Authentication failed</p>
                    <div className="mt-2 text-xs text-red-600">
                      <p>Error: Invalid certificate</p>
                      <p>Status code: 401</p>
                      <p>Timestamp: 2024-01-15 15:28:12</p>
                    </div>
                  </div>
                  <div className="p-4 bg-yellow-50 rounded-lg">
                    <div className="flex items-center gap-2 mb-2">
                      <AlertTriangle className="h-4 w-4 text-yellow-500" />
                      <span className="font-medium text-yellow-900">White List ANAC - Performance Test</span>
                    </div>
                    <p className="text-sm text-yellow-700">Slow response detected</p>
                    <div className="mt-2 text-xs text-yellow-600">
                      <p>Response time: 1850ms (above threshold)</p>
                      <p>Status code: 200</p>
                      <p>Timestamp: 2024-01-15 15:25:33</p>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="compliance" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Italian Regulatory Compliance Report</CardTitle>
              <CardDescription>Comprehensive compliance status for all Italian government integrations</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-6">
                <div className="p-4 bg-green-50 rounded-lg">
                  <div className="flex items-center gap-2 mb-2">
                    <CheckCircle className="h-5 w-5 text-green-500" />
                    <span className="font-semibold text-green-900">Compliant Systems</span>
                  </div>
                  <p className="text-2xl font-bold text-green-900">
                    {integrations.filter((i) => i.compliance === "compliant").length}
                  </p>
                  <p className="text-sm text-green-700">DURC, INAIL, Agenzia Entrate, White List</p>
                </div>
                <div className="p-4 bg-yellow-50 rounded-lg">
                  <div className="flex items-center gap-2 mb-2">
                    <AlertTriangle className="h-5 w-5 text-yellow-500" />
                    <span className="font-semibold text-yellow-900">Warning Systems</span>
                  </div>
                  <p className="text-2xl font-bold text-yellow-900">
                    {integrations.filter((i) => i.compliance === "warning").length}
                  </p>
                  <p className="text-sm text-yellow-700">Camera di Commercio, ISO Certification</p>
                </div>
                <div className="p-4 bg-red-50 rounded-lg">
                  <div className="flex items-center gap-2 mb-2">
                    <XCircle className="h-5 w-5 text-red-500" />
                    <span className="font-semibold text-red-900">Critical Issues</span>
                  </div>
                  <p className="text-2xl font-bold text-red-900">
                    {integrations.filter((i) => i.compliance === "critical").length}
                  </p>
                  <p className="text-sm text-red-700">SOA Registry</p>
                </div>
              </div>

              <div className="space-y-4">
                <h3 className="font-semibold text-lg">Detailed Compliance Status</h3>
                {integrations
                  .filter((i) => i.type === "government" || i.type === "compliance")
                  .map((integration) => (
                    <div key={integration.id} className="flex items-center justify-between p-4 border rounded-lg">
                      <div className="flex items-center gap-4">
                        <div className={`p-2 rounded-lg ${getComplianceColor(integration.compliance)}`}>
                          <integration.icon className="h-5 w-5" />
                        </div>
                        <div>
                          <h4 className="font-medium">{integration.name}</h4>
                          <p className="text-sm text-gray-600">{integration.description}</p>
                          <div className="flex items-center gap-4 mt-1 text-xs text-gray-500">
                            <span>Last verified: {integration.lastSync}</span>
                            <span>Health: {integration.healthScore}%</span>
                          </div>
                        </div>
                      </div>
                      <div className="text-right">
                        <Badge className={getComplianceColor(integration.compliance)}>{integration.compliance}</Badge>
                        <p className="text-xs text-gray-500 mt-1">
                          {integration.status === "connected" ? "Active" : "Inactive"}
                        </p>
                      </div>
                    </div>
                  ))}
              </div>

              <div className="flex justify-end gap-2 mt-6">
                <Button variant="outline">
                  <Download className="h-4 w-4 mr-2" />
                  Export Compliance Report
                </Button>
                <Button>
                  <FileText className="h-4 w-4 mr-2" />
                  Generate Audit Report
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="webhooks" className="space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Webhook className="h-5 w-5" />
                  Webhook Management
                </CardTitle>
                <CardDescription>Configure webhooks for real-time integration events</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-4">
                  {webhooks.map((webhook) => (
                    <div key={webhook.id} className="p-4 border rounded-lg">
                      <div className="flex items-center justify-between mb-3">
                        <div className="flex items-center gap-3">
                          <div
                            className={`p-2 rounded-lg ${
                              webhook.status === "active"
                                ? "bg-green-100"
                                : webhook.status === "error"
                                  ? "bg-red-100"
                                  : "bg-gray-100"
                            }`}
                          >
                            <Webhook
                              className={`h-4 w-4 ${
                                webhook.status === "active"
                                  ? "text-green-600"
                                  : webhook.status === "error"
                                    ? "text-red-600"
                                    : "text-gray-600"
                              }`}
                            />
                          </div>
                          <div>
                            <h4 className="font-medium">{webhook.name}</h4>
                            <p className="text-sm text-gray-600">{webhook.url}</p>
                          </div>
                        </div>
                        <Badge variant={webhook.status === "active" ? "default" : "secondary"}>{webhook.status}</Badge>
                      </div>
                      <div className="space-y-2">
                        <div className="flex items-center gap-2">
                          <span className="text-xs text-gray-500">Events:</span>
                          <div className="flex gap-1">
                            {webhook.events.map((event) => (
                              <Badge key={event} variant="outline" className="text-xs">
                                {event}
                              </Badge>
                            ))}
                          </div>
                        </div>
                        <div className="flex items-center justify-between text-xs text-gray-500">
                          <span>Last triggered: {webhook.lastTriggered}</span>
                          <span>Success rate: {webhook.successRate}%</span>
                        </div>
                      </div>
                      <div className="flex gap-2 mt-3">
                        <Button variant="outline" size="sm">
                          <TestTube className="h-3 w-3 mr-1" />
                          Test
                        </Button>
                        <Button variant="outline" size="sm">
                          <Settings className="h-3 w-3 mr-1" />
                          Edit
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
                <Button className="w-full">
                  <Webhook className="h-4 w-4 mr-2" />
                  Add New Webhook
                </Button>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Webhook Configuration</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label htmlFor="webhook-name">Webhook Name</Label>
                  <Input id="webhook-name" placeholder="Enter webhook name" />
                </div>
                <div>
                  <Label htmlFor="webhook-url">Endpoint URL</Label>
                  <Input id="webhook-url" placeholder="https://your-app.com/webhook" />
                </div>
                <div>
                  <Label htmlFor="webhook-events">Trigger Events</Label>
                  <div className="grid grid-cols-2 gap-2 mt-2">
                    {[
                      "supplier.created",
                      "supplier.updated",
                      "supplier.verified",
                      "supplier.rejected",
                      "document.uploaded",
                      "document.verified",
                      "document.expired",
                      "document.rejected",
                      "compliance.warning",
                      "compliance.critical",
                      "integration.error",
                      "sync.completed",
                    ].map((event) => (
                      <div key={event} className="flex items-center space-x-2">
                        <input type="checkbox" id={event} className="rounded" />
                        <Label htmlFor={event} className="text-xs">
                          {event}
                        </Label>
                      </div>
                    ))}
                  </div>
                </div>
                <div>
                  <Label htmlFor="webhook-secret">Secret Key</Label>
                  <Input id="webhook-secret" type="password" placeholder="Optional webhook secret" />
                </div>
                <div className="flex items-center justify-between">
                  <Label htmlFor="webhook-retry">Auto Retry on Failure</Label>
                  <Switch id="webhook-retry" />
                </div>
                <div className="flex gap-2">
                  <Button variant="outline" className="flex-1 bg-transparent">
                    Test Webhook
                  </Button>
                  <Button className="flex-1">Save Webhook</Button>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="mapping" className="space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <ArrowRightLeft className="h-5 w-5" />
                  Data Transformation Rules
                </CardTitle>
                <CardDescription>
                  Configure data mapping and transformation for Italian regulatory responses
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {dataMappings.map((mapping) => (
                  <div key={mapping.id} className="p-4 border rounded-lg">
                    <div className="flex items-center justify-between mb-3">
                      <h4 className="font-medium">{mapping.name}</h4>
                      <Button variant="outline" size="sm">
                        <Code className="h-3 w-3 mr-1" />
                        Edit
                      </Button>
                    </div>
                    <div className="space-y-2 text-sm">
                      <div className="flex items-center gap-2">
                        <span className="text-gray-500 min-w-20">Source:</span>
                        <code className="bg-gray-100 px-2 py-1 rounded text-xs">{mapping.sourceField}</code>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-gray-500 min-w-20">Target:</span>
                        <code className="bg-gray-100 px-2 py-1 rounded text-xs">{mapping.targetField}</code>
                      </div>
                      <div className="flex items-start gap-2">
                        <span className="text-gray-500 min-w-20">Transform:</span>
                        <code className="bg-blue-50 px-2 py-1 rounded text-xs flex-1">{mapping.transformation}</code>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-gray-500 min-w-20">Validate:</span>
                        <code className="bg-green-50 px-2 py-1 rounded text-xs">{mapping.validation}</code>
                      </div>
                    </div>
                  </div>
                ))}
                <Button className="w-full">
                  <ArrowRightLeft className="h-4 w-4 mr-2" />
                  Add New Mapping Rule
                </Button>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Create Data Mapping</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label htmlFor="mapping-name">Mapping Name</Label>
                  <Input id="mapping-name" placeholder="Enter mapping name" />
                </div>
                <div>
                  <Label htmlFor="source-integration">Source Integration</Label>
                  <Select>
                    <SelectTrigger>
                      <SelectValue placeholder="Select source integration" />
                    </SelectTrigger>
                    <SelectContent>
                      {integrations.map((integration) => (
                        <SelectItem key={integration.id} value={integration.id}>
                          {integration.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label htmlFor="source-field">Source Field Path</Label>
                  <Input id="source-field" placeholder="response.data.status" />
                </div>
                <div>
                  <Label htmlFor="target-field">Target Field</Label>
                  <Input id="target-field" placeholder="compliance_status" />
                </div>
                <div>
                  <Label htmlFor="transformation">Transformation Function</Label>
                  <Textarea
                    id="transformation"
                    placeholder="map({'REGOLARE': 'compliant', 'IRREGOLARE': 'non_compliant'})"
                    className="h-20"
                  />
                </div>
                <div>
                  <Label htmlFor="validation-rules">Validation Rules</Label>
                  <Input id="validation-rules" placeholder="required|in:compliant,non_compliant" />
                </div>
                <div className="flex gap-2">
                  <Button variant="outline" className="flex-1 bg-transparent">
                    Test Mapping
                  </Button>
                  <Button className="flex-1">Save Mapping</Button>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="workflows" className="space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Workflow className="h-5 w-5" />
                  Integration Dependencies
                </CardTitle>
                <CardDescription>Manage integration dependencies and workflow triggers</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {dependencies.map((dependency) => (
                  <div key={dependency.id} className="p-4 border rounded-lg">
                    <div className="flex items-center justify-between mb-3">
                      <h4 className="font-medium">{dependency.name}</h4>
                      <Badge
                        variant={
                          dependency.status === "satisfied"
                            ? "default"
                            : dependency.status === "partial"
                              ? "secondary"
                              : "destructive"
                        }
                      >
                        {dependency.status}
                      </Badge>
                    </div>
                    <div className="space-y-2">
                      <span className="text-sm text-gray-500">Depends on:</span>
                      <div className="flex flex-wrap gap-2">
                        {dependency.dependsOn.map((dep) => {
                          const integration = integrations.find((i) => i.id === dep)
                          const isConnected = integration?.status === "connected"
                          return (
                            <div
                              key={dep}
                              className={`flex items-center gap-1 px-2 py-1 rounded text-xs ${
                                isConnected ? "bg-green-100 text-green-700" : "bg-red-100 text-red-700"
                              }`}
                            >
                              {isConnected ? <CheckCircle className="h-3 w-3" /> : <XCircle className="h-3 w-3" />}
                              {integration?.name || dep}
                            </div>
                          )
                        })}
                      </div>
                    </div>
                  </div>
                ))}
                <Button className="w-full">
                  <Workflow className="h-4 w-4 mr-2" />
                  Create New Workflow
                </Button>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Timer className="h-5 w-5" />
                  Automated Triggers
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-3">
                  <div className="p-3 bg-blue-50 rounded-lg">
                    <div className="flex items-center gap-2 mb-2">
                      <Clock className="h-4 w-4 text-blue-600" />
                      <span className="font-medium text-blue-900">Document Expiry Check</span>
                    </div>
                    <p className="text-sm text-blue-700">Runs daily at 09:00</p>
                    <p className="text-xs text-blue-600">Triggers compliance alerts for expiring documents</p>
                  </div>
                  <div className="p-3 bg-green-50 rounded-lg">
                    <div className="flex items-center gap-2 mb-2">
                      <RefreshCw className="h-4 w-4 text-green-600" />
                      <span className="font-medium text-green-900">Auto Sync DURC</span>
                    </div>
                    <p className="text-sm text-green-700">Runs every 4 hours</p>
                    <p className="text-xs text-green-600">Automatically syncs DURC status for active suppliers</p>
                  </div>
                  <div className="p-3 bg-purple-50 rounded-lg">
                    <div className="flex items-center gap-2 mb-2">
                      <Shield className="h-4 w-4 text-purple-600" />
                      <span className="font-medium text-purple-900">Compliance Validation</span>
                    </div>
                    <p className="text-sm text-purple-700">Triggered on supplier update</p>
                    <p className="text-xs text-purple-600">Validates all compliance requirements automatically</p>
                  </div>
                </div>
                <Button className="w-full">
                  <Timer className="h-4 w-4 mr-2" />
                  Add New Trigger
                </Button>
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Layers className="h-5 w-5" />
                Integration Performance Optimization
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="p-4 bg-gradient-to-br from-violet-50 to-purple-50 rounded-lg">
                  <div className="flex items-center gap-2 mb-2">
                    <Zap className="h-5 w-5 text-violet-600" />
                    <span className="font-medium">Connection Pooling</span>
                  </div>
                  <p className="text-sm text-gray-600 mb-3">Optimize connection reuse for Italian government APIs</p>
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-gray-500">Status:</span>
                    <Badge className="bg-green-100 text-green-700">Enabled</Badge>
                  </div>
                </div>
                <div className="p-4 bg-gradient-to-br from-blue-50 to-cyan-50 rounded-lg">
                  <div className="flex items-center gap-2 mb-2">
                    <Database className="h-5 w-5 text-blue-600" />
                    <span className="font-medium">Response Caching</span>
                  </div>
                  <p className="text-sm text-gray-600 mb-3">Cache DURC and SOA responses for 1 hour</p>
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-gray-500">Hit Rate:</span>
                    <Badge className="bg-blue-100 text-blue-700">87%</Badge>
                  </div>
                </div>
                <div className="p-4 bg-gradient-to-br from-green-50 to-emerald-50 rounded-lg">
                  <div className="flex items-center gap-2 mb-2">
                    <Filter className="h-5 w-5 text-green-600" />
                    <span className="font-medium">Rate Limiting</span>
                  </div>
                  <p className="text-sm text-gray-600 mb-3">Intelligent rate limiting per integration</p>
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-gray-500">Efficiency:</span>
                    <Badge className="bg-green-100 text-green-700">94%</Badge>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
        <TabsContent value="jaggaer" className="space-y-4">
          <JaggaerIntegration />
        </TabsContent>
      </Tabs>
    </div>
  )
}
