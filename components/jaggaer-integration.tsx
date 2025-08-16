"use client"

import { useEffect, useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { ScrollArea } from "@/components/ui/scroll-area"
import { AlertCircle, CheckCircle, Download, RefreshCw, Search, Users, FileText } from "lucide-react"

interface CompanyProfile {
  bravo_id: string | null
  ext_code?: string
  company_name: string
  fiscal_code?: string
  eu_vat?: string
  email?: string
  city?: string
  province?: string
  status: string
  type: string
  certifications: Array<{
    type: string
    name: string
    values: {
      filename?: string
      secure_token?: string
      file_id?: string
      attachment_expiry_date?: string
    }
  }>
}

export function JaggaerIntegration() {
  const [profiles, setProfiles] = useState<CompanyProfile[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [notice, setNotice] = useState<string | null>(null)
  const [searchTerm, setSearchTerm] = useState("")
  const [selectedComponents, setSelectedComponents] = useState<string[]>(["MASTER", "DEBASIC"])
  const [maxTotal, setMaxTotal] = useState<number>(1000)
  const [batchSize, setBatchSize] = useState<number>(100)
  const [stats, setStats] = useState({
    total: 0,
    active: 0,
    withCertifications: 0,
    lastSync: null as Date | null,
  })

  const availableComponents = [
    { id: "MASTER", label: "Master Data", description: "Basic company information" },
    { id: "DEBASIC", label: "DE Basic", description: "Italian regulatory data" },
    { id: "DEINFO", label: "DE Info", description: "Detailed questionnaire responses" },
    { id: "ATTACHMENTS", label: "Attachments", description: "Document attachments" },
  ]

  // Load persisted settings on mount (cyber-safe: handle errors, no sensitive logs)
  useEffect(() => {
    let abort = false
    const loadSettings = async () => {
      try {
        const res = await fetch("/api/integrations/settings", { cache: "no-store" })
        if (!res.ok) return
        const json = await res.json()
        if (!abort && json?.data?.selectedComponents?.length) {
          setSelectedComponents(json.data.selectedComponents)
        }
        if (!abort && typeof json?.data?.maxTotal === "number") {
          setMaxTotal(json.data.maxTotal)
        }
        if (!abort && typeof json?.data?.batchSize === "number") {
          setBatchSize(json.data.batchSize)
        }
        if (!abort && json?.data?.lastSync) {
          // show as informational; server controls this
          const d = new Date(json.data.lastSync)
          if (!isNaN(d.getTime())) setStats((s) => ({ ...s, lastSync: d }))
        }
      } catch (_) {
        // swallow to avoid leaking details to UI; errors will surface via user actions anyway
      }
    }
    loadSettings()
    return () => {
      abort = true
    }
  }, [])

  const fetchProfiles = async (fullSync = false) => {
    setLoading(true)
    setError(null)
    setNotice(null)

    try {
      const params = new URLSearchParams({
        components: selectedComponents.join(","),
        all: fullSync ? "true" : "false",
        ...(fullSync
          ? { maxTotal: String(Math.max(1, Math.min(10000, maxTotal))), batchSize: String(Math.max(1, Math.min(1000, batchSize))) }
          : { start: "1" }),
      })

      const response = await fetch(`/api/jaggaer/profiles?${params}`)
      const result = await response.json()

      if (!result.success) {
        throw new Error(result.error || "Failed to fetch profiles")
      }

      if (fullSync) {
        setProfiles(result.data)
        setStats({
          total: result.data.length,
          active: result.data.filter((p: CompanyProfile) => p.status === "ACTIVE").length,
          withCertifications: result.data.filter((p: CompanyProfile) => p.certifications.length > 0).length,
          lastSync: new Date(),
        })
      } else {
        // For single page requests, just show the raw response
        console.log("Single page response:", result.data)
        setNotice("Connection successful. API reachable and credentials valid.")
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unknown error occurred")
    } finally {
      setLoading(false)
    }
  }

  const downloadAttachment = async (secureToken?: string, fileId?: string, fileName?: string) => {
    try {
      const params = new URLSearchParams()
      if (secureToken) {
        params.set("secureToken", secureToken)
      } else if (fileId && fileName) {
        params.set("fileId", fileId)
        params.set("fileName", fileName)
      } else {
        throw new Error("Missing download parameters")
      }

      if (fileName) {
        params.set("fileName", fileName)
      }

      const response = await fetch(`/api/jaggaer/download?${params}`)

      if (!response.ok) {
        throw new Error("Download failed")
      }

      const blob = await response.blob()
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement("a")
      a.href = url
      a.download = fileName || "attachment"
      document.body.appendChild(a)
      a.click()
      window.URL.revokeObjectURL(url)
      document.body.removeChild(a)
    } catch (err) {
      console.error("Download error:", err)
      setError(err instanceof Error ? err.message : "Download failed")
    }
  }

  const filteredProfiles = profiles.filter(
    (profile) =>
      profile.company_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      profile.fiscal_code?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      profile.city?.toLowerCase().includes(searchTerm.toLowerCase()),
  )

  const getStatusBadge = (status: string) => {
    const variant = status === "ACTIVE" ? "default" : "secondary"
    return <Badge variant={variant}>{status}</Badge>
  }

  // Persist current settings securely via API
  const saveSettings = async () => {
    setError(null)
    try {
      const res = await fetch("/api/integrations/settings", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ selectedComponents, maxTotal, batchSize }),
      })
      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        throw new Error(data?.error || "Failed to save settings")
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to save settings")
    }
  }

  const getCertificationBadge = (type: string) => {
    const colors = {
      SOA: "bg-blue-100 text-blue-800",
      ISO_9001: "bg-green-100 text-green-800",
      ISO_37001: "bg-purple-100 text-purple-800",
      OTHER: "bg-gray-100 text-gray-800",
    }
    return <Badge className={colors[type as keyof typeof colors] || colors.OTHER}>{type.replace("_", " ")}</Badge>
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Jaggaer Integration</h2>
          <p className="text-muted-foreground">Manage supplier data synchronization with Jaggaer platform</p>
        </div>
        <div className="flex gap-2">
          <Button onClick={() => fetchProfiles(false)} disabled={loading} variant="outline">
            <RefreshCw className={`h-4 w-4 mr-2 ${loading ? "animate-spin" : ""}`} />
            Test Connection
          </Button>
          <Button onClick={() => fetchProfiles(true)} disabled={loading}>
            <Users className="h-4 w-4 mr-2" />
            Full Sync
          </Button>
        </div>
        
      </div>
      <div className="flex justify-end -mt-2">
        <span className="text-xs text-muted-foreground">Test Connection does not modify the database.</span>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Suppliers</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.total.toLocaleString()}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Suppliers</CardTitle>
            <CheckCircle className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.active.toLocaleString()}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">With Certifications</CardTitle>
            <FileText className="h-4 w-4 text-blue-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.withCertifications.toLocaleString()}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Last Sync</CardTitle>
            <RefreshCw className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-sm">{stats.lastSync ? stats.lastSync.toLocaleString() : "Never"}</div>
          </CardContent>
        </Card>
      </div>

      {/* Error Display */}
      {error && (
        <Card className="border-red-200 bg-red-50">
          <CardHeader>
            <div className="flex items-center gap-2">
              <AlertCircle className="h-5 w-5 text-red-600" />
              <CardTitle className="text-red-800">Error</CardTitle>
            </div>
          </CardHeader>
          <CardContent>
            <p className="text-red-700">{error}</p>
          </CardContent>
        </Card>
      )}

      {/* Success Notice */}
      {notice && (
        <Card className="border-green-200 bg-green-50">
          <CardHeader>
            <div className="flex items-center gap-2">
              <CheckCircle className="h-5 w-5 text-green-600" />
              <CardTitle className="text-green-800">Success</CardTitle>
            </div>
          </CardHeader>
          <CardContent>
            <p className="text-green-700">{notice}</p>
          </CardContent>
        </Card>
      )}

      <Tabs defaultValue="suppliers" className="space-y-4">
        <TabsList>
          <TabsTrigger value="suppliers">Suppliers</TabsTrigger>
          <TabsTrigger value="config">Configuration</TabsTrigger>
        </TabsList>

        <TabsContent value="suppliers" className="space-y-4">
          {/* Search and Filters */}
          <Card>
            <CardHeader>
              <CardTitle>Search & Filter</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex gap-4">
                <div className="flex-1">
                  <Label htmlFor="search">Search Suppliers</Label>
                  <div className="relative">
                    <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                    <Input
                      id="search"
                      placeholder="Search by company name, fiscal code, or city..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="pl-10"
                    />
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Suppliers Table */}
          <Card>
            <CardHeader>
              <CardTitle>Supplier Profiles ({filteredProfiles.length})</CardTitle>
              <CardDescription>Synchronized supplier data from Jaggaer platform</CardDescription>
            </CardHeader>
            <CardContent>
              <ScrollArea className="h-[600px]">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Company</TableHead>
                      <TableHead>Fiscal Code</TableHead>
                      <TableHead>Location</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Certifications</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredProfiles.map((profile, index) => (
                      <TableRow key={profile.bravo_id || index}>
                        <TableCell>
                          <div>
                            <div className="font-medium">{profile.company_name}</div>
                            <div className="text-sm text-muted-foreground">ID: {profile.bravo_id || "N/A"}</div>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="text-sm">
                            <div>FC: {profile.fiscal_code || "N/A"}</div>
                            <div>VAT: {profile.eu_vat || "N/A"}</div>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="text-sm">
                            {profile.city && profile.province
                              ? `${profile.city}, ${profile.province}`
                              : profile.city || profile.province || "N/A"}
                          </div>
                        </TableCell>
                        <TableCell>{getStatusBadge(profile.status)}</TableCell>
                        <TableCell>
                          <div className="flex flex-wrap gap-1">
                            {profile.certifications.slice(0, 3).map((cert, certIndex) => (
                              <div key={certIndex}>{getCertificationBadge(cert.type)}</div>
                            ))}
                            {profile.certifications.length > 3 && (
                              <Badge variant="outline">+{profile.certifications.length - 3} more</Badge>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex gap-1">
                            {profile.certifications.map(
                              (cert, certIndex) =>
                                cert.values.secure_token && (
                                  <Button
                                    key={certIndex}
                                    size="sm"
                                    variant="outline"
                                    onClick={() =>
                                      downloadAttachment(
                                        cert.values.secure_token,
                                        cert.values.file_id,
                                        cert.values.filename,
                                      )
                                    }
                                  >
                                    <Download className="h-3 w-3" />
                                  </Button>
                                ),
                            )}
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </ScrollArea>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="config" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Sync Configuration</CardTitle>
              <CardDescription>Configure which data components to synchronize from Jaggaer</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label>Data Components</Label>
                <div className="grid grid-cols-2 gap-4 mt-2">
                  {availableComponents.map((component) => (
                    <div key={component.id} className="flex items-start space-x-3">
                      <input
                        type="checkbox"
                        id={component.id}
                        checked={selectedComponents.includes(component.id)}
                        onChange={(e) => {
                          if (e.target.checked) {
                            setSelectedComponents([...selectedComponents, component.id])
                          } else {
                            setSelectedComponents(selectedComponents.filter((c) => c !== component.id))
                          }
                        }}
                        className="mt-1"
                      />
                      <div>
                        <label htmlFor={component.id} className="text-sm font-medium">
                          {component.label}
                        </label>
                        <p className="text-xs text-muted-foreground">{component.description}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="maxTotal">Max Total (1-100000)</Label>
                  <Input
                    id="maxTotal"
                    type="number"
                    min={1}
                    max={100000}
                    value={maxTotal}
                    onChange={(e) => setMaxTotal(Math.max(1, Math.min(100000, Number(e.target.value) || 1)))}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="batchSize">Batch Size (1-1000)</Label>
                  <Input
                    id="batchSize"
                    type="number"
                    min={1}
                    max={1000}
                    value={batchSize}
                    onChange={(e) => setBatchSize(Math.max(1, Math.min(1000, Number(e.target.value) || 1)))}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Last Sync</Label>
                  <div className="text-sm text-muted-foreground h-10 flex items-center">
                    {stats.lastSync ? stats.lastSync.toLocaleString() : "Never"}
                  </div>
                </div>
              </div>
              <div className="flex justify-end">
                <Button onClick={saveSettings} variant="default">Save Settings</Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}
