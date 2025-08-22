'use client'

import { useState, useEffect, useCallback } from 'react'
import { WorkflowRunResult, Q1WorkflowOptions } from '@/lib/workflows/q1-orchestrator'

interface UseWorkflowProps {
  supplierId: string
  autoRefresh?: boolean
  refreshInterval?: number
}

interface WorkflowState {
  workflowRun: WorkflowRunResult | null
  isLoading: boolean
  isRunning: boolean
  error: string | null
}

export function useWorkflow({ 
  supplierId, 
  autoRefresh = true, 
  refreshInterval = 2000 
}: UseWorkflowProps) {
  const [state, setState] = useState<WorkflowState>({
    workflowRun: null,
    isLoading: false,
    isRunning: false,
    error: null
  })

  // Fetch workflow status
  const fetchWorkflowStatus = useCallback(async () => {
    try {
      const response = await fetch(`/api/workflows/status?supplierId=${supplierId}`)
      if (!response.ok) {
        throw new Error('Failed to fetch workflow status')
      }
      const data = await response.json()
      
      setState(prev => ({
        ...prev,
        workflowRun: data.workflowRun,
        isRunning: data.workflowRun?.status === 'running',
        error: null
      }))
      
      return data.workflowRun
    } catch (error) {
      setState(prev => ({
        ...prev,
        error: error instanceof Error ? error.message : 'Unknown error'
      }))
      return null
    }
  }, [supplierId])

  // Start workflow
  const startWorkflow = useCallback(async (options: Q1WorkflowOptions = {}) => {
    setState(prev => ({ ...prev, isLoading: true, error: null }))
    
    try {
      const response = await fetch('/api/workflows/start', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ supplierId, options })
      })
      
      if (!response.ok) {
        throw new Error('Failed to start workflow')
      }
      
      const data = await response.json()
      
      setState(prev => ({
        ...prev,
        workflowRun: data.workflowRun,
        isRunning: true,
        isLoading: false
      }))
      
      return data.workflowRun
    } catch (error) {
      setState(prev => ({
        ...prev,
        isLoading: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      }))
      throw error
    }
  }, [supplierId])

  // Retry step
  const retryStep = useCallback(async (stepKey: string) => {
    setState(prev => ({ ...prev, isLoading: true, error: null }))
    
    try {
      const response = await fetch('/api/workflows/retry-step', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ supplierId, stepKey })
      })
      
      if (!response.ok) {
        throw new Error('Failed to retry step')
      }
      
      const data = await response.json()
      
      setState(prev => ({
        ...prev,
        workflowRun: data.workflowRun,
        isLoading: false
      }))
      
      return data.workflowRun
    } catch (error) {
      setState(prev => ({
        ...prev,
        isLoading: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      }))
      throw error
    }
  }, [supplierId])

  // Start specific step
  const startStep = useCallback(async (stepKey: string) => {
    setState(prev => ({ ...prev, isLoading: true, error: null }))
    
    try {
      const response = await fetch('/api/workflows/start-step', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ supplierId, stepKey })
      })
      
      if (!response.ok) {
        throw new Error('Failed to start step')
      }
      
      const data = await response.json()
      
      setState(prev => ({
        ...prev,
        workflowRun: data.workflowRun,
        isLoading: false
      }))
      
      return data.workflowRun
    } catch (error) {
      setState(prev => ({
        ...prev,
        isLoading: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      }))
      throw error
    }
  }, [supplierId])

  // Cancel workflow
  const cancelWorkflow = useCallback(async () => {
    setState(prev => ({ ...prev, isLoading: true, error: null }))
    
    try {
      const response = await fetch('/api/workflows/cancel', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ supplierId })
      })
      
      if (!response.ok) {
        throw new Error('Failed to cancel workflow')
      }
      
      const data = await response.json()
      
      setState(prev => ({
        ...prev,
        workflowRun: data.workflowRun,
        isRunning: false,
        isLoading: false
      }))
      
      return data.workflowRun
    } catch (error) {
      setState(prev => ({
        ...prev,
        isLoading: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      }))
      throw error
    }
  }, [supplierId])

  // Auto-refresh when workflow is running
  useEffect(() => {
    if (!autoRefresh || !state.isRunning) return

    const interval = setInterval(() => {
      fetchWorkflowStatus()
    }, refreshInterval)

    return () => clearInterval(interval)
  }, [autoRefresh, state.isRunning, refreshInterval, fetchWorkflowStatus])

  // Initial fetch
  useEffect(() => {
    fetchWorkflowStatus()
  }, [fetchWorkflowStatus])

  return {
    ...state,
    startWorkflow,
    retryStep,
    startStep,
    cancelWorkflow,
    refreshStatus: fetchWorkflowStatus
  }
}
