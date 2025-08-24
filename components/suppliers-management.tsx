"use client"

import { useState, useEffect, useRef, useMemo } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardHeader } from "@/components/ui/card"
import { Checkbox } from "@/components/ui/checkbox"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { useToast } from "@/hooks/use-toast"
import { useMultiWorkflow } from "@/hooks/use-multi-workflow"
import {
  Search,
  Filter,
  Download,
  MoreHorizontal,
  ArrowUpDown,
  Building2,
  MapPin,
  Calendar,
  CheckCircle,
  Eye,
  Edit,
  Trash2,
  RefreshCw,
  Loader2,
  AlertCircle,
  Ban,
  FileJson,
  FileSpreadsheet,
} from "lucide-react"
import { cn } from "@/lib/utils"
import Link from "next/link"
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from "@/components/ui/sheet"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Tooltip, TooltipTrigger, TooltipContent } from "@/components/ui/tooltip"

interface Supplier {
  id: string
  bravo_id: string
  ext_code: string
  company_name: string
  fiscal_code: string
  vat_number: string
  email: string
  pec_email: string
  phone: string
  address: string
  city: string
  province: string
  zip_code: string
  country: string
  status: string
  supplier_type: string
  registration_date: string | null
  jaggaer_last_mod_time: string | null
  last_sync: string | null
  created_at: string
  updated_at: string
  total_documents: number
  verified_documents: number
  verification_progress: number
  certifications: Array<{
    id: string
    certification_type: string
    certification_name: string
    status: string
    expiry_date: string | null
    values: string[]
  }>
  verification_status: "PENDING" | "IN_PROGRESS" | "QUALIFIED" | "REJECTED" | "EXPIRED"
}

interface ApiResponse {
  data: Supplier[]
  pagination: {
    page: number
    limit: number
    total: number
    pages: number
  }
  sync_info: {
    last_sync: string
    status: string
    total_suppliers: number
  }
}

const statusConfig = {
  PENDING: { label: "Pending", color: "bg-yellow-100 text-yellow-800", count: 0 },
  IN_PROGRESS: { label: "In Progress", color: "bg-blue-100 text-blue-800", count: 0 },
  QUALIFIED: { label: "Qualified", color: "bg-green-100 text-green-800", count: 0 },
  REJECTED: { label: "Rejected", color: "bg-red-100 text-red-800", count: 0 },
  EXPIRED: { label: "Expired", color: "bg-gray-100 text-gray-800", count: 0 },
}

// Q1 verification steps (SOA included by default) in order
const Q1_STEPS = [
  { key: 'registration', name: 'Registration Check' },
  { key: 'preliminary', name: 'Preliminary Data Verification' },
  { key: 'durc', name: 'DURC Verification' },
  { key: 'whitelist_insurance', name: 'White List & Insurance' },
  { key: 'visura', name: 'Qualification Questionnaire (VISURA)' },
  { key: 'certifications', name: 'Certifications Verification' },
  { key: 'soa', name: 'SOA Verification' },
  { key: 'scorecard', name: 'Q1 Scorecard Generation' },
  { key: 'finalize', name: 'Final Outcome & Follow-up' },
 ] as const

