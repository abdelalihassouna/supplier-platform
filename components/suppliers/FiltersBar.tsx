"use client"

import type React from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardHeader } from "@/components/ui/card"
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { statusConfig } from "@/components/suppliers/constants"
import {
  Search,
  Filter,
  Info,
  SlidersHorizontal,
  MoreHorizontal,
  Download,
  RefreshCw,
  Ban,
  Eye,
  FileJson,
  FileSpreadsheet,
} from "lucide-react"

export type StepFilters = { hasFail: boolean; running: boolean; allPass: boolean }

interface FiltersBarProps {
  searchQuery: string
  onSearchChange: (val: string) => void
  activeFilter: string
  onFilterChange: (val: string) => void
  filterCounts: Record<string, number>
  stepFilters: StepFilters
  setStepFilters: React.Dispatch<React.SetStateAction<StepFilters>>
  selectedCount: number
  onStartBulk: () => Promise<void> | void
  onRefreshBulk: () => void
  onCancelBulk: () => Promise<void> | void
  onOpenBulkStatus: () => void
  multiLoading: boolean
  multiRunning: boolean
  onExportJSON: () => void
  onExportCSV: () => void
}

export function FiltersBar(props: FiltersBarProps) {
  const {
    searchQuery,
    onSearchChange,
    activeFilter,
    onFilterChange,
    filterCounts,
    stepFilters,
    setStepFilters,
    selectedCount,
    onStartBulk,
    onRefreshBulk,
    onCancelBulk,
    onOpenBulkStatus,
    multiLoading,
    multiRunning,
    onExportJSON,
    onExportCSV,
  } = props

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Search suppliers..."
                value={searchQuery}
                onChange={(e) => onSearchChange(e.target.value)}
                className="pl-10 w-80"
              />
            </div>
            <Button variant="outline" size="sm">
              <Filter className="w-4 h-4 mr-2" />
              Advanced Filters
            </Button>
          </div>
          {/* Bulk actions moved to compact toolbar */}
        </div>
      </CardHeader>
      <CardContent>
        {/* Compact Filter Bar */}
        <div className="flex items-center justify-between gap-3 flex-wrap">
          {/* Status Filter: Segmented control (md+) and Select (sm) */}
          <div className="flex items-center gap-2">
            <div className="hidden md:block">
              <ToggleGroup
                type="single"
                value={activeFilter}
                onValueChange={(val) => {
                  if (val) onFilterChange(val)
                }}
                className="bg-muted/50 p-0.5 rounded-md"
              >
                <ToggleGroupItem value="all" aria-label="All suppliers" className="px-3">
                  <span className="whitespace-nowrap">All</span>
                  <Badge variant="secondary" className="ml-2">
                    {filterCounts.all}
                  </Badge>
                </ToggleGroupItem>
                {Object.entries(statusConfig).map(([key, config]) => (
                  <ToggleGroupItem key={key} value={key} aria-label={config.label} className="px-3">
                    <span className="whitespace-nowrap">{config.label}</span>
                    <Badge variant="secondary" className="ml-2">
                      {(filterCounts as any)[key] || 0}
                    </Badge>
                  </ToggleGroupItem>
                ))}
              </ToggleGroup>
            </div>
            <div className="md:hidden">
              <Select value={activeFilter} onValueChange={(val) => onFilterChange(val)}>
                <SelectTrigger size="sm" className="w-[200px]">
                  <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All ({filterCounts.all})</SelectItem>
                  {Object.entries(statusConfig).map(([key, config]) => (
                    <SelectItem key={key} value={key}>
                      {config.label} ({(filterCounts as any)[key] || 0})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Step Filters + Legend (compact) */}
          <div className="flex items-center gap-2 flex-wrap justify-end">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="sm">
                  <SlidersHorizontal className="w-4 h-4 mr-2" />
                  Step Filters
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-48">
                <DropdownMenuLabel>Filter by steps</DropdownMenuLabel>
                <DropdownMenuCheckboxItem
                  checked={stepFilters.hasFail}
                  onCheckedChange={() => setStepFilters((p) => ({ ...p, hasFail: !p.hasFail }))}
                >
                  Has fail
                </DropdownMenuCheckboxItem>
                <DropdownMenuCheckboxItem
                  checked={stepFilters.running}
                  onCheckedChange={() => setStepFilters((p) => ({ ...p, running: !p.running }))}
                >
                  Running
                </DropdownMenuCheckboxItem>
                <DropdownMenuCheckboxItem
                  checked={stepFilters.allPass}
                  onCheckedChange={() => setStepFilters((p) => ({ ...p, allPass: !p.allPass }))}
                >
                  All pass
                </DropdownMenuCheckboxItem>
              </DropdownMenuContent>
            </DropdownMenu>

            <Popover>
              <PopoverTrigger asChild>
                <Button variant="ghost" size="sm">
                  <Info className="w-4 h-4 mr-2" />
                  Legend
                </Button>
              </PopoverTrigger>
              <PopoverContent align="end">
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
              </PopoverContent>
            </Popover>

            {selectedCount > 0 && (
              <>
                <span className="text-xs text-muted-foreground">{selectedCount} selected</span>

                {/* Bulk Actions Dropdown */}
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="outline" size="sm">
                      <MoreHorizontal className="w-4 h-4 mr-2" />
                      Bulk Actions
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="w-56">
                    <DropdownMenuLabel>Workflow</DropdownMenuLabel>
                    <DropdownMenuItem onClick={() => onStartBulk()} disabled={multiLoading}>
                      <RefreshCw className="w-4 h-4 mr-2" />
                      Start Verification
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => onRefreshBulk()} disabled={multiLoading}>
                      <RefreshCw className="w-4 h-4 mr-2" />
                      Refresh Results
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => onCancelBulk()} disabled={multiLoading || !multiRunning}>
                      <Ban className="w-4 h-4 mr-2" />
                      Cancel All
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>

                {/* Export Dropdown */}
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="outline" size="sm" disabled={selectedCount === 0}>
                      <Download className="w-4 h-4 mr-2" />
                      Export
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem onClick={onExportJSON} disabled={selectedCount === 0}>
                      <FileJson className="w-4 h-4 mr-2" />
                      Export JSON
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={onExportCSV} disabled={selectedCount === 0}>
                      <FileSpreadsheet className="w-4 h-4 mr-2" />
                      Export CSV
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>

                {/* View Status button */}
                <Button variant="outline" size="sm" onClick={onOpenBulkStatus}>
                  <Eye className="w-4 h-4 mr-2" />
                  View Status
                </Button>
              </>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
