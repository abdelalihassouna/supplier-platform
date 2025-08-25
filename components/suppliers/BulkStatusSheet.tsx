"use client"

import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import type { Supplier } from "@/components/suppliers/types"
import { Building2, RefreshCw, Loader2, Ban, FileJson, FileSpreadsheet } from "lucide-react"

interface BulkStatusSheetProps {
  isOpen: boolean
  onOpenChange: (open: boolean) => void
  selectedSuppliers: string[]
  suppliers: Supplier[]
  multiRuns: Record<string, any>
  multiErrors: Record<string, string | null>
  multiLoading: boolean
  multiRunning: boolean
  onRefreshBulk: () => void
  onCancelBulk: () => Promise<void> | void
  exportBulkJSON: () => void
  exportBulkCSV: () => void
  formatDate: (date: string | null) => string
}

export function BulkStatusSheet(props: BulkStatusSheetProps) {
  const {
    isOpen,
    onOpenChange,
    selectedSuppliers,
    suppliers,
    multiRuns,
    multiErrors,
    multiLoading,
    multiRunning,
    onRefreshBulk,
    onCancelBulk,
    exportBulkJSON,
    exportBulkCSV,
    formatDate,
  } = props

  return (
    <Sheet open={isOpen} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="sm:max-w-xl w-full">
        <SheetHeader>
          <SheetTitle>Bulk Verification Status</SheetTitle>
          <SheetDescription>{multiRunning ? "Running... auto-refreshing" : "Idle"}</SheetDescription>
        </SheetHeader>
        <div className="px-4 pb-4">
          <div className="flex items-center space-x-2 mb-3">
            <Button variant="outline" size="sm" onClick={() => onRefreshBulk()} disabled={multiLoading}>
              {multiLoading ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <RefreshCw className="w-4 h-4 mr-2" />}
              Refresh
            </Button>
            <Button variant="outline" size="sm" onClick={() => onCancelBulk()} disabled={multiLoading || !multiRunning}>
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
                        {run.steps.map((step: any) => (
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
                                {step.issues.map((iss: string, idx: number) => (
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
  )
}
