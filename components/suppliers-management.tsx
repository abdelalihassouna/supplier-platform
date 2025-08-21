"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardHeader } from "@/components/ui/card"
import { Checkbox } from "@/components/ui/checkbox"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { useToast } from "@/hooks/use-toast"
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
} from "lucide-react"
import { cn } from "@/lib/utils"
import Link from "next/link"

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

  const fetchSuppliers = async (page = 1, search = "", status = "") => {
    try {
      setLoading(true)
      setError(null)
      const params = new URLSearchParams({
        page: page.toString(),
        limit: pagination.limit.toString(),
      })

      if (search) params.append("search", search)
      if (status && status !== "all") params.append("status", status)

      const response = await fetch(`/api/suppliers?${params}`)

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

  useEffect(() => {
    fetchSuppliers(pagination.page, searchQuery, activeFilter)
  }, [pagination.page, searchQuery, activeFilter])

  const totalCount = pagination.total
  const filterCounts = {
    all: totalCount,
    ...Object.fromEntries(
      Object.keys(statusConfig).map((key) => [key, suppliers.filter((s) => s.verification_status === key).length]),
    ),
  }

  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      setSelectedSuppliers(suppliers.map((s) => s.id))
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
            {selectedSuppliers.length > 0 && (
              <div className="flex items-center space-x-2">
                <span className="text-sm text-muted-foreground">{selectedSuppliers.length} selected</span>
                <Button variant="outline" size="sm">
                  Bulk Verify
                </Button>
                <Button variant="outline" size="sm">
                  Export Selected
                </Button>
              </div>
            )}
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
                      checked={selectedSuppliers.length === suppliers.length && suppliers.length > 0}
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
                {suppliers.map((supplier) => {
                  const progress = getVerificationProgress(supplier)
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
                        <div className="space-y-2">
                          <div className="flex items-center justify-between text-sm">
                            <span>
                              {progress.completed}/{progress.total} verified
                            </span>
                            <span className="text-muted-foreground">{progress.percentage}%</span>
                          </div>
                          <div className="flex space-x-1">
                            {Array.from({ length: progress.total }).map((_, index) => (
                              <div
                                key={index}
                                className={cn(
                                  "w-3 h-3 rounded-full",
                                  index < progress.completed ? "bg-green-500" : "bg-gray-300",
                                )}
                                title={`Certification ${index + 1}: ${index < progress.completed ? "completed" : "pending"}`}
                              />
                            ))}
                          </div>
                        </div>
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
