'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { type WorkflowRunResult, type Q1WorkflowOptions } from '@/lib/workflows/q1-orchestrator'

export interface UseMultiWorkflowProps {
  supplierIds: string[]
  autoRefresh?: boolean
  refreshInterval?: number
}

export interface MultiWorkflowState {
  runs: Record<string, WorkflowRunResult | null>
  isLoading: boolean
  isRunning: boolean
  errors: Record<string, string | null>
}

export function useMultiWorkflow({
  supplierIds,
  autoRefresh = true,
  refreshInterval = 2000,
}: UseMultiWorkflowProps) {
  const [state, setState] = useState<MultiWorkflowState>({
    runs: {},
    isLoading: false,
    isRunning: false,
    errors: {},
  })

  const hasSuppliers = Array.isArray(supplierIds) && supplierIds.length > 0
  const inFlight = useRef(false)

  // Fetch workflow statuses for all suppliers
  const fetchStatuses = useCallback(async () => {
    if (!hasSuppliers) return null
    if (inFlight.current) return null
    inFlight.current = true
    try {
      const response = await fetch('/api/workflows/status-multi', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ supplierIds }),
      })
      if (!response.ok) {
        throw new Error('Failed to fetch workflow statuses')
      }
      const data = await response.json()
      const results: Record<string, { workflowRun: WorkflowRunResult | null }> = data.results || {}

      const runs: Record<string, WorkflowRunResult | null> = {}
      const errors: Record<string, string | null> = {}
      for (const id of supplierIds) {
        const entry = results[id]
        runs[id] = entry?.workflowRun ?? null
        errors[id] = (entry as any)?.error ?? null
      }

      const anyRunning = Object.values(runs).some((run) => run?.status === 'running')

      setState((prev) => ({
        ...prev,
        runs,
        isRunning: anyRunning,
        errors,
        isLoading: false,
      }))

      return runs
    } catch (error) {
      setState((prev) => ({
        ...prev,
        isLoading: false,
      }))
      return null
    } finally {
      inFlight.current = false
    }
  }, [supplierIds, hasSuppliers])

  // Start workflows for all suppliers
  const startWorkflows = useCallback(
    async (options: Q1WorkflowOptions = {}) => {
      if (!hasSuppliers) return
      setState((prev) => ({ ...prev, isLoading: true }))
      try {
        const finalOptions: Q1WorkflowOptions = { includeSOA: true, ...options }
        const response = await fetch('/api/workflows/start-multi', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ supplierIds, options: finalOptions }),
        })
        if (!response.ok) {
          throw new Error('Failed to start workflows')
        }
        // Immediately mark as running; polling will fill details
        setState((prev) => ({ ...prev, isRunning: true, isLoading: false }))
        return true
      } catch (error) {
        setState((prev) => ({ ...prev, isLoading: false }))
        throw error
      }
    },
    [supplierIds, hasSuppliers]
  )

  // Cancel workflows for all suppliers
  const cancelWorkflows = useCallback(async () => {
    if (!hasSuppliers) return
    setState((prev) => ({ ...prev, isLoading: true }))
    try {
      await Promise.all(
        supplierIds.map((id) =>
          fetch('/api/workflows/cancel', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ supplierId: id }),
          })
        )
      )
      await fetchStatuses()
      setState((prev) => ({ ...prev, isLoading: false, isRunning: false }))
      return true
    } catch (error) {
      setState((prev) => ({ ...prev, isLoading: false }))
      throw error
    }
  }, [supplierIds, hasSuppliers, fetchStatuses])

  const clear = useCallback(() => {
    setState({ runs: {}, isLoading: false, isRunning: false, errors: {} })
  }, [])

  // Auto refresh when running (skip when tab hidden) and refresh on visibility change
  useEffect(() => {
    if (!autoRefresh || !state.isRunning || !hasSuppliers) return

    const tick = () => {
      if (typeof document !== 'undefined' && document.hidden) return
      fetchStatuses()
    }

    const interval = setInterval(tick, refreshInterval)

    const onVisibility = () => {
      if (typeof document !== 'undefined' && !document.hidden) {
        fetchStatuses()
      }
    }
    if (typeof document !== 'undefined') {
      document.addEventListener('visibilitychange', onVisibility)
    }

    return () => {
      clearInterval(interval)
      if (typeof document !== 'undefined') {
        document.removeEventListener('visibilitychange', onVisibility)
      }
    }
  }, [autoRefresh, state.isRunning, refreshInterval, fetchStatuses, hasSuppliers])

  // Initial fetch when suppliers change
  useEffect(() => {
    if (!hasSuppliers) return
    fetchStatuses()
  }, [fetchStatuses, hasSuppliers])

  return {
    ...state,
    startWorkflows,
    cancelWorkflows,
    refreshStatuses: fetchStatuses,
    clear,
  }
}
