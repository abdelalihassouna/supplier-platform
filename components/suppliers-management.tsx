"use client"

import { useState, useEffect, useRef, useMemo } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { useToast } from "@/hooks/use-toast"
import { useMultiWorkflow } from "@/hooks/use-multi-workflow"
import { AlertCircle, RefreshCw } from "lucide-react"
import { FiltersBar } from "@/components/suppliers/FiltersBar"
import { SuppliersTable } from "@/components/suppliers/SuppliersTable"
import { BulkStatusSheet } from "@/components/suppliers/BulkStatusSheet"
import { statusConfig, Q1_STEPS } from "@/components/suppliers/constants"

import type { Supplier } from "@/components/suppliers/types"

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

export function SuppliersManagement() {
  const { toast } = useToast()
  const [suppliers, setSuppliers] = useState<Supplier[]>([])
  const [loading, setLoading] = useState(true)
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

  

  const totalCount = pagination.total
  const filterCounts = {
    all: totalCount,
    ...Object.fromEntries(
      Object.keys(statusConfig).map((key) => [key, suppliers.filter((s) => s.verification_status === key).length]),
    ),
  }

  // Apply local step-based filters on the current page
  const filteredSuppliers = suppliers.filter((s) => {
    const pr = pageRuns[s.id]
    const mr = multiRuns[s.id]
    if (stepFilters.running) {
      const isRunning = pr?.status === 'running' || mr?.status === 'running'
      if (!isRunning) return false
    }
    const run = pr ?? mr
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

  // Bulk action handlers for subcomponents
  const handleStartBulk = async () => {
    try {
      await startWorkflows({})
      toast({ title: "Bulk Verification Started", description: "Workflows are running in the background." })
    } catch (e) {
      toast({ title: "Failed to start", description: e instanceof Error ? e.message : "Unknown error", variant: "destructive" })
    }
  }

  const handleRefreshBulk = () => {
    refreshMultiStatuses()
  }

  const handleCancelBulk = async () => {
    try {
      await cancelWorkflows()
      toast({ title: 'Bulk Cancel Requested', description: 'All selected suppliers have been requested to cancel.' })
    } catch (e) {
      toast({ title: 'Cancel failed', description: e instanceof Error ? e.message : 'Unknown error', variant: 'destructive' })
    }
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
      </div>

      {/* Filters and Search */}
      <FiltersBar
        searchQuery={searchQuery}
        onSearchChange={handleSearch}
        activeFilter={activeFilter}
        onFilterChange={handleFilterChange}
        filterCounts={filterCounts as Record<string, number>}
        stepFilters={stepFilters}
        setStepFilters={setStepFilters}
        selectedCount={selectedSuppliers.length}
        onStartBulk={handleStartBulk}
        onRefreshBulk={handleRefreshBulk}
        onCancelBulk={handleCancelBulk}
        onOpenBulkStatus={() => setBulkStatusOpen(true)}
        multiLoading={multiLoading}
        multiRunning={multiRunning}
        onExportJSON={exportBulkJSON}
        onExportCSV={exportBulkCSV}
      />

      {/* Suppliers Table */}
      <SuppliersTable
        suppliers={filteredSuppliers}
        selectedSuppliers={selectedSuppliers}
        onSelectAll={handleSelectAll}
        onSelectSupplier={handleSelectSupplier}
        pageRuns={pageRuns}
        multiRuns={multiRuns}
        loading={loading}
        formatDate={formatDate}
      />

      {/* Bulk Verification Status Sheet (slide-over) */}
      <BulkStatusSheet
        isOpen={isBulkStatusOpen}
        onOpenChange={setBulkStatusOpen}
        selectedSuppliers={selectedSuppliers}
        suppliers={suppliers}
        multiRuns={multiRuns}
        multiErrors={multiErrors}
        multiLoading={multiLoading}
        multiRunning={multiRunning}
        onRefreshBulk={handleRefreshBulk}
        onCancelBulk={handleCancelBulk}
        exportBulkJSON={exportBulkJSON}
        exportBulkCSV={exportBulkCSV}
        formatDate={formatDate}
      />

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
