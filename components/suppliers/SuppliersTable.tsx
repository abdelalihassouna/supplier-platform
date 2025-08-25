"use client"

import Link from "next/link"
import { Card, CardContent } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import { Badge } from "@/components/ui/badge"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { cn } from "@/lib/utils"
import { Q1_STEPS, statusConfig } from "@/components/suppliers/constants"
import type { Supplier } from "@/components/suppliers/types"
import {
  ArrowUpDown,
  Building2,
  MapPin,
  MoreHorizontal,
  Eye,
  Edit,
  CheckCircle,
  Calendar,
  Loader2,
} from "lucide-react"
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip"

interface SuppliersTableProps {
  suppliers: Supplier[]
  selectedSuppliers: string[]
  onSelectAll: (checked: boolean) => void
  onSelectSupplier: (id: string, checked: boolean) => void
  pageRuns: Record<string, any>
  multiRuns: Record<string, any>
  loading: boolean
  formatDate: (date: string | null) => string
}

export function SuppliersTable(props: SuppliersTableProps) {
  const { suppliers, selectedSuppliers, onSelectAll, onSelectSupplier, pageRuns, multiRuns, loading, formatDate } = props

  return (
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
                    onCheckedChange={(checked) => onSelectAll(checked as boolean)}
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
                const run = pageRuns[supplier.id] ?? multiRuns[supplier.id]
                return (
                  <TableRow key={supplier.id} className="hover:bg-muted/50">
                    <TableCell>
                      <Checkbox
                        checked={selectedSuppliers.includes(supplier.id)}
                        onCheckedChange={(checked) => onSelectSupplier(supplier.id, checked as boolean)}
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
                      <Badge className={cn("text-xs", statusConfig[supplier.verification_status]?.color || "bg-gray-100 text-gray-800")}>
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
                                      <div className={cn("w-3 h-3 rounded-full", color)} aria-label={label} role="img" />
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
                            <span className="flex items-center">
                              <span className="mr-2"><svg className="w-0 h-0"/></span>
                              Delete
                            </span>
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
  )
}