export function SuppliersManagement() {
  const { toast } = useToast()
  const [suppliers, setSuppliers] = useState<Supplier[]>([])
  const [loading, setLoading] = useState(true)
  const [syncing, setSyncing] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 20,
    total: 0,
    pages: 0,
  })
  const [syncInfo, setSyncInfo] = useState<any>(null)

  const [selectedSuppliers, setSelectedSuppliers] = useState<string[]>([])
  const [activeFilter, setActiveFilter] = useState<string>("all")
  const [searchQuery, setSearchQuery] = useState("")
  const [sortField, setSortField] = useState<string>("company_name")
  const [sortDirection, setSortDirection] = useState<"asc" | "desc">("asc")
  const [isBulkStatusOpen, setBulkStatusOpen] = useState(false)
  const [stepFilters, setStepFilters] = useState({ hasFail: false, running: false, allPass: false })
  const [lastUpdatedAt, setLastUpdatedAt] = useState<number | null>(null)
  const [debouncedSearchQuery, setDebouncedSearchQuery] = useState("")
  const currentFetchController = useRef<AbortController | null>(null)
  const {
    runs: multiRuns,
    isLoading: multiLoading,
    isRunning: multiRunning,
    errors: multiErrors,
    startWorkflows,
    refreshStatuses: refreshMultiStatuses,
    cancelWorkflows,
  } = useMultiWorkflow({ supplierIds: selectedSuppliers, autoRefresh: true, refreshInterval: 2000 })

  // Track and poll workflow statuses for all suppliers visible on the current page
  const visibleSupplierIds = useMemo(() => suppliers.map((s) => s.id), [suppliers])
  const { runs: pageRuns, refreshStatuses: refreshPageStatuses } = useMultiWorkflow({ supplierIds: visibleSupplierIds, autoRefresh: true, refreshInterval: 2000 })

  const fetchSuppliers = async (page = 1, search = "", status = "", signal?: AbortSignal) => {
    try {
      setLoading(true)
      setError(null)
      const params = new URLSearchParams({
        page: page.toString(),
        limit: pagination.limit.toString(),
      })

      if (search) params.append("search", search)
      if (status && status !== "all") params.append("status", status)

      const response = await fetch(`/api/suppliers?${params}`, { signal })

      if (!response.ok) {
        if (response.status === 401) {
          throw new Error("Please log in to access suppliers data")
        }
        throw new Error(`Failed to fetch suppliers: ${response.statusText}`)
      }

      const data: ApiResponse = await response.json()

      setSuppliers(data.data)
      setPagination(data.pagination)
      setSyncInfo(data.sync_info)
    } catch (error) {
      // Ignore aborted requests during rapid typing
      const isAbort =
        (typeof DOMException !== 'undefined' && error instanceof DOMException && error.name === 'AbortError') ||
        (error instanceof Error && error.name === 'AbortError')
      if (isAbort) return
      console.error("Error fetching suppliers:", error)
      const errorMessage = error instanceof Error ? error.message : 'Unknown error'
      setError(errorMessage)
      toast({
        title: "Error",
        description: errorMessage,
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  const triggerSync = async (syncType = "INCREMENTAL") => {
    try {
      setSyncing(true)
      setError(null)

      const response = await fetch("/api/suppliers/sync", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sync_type: syncType }),
      })

      if (!response.ok) {
        if (response.status === 401) {
          throw new Error("Please log in to perform sync operations")
        }
        throw new Error(`Sync failed: ${response.statusText}`)
      }

      const result = await response.json()
      if (result.success) {
        toast({
          title: "Sync Completed",
          description: `Successfully synced ${result.sync_log.total_fetched} suppliers`,
        })
        // Refresh suppliers list after sync
        await fetchSuppliers(pagination.page, searchQuery, activeFilter)
      }
    } catch (error) {
      console.error("Error syncing suppliers:", error)
      const errorMessage = error instanceof Error ? error.message : 'Unknown error'
      setError(errorMessage)
      toast({
        title: "Sync Failed",
        description: errorMessage,
        variant: "destructive",
      })
    } finally {
      setSyncing(false)
    }
  }

  // Debounce search input to avoid firing requests on every keystroke
  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearchQuery(searchQuery), 400)
    return () => clearTimeout(t)
  }, [searchQuery])

  // Fetch suppliers with abortable requests and debounced search
  useEffect(() => {
    const controller = new AbortController()
    // Cancel any in-flight request
    if (currentFetchController.current) currentFetchController.current.abort()
    currentFetchController.current = controller
    fetchSuppliers(pagination.page, debouncedSearchQuery, activeFilter, controller.signal)
    return () => controller.abort()
  }, [pagination.page, debouncedSearchQuery, activeFilter])

  // When multi (selected) runs start running, prime the page-scoped polling once
  useEffect(() => {
    // If any selected supplier is running but no visible supplier is marked running yet, refresh page statuses once
    const anyRunningSelected = Object.values(multiRuns || {}).some((r: any) => r?.status === 'running')
    const anyRunningVisible = visibleSupplierIds.some((id) => pageRuns?.[id]?.status === 'running')
    if (selectedSuppliers.length > 0 && anyRunningSelected && !anyRunningVisible) {
      refreshPageStatuses()
    }
  }, [multiRuns, selectedSuppliers, visibleSupplierIds, pageRuns, refreshPageStatuses])

  // Track last updated when workflow runs change (selected or visible page)
  useEffect(() => {
    setLastUpdatedAt(Date.now())
  }, [multiRuns, pageRuns])

  const totalCount = pagination.total
  const filterCounts = {
    all: totalCount,
    ...Object.fromEntries(
      Object.keys(statusConfig).map((key) => [key, suppliers.filter((s) => s.verification_status === key).length]),
    ),
  }

  // Apply local step-based filters on the current page
  const filteredSuppliers = suppliers.filter((s) => {
    const run = pageRuns[s.id] ?? multiRuns[s.id]
    if (stepFilters.running && run?.status !== 'running') return false
    if (stepFilters.hasFail) {
      const hasFail = Array.isArray(run?.steps) && run!.steps.some((st: any) => st?.status === 'fail')
      if (!hasFail) return false
    }
    if (stepFilters.allPass) {
      const map = new Map<string, string>()
      if (Array.isArray(run?.steps)) {
        for (const st of run!.steps) {
          if (st?.step_key && st?.status) map.set(st.step_key, st.status)
        }
      }
      for (const step of Q1_STEPS) {
        if (map.get(step.key) !== 'pass') return false
      }
    }
    return true
  })

  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      setSelectedSuppliers(filteredSuppliers.map((s) => s.id))
    } else {
      setSelectedSuppliers([])
    }
  }

  const handleSelectSupplier = (supplierId: string, checked: boolean) => {
    if (checked) {
      setSelectedSuppliers([...selectedSuppliers, supplierId])
    } else {
      setSelectedSuppliers(selectedSuppliers.filter((id) => id !== supplierId))
    }
  }

  const formatDate = (dateString: string | null) => {
    if (!dateString) return "Never"
    return new Date(dateString).toLocaleDateString("it-IT", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    })
  }

  const formatRelativeTime = (ts: number | null) => {
    if (!ts) return "Never"
    const diff = Math.floor((Date.now() - ts) / 1000)
    if (diff < 60) return `${diff}s ago`
    if (diff < 3600) return `${Math.floor(diff / 60)}m ago`
    if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`
    return `${Math.floor(diff / 86400)}d ago`
  }

  const getVerificationProgress = (supplier: Supplier) => {
    return {
      completed: supplier.verified_documents || 0,
      total: supplier.total_documents || 0,
      percentage: supplier.verification_progress || 0,
    }
  }

  const handleSearch = (query: string) => {
    setSearchQuery(query)
    setPagination((prev) => ({ ...prev, page: 1 }))
  }

  const handleFilterChange = (filter: string) => {
    setActiveFilter(filter)
    setPagination((prev) => ({ ...prev, page: 1 }))
  }

  const exportBulkJSON = () => {
    const data: Record<string, any> = {}
    for (const id of selectedSuppliers) {
      const supplier = suppliers.find((s) => s.id === id)
      data[id] = {
        supplier: supplier
          ? { id: supplier.id, company_name: supplier.company_name, bravo_id: supplier.bravo_id }
          : { id },
        run: multiRuns[id] || null,
      }
    }
    const blob = new Blob([JSON.stringify({ generated_at: new Date().toISOString(), results: data }, null, 2)], {
      type: 'application/json;charset=utf-8',
    })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `bulk-workflow-results-${Date.now()}.json`
    a.click()
    URL.revokeObjectURL(url)
  }

  const exportBulkCSV = () => {
    const header = [
      'SupplierID',
      'BravoID',
      'CompanyName',
      'RunID',
      'RunStatus',
      'Overall',
      'StepOrder',
      'StepKey',
      'StepName',
      'StepStatus',
      'Issues',
      'StepStartedAt',
      'StepEndedAt',
    ]
    const rows: string[][] = [header]

    const esc = (v: any) => {
      const s = v == null ? '' : String(v)
      if (/[",\n]/.test(s)) return '"' + s.replace(/"/g, '""') + '"'
      return s
    }

    for (const id of selectedSuppliers) {
      const supplier = suppliers.find((s) => s.id === id)
      const run = multiRuns[id]
      if (run && Array.isArray(run.steps) && run.steps.length > 0) {
        for (const step of run.steps) {
          rows.push([
            esc(id),
            esc(supplier?.bravo_id || ''),
            esc(supplier?.company_name || ''),
            esc(run.id),
            esc(run.status),
            esc((run as any).overall || ''),
            esc(step.order_index),
            esc(step.step_key),
            esc(step.name),
            esc(step.status),
            esc((step.issues || []).join(' | ')),
            esc(step.started_at || ''),
            esc(step.ended_at || ''),
          ])
        }
      } else {
        // No run found; still include a row for visibility
        rows.push([
          esc(id),
          esc(supplier?.bravo_id || ''),
          esc(supplier?.company_name || ''),
          '',
          'no_run',
          '',
          '',
          '',
          '',
          '',
          '',
          '',
          '',
        ])
      }
    }

    const csv = rows.map((r) => r.join(',')).join('\n')
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `bulk-workflow-results-${Date.now()}.csv`
    a.click()
    URL.revokeObjectURL(url)
  }

  if (error && !suppliers.length) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">Suppliers Management</h1>
            <p className="text-muted-foreground">Manage and verify your supplier certifications</p>
          </div>
        </div>
        <Card>
          <CardContent className="flex items-center justify-center py-12">
            <div className="text-center space-y-4">
              <AlertCircle className="w-12 h-12 text-destructive mx-auto" />
              <div>
                <h3 className="text-lg font-semibold">Unable to load suppliers</h3>
                <p className="text-muted-foreground">{error}</p>
              </div>
              <Button onClick={() => fetchSuppliers(1, "", "all")}>
                <RefreshCw className="w-4 h-4 mr-2" />
                Try Again
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Suppliers Management</h1>
          <p className="text-muted-foreground">
            Manage and verify your supplier certifications
            {syncInfo && (
              <span className="ml-2 text-sm">
                • Last sync: {formatDate(syncInfo.last_sync)} • Total: {syncInfo.total_suppliers}
              </span>
            )}
          </p>
        </div>
        <div className="flex items-center space-x-2">
          <Button variant="outline" onClick={() => triggerSync("INCREMENTAL")} disabled={syncing}>
            {syncing ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <RefreshCw className="w-4 h-4 mr-2" />}
            Sync
          </Button>
          <Button variant="outline">
            <Download className="w-4 h-4 mr-2" />
            Export
          </Button>
          <Button>
            <Building2 className="w-4 h-4 mr-2" />
            Add Supplier
          </Button>
        </div>
      </div>

      {/* Sticky Bulk Toolbar */}
      {selectedSuppliers.length > 0 && (
        <div className="sticky top-0 z-40 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 py-2 px-2 rounded-b-md">
          <div className="flex items-center justify-between">
            <div className="text-sm text-muted-foreground">
              {selectedSuppliers.length} selected • Last updated: {formatRelativeTime(lastUpdatedAt)}
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={async () => {
                  try {
                    await startWorkflows({})
                    toast({ title: "Bulk Verification Started", description: "Workflows are running in the background." })
                  } catch (e) {
                    toast({ title: "Failed to start", description: e instanceof Error ? e.message : "Unknown error", variant: "destructive" })
                  }
                }}
                disabled={multiLoading}
              >
                {multiLoading ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <RefreshCw className="w-4 h-4 mr-2" />}
                Bulk Verify
              </Button>
              <Button variant="outline" size="sm" onClick={() => refreshMultiStatuses()} disabled={multiLoading}>
                Refresh Results
              </Button>
              <Button variant="outline" size="sm" onClick={() => setBulkStatusOpen(true)}>
                <Eye className="w-4 h-4 mr-2" />
                View Status
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={async () => {
                  try {
                    await cancelWorkflows()
                    toast({ title: 'Bulk Cancel Requested', description: 'All selected suppliers have been requested to cancel.' })
                  } catch (e) {
                    toast({ title: 'Cancel failed', description: e instanceof Error ? e.message : 'Unknown error', variant: 'destructive' })
                  }
                }}
                disabled={multiLoading || !multiRunning}
              >
                <Ban className="w-4 h-4 mr-2" />
                Cancel All
              </Button>
              <Button variant="outline" size="sm" onClick={exportBulkJSON} disabled={selectedSuppliers.length === 0}>
                <FileJson className="w-4 h-4 mr-2" />
                Export JSON
              </Button>
              <Button variant="outline" size="sm" onClick={exportBulkCSV} disabled={selectedSuppliers.length === 0}>
                <FileSpreadsheet className="w-4 h-4 mr-2" />
                Export CSV
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Filters and Search */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  placeholder="Search suppliers..."
                  value={searchQuery}
                  onChange={(e) => handleSearch(e.target.value)}
                  className="pl-10 w-80"
                />
              </div>
              <Button variant="outline" size="sm">
                <Filter className="w-4 h-4 mr-2" />
                Advanced Filters
              </Button>
            </div>
            {/* Bulk actions moved to sticky toolbar */}
          </div>
        </CardHeader>
        <CardContent>
          {/* Status Tabs */}
          <div className="flex flex-wrap gap-2">
            <Button
              variant={activeFilter === "all" ? "default" : "outline"}
              size="sm"
              onClick={() => handleFilterChange("all")}
              className="relative"
            >
              All
              <Badge variant="secondary" className="ml-2">
                {filterCounts.all}
              </Badge>
            </Button>
            {Object.entries(statusConfig).map(([key, config]) => (
              <Button
                key={key}
                variant={activeFilter === key ? "default" : "outline"}
                size="sm"
                onClick={() => handleFilterChange(key)}
                className="relative"
              >
                {config.label}
                <Badge variant="secondary" className="ml-2">
                  {(filterCounts as any)[key] || 0}
                </Badge>
              </Button>
            ))}
          </div>

          {/* Legend + Step Filters */}
          <div className="mt-3 flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-3 text-xs">
              <div className="flex items-center gap-1">
                <span className="inline-block w-3 h-3 rounded-full bg-green-500" /> Pass
              </div>
              <div className="flex items-center gap-1">
                <span className="inline-block w-3 h-3 rounded-full bg-red-500" /> Fail
              </div>
              <div className="flex items-center gap-1">
                <span className="inline-block w-3 h-3 rounded-full bg-gray-400" /> Skip
              </div>
              <div className="flex items-center gap-1">
                <span className="inline-block w-3 h-3 rounded-full bg-gray-300" /> Pending
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant={stepFilters.hasFail ? "default" : "outline"}
                size="sm"
                onClick={() => setStepFilters((p) => ({ ...p, hasFail: !p.hasFail }))}
              >
                Has fail
              </Button>
              <Button
                variant={stepFilters.running ? "default" : "outline"}
                size="sm"
                onClick={() => setStepFilters((p) => ({ ...p, running: !p.running }))}
              >
                Running
              </Button>
              <Button
                variant={stepFilters.allPass ? "default" : "outline"}
                size="sm"
                onClick={() => setStepFilters((p) => ({ ...p, allPass: !p.allPass }))}
              >
                All pass
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Suppliers Table */}
      <Card>
        <CardContent className="p-0">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="w-6 h-6 animate-spin mr-2" />
              Loading suppliers...
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-12">
                    <Checkbox
                      checked={selectedSuppliers.length === filteredSuppliers.length && filteredSuppliers.length > 0}
                      onCheckedChange={handleSelectAll}
                    />
                  </TableHead>
                  <TableHead>
                    <Button variant="ghost" size="sm" className="h-auto p-0 font-semibold">
                      Company Name
                      <ArrowUpDown className="w-4 h-4 ml-1" />
                    </Button>
                  </TableHead>
                  <TableHead>
                    <Button variant="ghost" size="sm" className="h-auto p-0 font-semibold">
                      Bravo ID
                      <ArrowUpDown className="w-4 h-4 ml-1" />
                    </Button>
                  </TableHead>
                  <TableHead>
                    <Button variant="ghost" size="sm" className="h-auto p-0 font-semibold">
                      City
                      <ArrowUpDown className="w-4 h-4 ml-1" />
                    </Button>
                  </TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Verification Progress</TableHead>
                  <TableHead>
                    <Button variant="ghost" size="sm" className="h-auto p-0 font-semibold">
                      Last Sync
                      <ArrowUpDown className="w-4 h-4 ml-1" />
                    </Button>
                  </TableHead>
                  <TableHead className="w-12"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredSuppliers.map((supplier) => {
                  const run = pageRuns[supplier.id] ?? multiRuns[supplier.id]
                  return (
                    <TableRow key={supplier.id} className="hover:bg-muted/50">
                      <TableCell>
                        <Checkbox
                          checked={selectedSuppliers.includes(supplier.id)}
                          onCheckedChange={(checked) => handleSelectSupplier(supplier.id, checked as boolean)}
                        />
                      </TableCell>
                      <TableCell>
                        <Link href={`/suppliers/${supplier.bravo_id}`}>
                          <div className="flex items-center space-x-3 hover:text-primary cursor-pointer">
                            <div className="w-8 h-8 bg-primary/10 rounded-lg flex items-center justify-center">
                              <Building2 className="w-4 h-4 text-primary" />
                            </div>
                            <div>
                              <p className="font-medium">{supplier.company_name}</p>
                              <p className="text-sm text-muted-foreground">{supplier.fiscal_code}</p>
                            </div>
                          </div>
                        </Link>
                      </TableCell>
                      <TableCell>
                        <code className="text-sm bg-muted px-2 py-1 rounded">{supplier.bravo_id}</code>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center">
                          <MapPin className="w-4 h-4 mr-1 text-muted-foreground" />
                          {supplier.city}
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge
                          className={cn(
                            "text-xs",
                            statusConfig[supplier.verification_status]?.color || "bg-gray-100 text-gray-800",
                          )}
                        >
                          {statusConfig[supplier.verification_status]?.label || supplier.verification_status}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        {(() => {
                          const stepStatusByKey = new Map<string, string>()
                          if (run?.steps) {
                            for (const s of run.steps) {
                              if (s?.step_key && s?.status) stepStatusByKey.set(s.step_key, s.status)
                            }
                          }
                          const total = Q1_STEPS.length
                          const completed = Q1_STEPS.reduce((acc, s) => acc + (stepStatusByKey.get(s.key) === 'pass' ? 1 : 0), 0)
                          const percent = Math.round((completed / total) * 100)
                          return (
                            <div className="space-y-2">
                              <div className="flex items-center justify-between text-sm">
                                <span>
                                  {completed}/{total} verified
                                </span>
                                <span className="text-muted-foreground">{percent}%</span>
                              </div>
                              <div className="flex space-x-1">
                                {Q1_STEPS.map((s) => {
                                  let st = stepStatusByKey.get(s.key)
                                  if (!st && run && run.status !== 'running') {
                                    st = 'skip'
                                  }
                                  const color = st === 'pass' ? 'bg-green-500' : st === 'fail' ? 'bg-red-500' : st === 'skip' ? 'bg-gray-400' : 'bg-gray-300'
                                  const detail = run?.steps?.find((x: any) => x?.step_key === s.key)
                                  const label = `${s.name}: ${st ? st : run ? 'pending' : 'not started'}`
                                  return (
                                    <Tooltip key={s.key}>
                                      <TooltipTrigger asChild>
                                        <div
                                          className={cn("w-3 h-3 rounded-full", color)}
                                          aria-label={label}
                                          role="img"
                                        />
                                      </TooltipTrigger>
                                      <TooltipContent sideOffset={6}>
                                        <div className="flex flex-col gap-0.5">
                                          <div className="font-medium">{s.name}</div>
                                          <div className="text-xs">Status: {st ? st : run ? 'pending' : 'not started'}</div>
                                          {detail?.started_at && <div className="text-xs">Started: {formatDate(detail.started_at)}</div>}
                                          {detail?.ended_at && <div className="text-xs">Ended: {formatDate(detail.ended_at)}</div>}
                                          {Array.isArray(detail?.issues) && detail!.issues.length > 0 && (
                                            <div className="text-xs">Issues: {detail!.issues.length}</div>
                                          )}
                                        </div>
                                      </TooltipContent>
                                    </Tooltip>
                                  )
                                })}
                              </div>
                            </div>
                          )
                        })()}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center text-sm text-muted-foreground">
                          <Calendar className="w-4 h-4 mr-1" />
                          {formatDate(supplier.last_sync)}
                        </div>
                      </TableCell>
                      <TableCell>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="sm">
                              <MoreHorizontal className="w-4 h-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem asChild>
                              <Link href={`/suppliers/${supplier.bravo_id}`}>
                                <Eye className="w-4 h-4 mr-2" />
                                View Details
                              </Link>
                            </DropdownMenuItem>
                            <DropdownMenuItem>
                              <Edit className="w-4 h-4 mr-2" />
                              Edit Supplier
                            </DropdownMenuItem>
                            <DropdownMenuItem>
                              <CheckCircle className="w-4 h-4 mr-2" />
                              Start Verification
                            </DropdownMenuItem>
                            <DropdownMenuItem className="text-destructive">
                              <Trash2 className="w-4 h-4 mr-2" />
                              Delete
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  )
                })}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Bulk Verification Status Sheet (slide-over) */}
      <Sheet open={isBulkStatusOpen} onOpenChange={setBulkStatusOpen}>
        <SheetContent side="right" className="sm:max-w-xl w-full">
          <SheetHeader>
            <SheetTitle>Bulk Verification Status</SheetTitle>
            <SheetDescription>{multiRunning ? "Running... auto-refreshing" : "Idle"}</SheetDescription>
          </SheetHeader>
          <div className="px-4 pb-4">
            <div className="flex items-center space-x-2 mb-3">
              <Button variant="outline" size="sm" onClick={() => refreshMultiStatuses()} disabled={multiLoading}>
                {multiLoading ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <RefreshCw className="w-4 h-4 mr-2" />}
                Refresh
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={async () => {
                  try {
                    await cancelWorkflows()
                    toast({ title: 'Bulk Cancel Requested', description: 'All selected suppliers have been requested to cancel.' })
                  } catch (e) {
                    toast({ title: 'Cancel failed', description: e instanceof Error ? e.message : 'Unknown error', variant: 'destructive' })
                  }
                }}
                disabled={multiLoading || !multiRunning}
              >
                <Ban className="w-4 h-4 mr-2" />
                Cancel All
              </Button>
              <Button variant="outline" size="sm" onClick={exportBulkJSON}>
                <FileJson className="w-4 h-4 mr-2" />
                Export JSON
              </Button>
              <Button variant="outline" size="sm" onClick={exportBulkCSV}>
                <FileSpreadsheet className="w-4 h-4 mr-2" />
                Export CSV
              </Button>
            </div>
            <ScrollArea className="h-[75vh] pr-4">
              <div className="space-y-4">
                {selectedSuppliers.length === 0 && (
                  <p className="text-sm text-muted-foreground">Select suppliers to view their verification status.</p>
                )}
                {selectedSuppliers.map((id) => {
                  const supplier = suppliers.find((s) => s.id === id)
                  const run = multiRuns[id]
                  const status = run?.status || 'no_run'
                  return (
                    <div key={id} className="border rounded-md p-3">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-2">
                          <div className="w-8 h-8 bg-primary/10 rounded-lg flex items-center justify-center">
                            <Building2 className="w-4 h-4 text-primary" />
                          </div>
                          <div>
                            <p className="font-medium">{supplier?.company_name || id}</p>
                            <p className="text-xs text-muted-foreground">{supplier?.fiscal_code || supplier?.bravo_id}</p>
                          </div>
                        </div>
                        <Badge
                          className={cn(
                            "text-xs",
                            status === 'running'
                              ? 'bg-blue-100 text-blue-800'
                              : status === 'completed'
                              ? 'bg-green-100 text-green-800'
                              : status === 'failed'
                              ? 'bg-red-100 text-red-800'
                              : status === 'canceled'
                              ? 'bg-gray-100 text-gray-800'
                              : 'bg-yellow-100 text-yellow-800'
                          )}
                        >
                          {status === 'no_run' ? 'No Run' : status}
                        </Badge>
                      </div>
                      {multiErrors[id] && (
                        <p className="mt-2 text-sm text-destructive">{multiErrors[id]}</p>
                      )}
                      {run && run.steps?.length > 0 && (
                        <div className="mt-3 grid grid-cols-1 md:grid-cols-2 gap-3">
                          {run.steps.map((step) => (
                            <div key={step.id || step.step_key + step.order_index} className="border rounded p-2">
                              <div className="flex items-center justify-between">
                                <span className="text-sm font-medium">{step.name}</span>
                                <Badge
                                  className={cn(
                                    "text-2xs",
                                    step.status === 'pass'
                                      ? 'bg-green-100 text-green-800'
                                      : step.status === 'fail'
                                      ? 'bg-red-100 text-red-800'
                                      : 'bg-gray-100 text-gray-800'
                                  )}
                                >
                                  {step.status}
                                </Badge>
                              </div>
                              {step.issues && step.issues.length > 0 && (
                                <ul className="mt-2 list-disc list-inside text-xs text-muted-foreground space-y-1">
                                  {step.issues.map((iss, idx) => (
                                    <li key={idx}>{iss}</li>
                                  ))}
                                </ul>
                              )}
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  )
                })}
              </div>
            </ScrollArea>
          </div>
        </SheetContent>
      </Sheet>

      {pagination.pages > 1 && (
        <div className="flex items-center justify-between">
          <p className="text-sm text-muted-foreground">
            Showing {(pagination.page - 1) * pagination.limit + 1} to{" "}
            {Math.min(pagination.page * pagination.limit, pagination.total)} of {pagination.total} suppliers
          </p>
          <div className="flex items-center space-x-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setPagination((prev) => ({ ...prev, page: prev.page - 1 }))}
              disabled={pagination.page <= 1}
            >
              Previous
            </Button>
            <span className="text-sm">
              Page {pagination.page} of {pagination.pages}
            </span>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setPagination((prev) => ({ ...prev, page: prev.page + 1 }))}
              disabled={pagination.page >= pagination.pages}
            >
              Next
            </Button>
          </div>
        </div>
      )}
    </div>
  )
}
