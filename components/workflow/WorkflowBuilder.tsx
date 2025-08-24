'use client'

import React, { useState, useCallback, useRef, useMemo, useEffect } from 'react'
import type { WorkflowRunResult } from '@/lib/workflows/q1-orchestrator'
import ReactFlow, {
  Node,
  Edge,
  addEdge,
  Connection,
  useNodesState,
  useEdgesState,
  Controls,
  MiniMap,
  Background,
  ReactFlowProvider,
  ReactFlowInstance,
  NodeTypes,
  MarkerType,
  OnConnect,
  IsValidConnection,
  updateEdge,
} from 'reactflow'
import 'reactflow/dist/style.css'

import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { ScrollArea } from '@/components/ui/scroll-area'
import { useToast } from '@/components/ui/use-toast'
import { Separator } from '@/components/ui/separator'
import { DocumentVerificationResults } from '@/components/document-verification-results'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  Save,
  Download,
  Upload,
  FolderOpen,
  X,
  Play,
  Trash2,
  Wand2,
  Maximize2,
} from 'lucide-react'

import { BuilderNode } from './CustomNode'
import { BuilderNodeData, VerificationKind } from './types'
import { nodeTemplates, getTemplateByKey } from './templates'
import { genId } from './utils'

// Node types map
const nodeTypes: NodeTypes = {
  builderNode: BuilderNode,
}

export function WorkflowBuilder() {
  const { toast } = useToast()

  const [nodes, setNodes, onNodesChange] = useNodesState<BuilderNodeData>([])
  const [edges, setEdges, onEdgesChange] = useEdgesState([])
  const [selectedNode, setSelectedNode] = useState<Node<BuilderNodeData> | null>(null)

  const [workflowName, setWorkflowName] = useState('New Workflow')
  const [workflowDescription, setWorkflowDescription] = useState('')

  const [savedTemplates, setSavedTemplates] = useState<any[]>([])
  const [showTemplates, setShowTemplates] = useState(false)
  const [currentTemplateId, setCurrentTemplateId] = useState<string | null>(null)

  const [isSaving, setIsSaving] = useState(false)
  const [isExporting, setIsExporting] = useState(false)
  const [isLoadingTemplates, setIsLoadingTemplates] = useState(false)
  const [showSaveDialog, setShowSaveDialog] = useState(false)

  const [autoFit, setAutoFit] = useState<boolean>(true)

  // Run workflow (supplier-based) state
  const [showRunDialog, setShowRunDialog] = useState(false)
  const [runSupplierId, setRunSupplierId] = useState('')
  const [includeSOA, setIncludeSOA] = useState(true)
  const [includeWhiteList, setIncludeWhiteList] = useState(false)
  const [runLoading, setRunLoading] = useState(false)
  const [lastRun, setLastRun] = useState<WorkflowRunResult | null>(null)

  const reactFlowWrapper = useRef<HTMLDivElement>(null)
  const [reactFlowInstance, setReactFlowInstance] = useState<ReactFlowInstance | null>(null)
  const pollTimerRef = useRef<number | null>(null)

  const hasStart = useMemo(() => nodes.some((n) => n.data.type === 'start'), [nodes])

  // Connection validation
  const isValidConnection = useCallback<IsValidConnection>(
    (connection) => {
      if (!connection.source || !connection.target) return false
      const sourceNode = nodes.find((n) => n.id === connection.source)
      const targetNode = nodes.find((n) => n.id === connection.target)
      if (!sourceNode || !targetNode) return false

      if (targetNode.data.type === 'start') return false // Start cannot have incoming
      if (sourceNode.data.type === 'end') return false // End cannot have outgoing
      if (sourceNode.id === targetNode.id) return false // No self loops

      return true
    },
    [nodes]
  )

  // Connect with labels for decision branches
  const onConnect = useCallback<OnConnect>(
    (params) => {
      const isYes = params.sourceHandle === 'yes'
      const isNo = params.sourceHandle === 'no'

      setEdges((eds) =>
        addEdge(
          {
            ...params,
            type: 'default',
            animated: isYes || isNo,
            label: isYes ? 'Yes' : isNo ? 'No' : undefined,
            style: isYes
              ? { stroke: '#16a34a' }
              : isNo
              ? { stroke: '#dc2626' }
              : { stroke: '#6b7280' },
            markerEnd: {
              type: MarkerType.ArrowClosed,
              color: isYes ? '#16a34a' : isNo ? '#dc2626' : '#6b7280',
            },
          },
          eds
        )
      )
    },
    [setEdges]
  )

  // Drag over canvas
  const onDragOver = useCallback((event: React.DragEvent) => {
    event.preventDefault()
    event.dataTransfer.dropEffect = 'move'
  }, [])

  // Drop to create node from template
  const onDrop = useCallback(
    (event: React.DragEvent) => {
      event.preventDefault()

      const bounds = reactFlowWrapper.current?.getBoundingClientRect()
      const key = event.dataTransfer.getData('application/reactflow/template')

      if (!key || !bounds || !reactFlowInstance) return

      const template = getTemplateByKey(key)
      if (!template) return

      // Prevent multiple Start nodes
      if (template.type === 'start' && hasStart) {
        toast({ title: 'Only one Start node allowed', variant: 'destructive' })
        return
      }

      const position = reactFlowInstance.project({
        x: event.clientX - bounds.left,
        y: event.clientY - bounds.top,
      })

      const id = genId(template.type)
      const newNode: Node<BuilderNodeData> = {
        id,
        type: 'builderNode',
        position,
        data: {
          id,
          label: template.label,
          type: template.type,
          verificationType: template.verificationType,
          analysisId: '',
          config: {
            timeout: 300,
            retries: 3,
            required: true,
            description: template.description,
          },
        },
      }

      setNodes((nds) => nds.concat(newNode))
    },
    [reactFlowInstance, setNodes, hasStart, toast]
  )

  const onDragStart = (event: React.DragEvent, templateKey: string) => {
    event.dataTransfer.setData('application/reactflow/template', templateKey)
    event.dataTransfer.effectAllowed = 'move'
  }

  const onNodeClick = useCallback((_: React.MouseEvent, node: Node<BuilderNodeData>) => {
    setSelectedNode(node)
  }, [])

  // Inline edge editing: double-click to update label
  const onEdgeDoubleClick = useCallback(
    (_: React.MouseEvent, edge: Edge) => {
      const next = prompt('Edge label', (edge.label as string) ?? '')
      if (next === null) return
      setEdges((eds) =>
        eds.map((e) =>
          e.id === edge.id
            ? {
                ...e,
                label: next.trim() === '' ? undefined : next,
              }
            : e
        )
      )
    },
    [setEdges]
  )

  // Allow dragging edge ends to update connection
  const onEdgeUpdate = useCallback(
    (oldEdge: Edge, newConnection: Connection) => {
      setEdges((els) => updateEdge(oldEdge, newConnection, els))
    },
    [setEdges]
  )

  const updateNodeData = (nodeId: string, newData: Partial<BuilderNodeData>) => {
    setNodes((nds) =>
      nds.map((node) =>
        node.id === nodeId
          ? { ...node, data: { ...node.data, ...newData, config: { ...node.data.config, ...newData.config } } }
          : node
      )
    )
    if (selectedNode?.id === nodeId) {
      setSelectedNode((prev) =>
        prev ? { ...prev, data: { ...prev.data, ...newData, config: { ...prev.data.config, ...newData.config } } } : null
      )
    }
  }

  const deleteNode = (nodeId: string) => {
    const node = nodes.find((n) => n.id === nodeId)
    const ok = confirm(`Delete node "${node?.data.label ?? nodeId}"?`)
    if (!ok) return

    setNodes((nds) => nds.filter((n) => n.id !== nodeId))
    setEdges((eds) => eds.filter((e) => e.source !== nodeId && e.target !== nodeId))
    if (selectedNode?.id === nodeId) setSelectedNode(null)
    toast({ title: 'Node deleted', description: 'The node and its connections were removed.' })
  }

  // Validation before save
  const validateWorkflow = () => {
    const startCount = nodes.filter((n) => n.data.type === 'start').length
    const endCount = nodes.filter((n) => n.data.type === 'end').length
    if (startCount !== 1) return 'Workflow must have exactly one Start node.'
    if (endCount < 1) return 'Workflow should have at least one End node.'
    if (!workflowName.trim()) return 'Workflow name cannot be empty.'
    return null
  }

  const handleSaveClick = () => {
    const error = validateWorkflow()
    if (error) {
      toast({ title: 'Cannot save', description: error, variant: 'destructive' })
      return
    }
    setShowSaveDialog(true)
  }

  const saveWorkflow = async () => {
    setShowSaveDialog(false)
    setIsSaving(true)
    try {
      const workflow = {
        name: workflowName.trim(),
        description: workflowDescription.trim(),
        nodes,
        edges,
        config: {
          createdAt: new Date().toISOString(),
          nodeCount: nodes.length,
          edgeCount: edges.length,
        },
        tags: ['custom'],
      }

      const response = await fetch('/api/workflow-templates', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(workflow),
      })

      if (!response.ok) throw new Error('Failed to save workflow')
      const result = await response.json()

      if (result.success) {
        toast({ title: 'Saved', description: 'Workflow saved to database.' })
        setCurrentTemplateId(result.id ?? null)
      } else {
        throw new Error(result.error || 'Failed to save workflow')
      }
    } catch (err) {
      toast({ title: 'Save failed', description: String((err as Error).message), variant: 'destructive' })
    } finally {
      setIsSaving(false)
    }
  }

  const loadSavedTemplates = async () => {
    setIsLoadingTemplates(true)
    try {
      const response = await fetch('/api/workflow-templates')
      if (response.ok) {
        const result = await response.json()
        if (result.success) {
          setSavedTemplates(result.templates)
          setShowTemplates(true)
        }
      }
    } catch (error) {
      toast({ title: 'Failed to load templates', description: String(error), variant: 'destructive' })
    } finally {
      setIsLoadingTemplates(false)
    }
  }

  const loadTemplate = (template: any) => {
    setWorkflowName(template.name)
    setWorkflowDescription(template.description || '')
    setNodes(template.nodes || [])
    setEdges(template.edges || [])
    setCurrentTemplateId(template.id)
    setShowTemplates(false)
    setSelectedNode(null)
    toast({ title: 'Template loaded', description: template.name })
  }

  const loadWorkflow = () => {
    const input = document.createElement('input')
    input.type = 'file'
    input.accept = '.json'
    input.onchange = (e) => {
      const file = (e.target as HTMLInputElement).files?.[0]
      if (!file) return

      const reader = new FileReader()
      reader.onload = (ev) => {
        try {
          const workflow = JSON.parse(ev.target?.result as string)
          setWorkflowName(workflow.name || 'Loaded Workflow')
          setWorkflowDescription(workflow.description || '')
          setNodes(workflow.nodes || [])
          setEdges(workflow.edges || [])
          setCurrentTemplateId(null)
          setSelectedNode(null)
          toast({ title: 'Workflow loaded', description: 'Imported from JSON file' })
        } catch (err) {
          toast({ title: 'Error loading file', description: 'Invalid JSON', variant: 'destructive' })
        }
      }
      reader.readAsText(file)
    }
    input.click()
  }

  const exportWorkflow = () => {
    setIsExporting(true)
    try {
      const workflow = {
        name: workflowName,
        description: workflowDescription,
        nodes,
        edges,
        createdAt: new Date().toISOString(),
      }
      const blob = new Blob([JSON.stringify(workflow, null, 2)], { type: 'application/json' })
      const url = URL.createObjectURL(blob)
      const filename = `${workflowName.trim().replace(/\s+/g, '_') || 'workflow'}.json`
      const a = document.createElement('a')
      a.href = url
      a.download = filename
      a.click()
      URL.revokeObjectURL(url)
      toast({ title: 'Exported', description: `${filename} downloaded.` })
    } catch (err) {
      toast({ title: 'Export failed', description: String((err as Error).message), variant: 'destructive' })
    } finally {
      setIsExporting(false)
    }
  }

  // Start workflow for a supplier (calls /api/workflows/start)
  const startWorkflowForSupplier = async () => {
    if (!runSupplierId.trim()) {
      toast({ title: 'Supplier ID required', description: 'Please enter a supplier ID to run the workflow.', variant: 'destructive' })
      return
    }
    setRunLoading(true)
    const supplierId = runSupplierId.trim()
    // Optimistically set a running state and close dialog
    setLastRun((prev: WorkflowRunResult | null) => ({
      id: prev?.id || 'pending',
      supplier_id: supplierId,
      workflow_type: 'Q1_supplier_qualification',
      status: 'running',
      overall: undefined,
      notes: [],
      steps: prev?.steps || [],
      started_at: new Date().toISOString(),
      ended_at: undefined,
    }))
    setShowRunDialog(false)
    setRunLoading(false)

    // Kick off the workflow in background
    ;(async () => {
      try {
        const res = await fetch('/api/workflows/start', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ supplierId, options: { includeSOA, includeWhiteList } }),
        })
        if (!res.ok) {
          const data = await res.json().catch(() => null)
          throw new Error(data?.error || 'Failed to start workflow')
        }
        const data = await res.json()
        if (data?.workflowRun) {
          setLastRun(data.workflowRun)
          toast({ title: 'Workflow completed', description: `Status: ${data.workflowRun.status}` })
        } else {
          // In case API chooses to respond early
          toast({ title: 'Workflow started', description: 'Monitoring progress…' })
        }
      } catch (err) {
        toast({ title: 'Run failed', description: String((err as Error).message), variant: 'destructive' })
      }
    })()

    // Ensure first status fetch happens shortly after starting
    setTimeout(() => {
      refreshWorkflowStatus()
    }, 400)
  }

  // Fetch latest workflow status for current supplier
  const refreshWorkflowStatus = async () => {
    const supplierId = lastRun?.supplier_id || runSupplierId
    if (!supplierId) return
    try {
      const res = await fetch(`/api/workflows/status?supplierId=${encodeURIComponent(supplierId)}`)
      if (res.ok) {
        const data = await res.json()
        if (data?.workflowRun) setLastRun(data.workflowRun)
      }
    } catch {}
  }

  // Keyboard shortcuts
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Delete' && selectedNode) {
        e.preventDefault()
        deleteNode(selectedNode.id)
      }
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 's') {
        e.preventDefault()
        saveWorkflow()
      }
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'e') {
        e.preventDefault()
        exportWorkflow()
      }
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [selectedNode])

  // Auto-poll workflow status while running
  useEffect(() => {
    const isRunning = lastRun?.status === 'running'
    if (isRunning && !pollTimerRef.current) {
      pollTimerRef.current = window.setInterval(() => {
        refreshWorkflowStatus()
      }, 2000)
    }
    if (!isRunning && pollTimerRef.current) {
      window.clearInterval(pollTimerRef.current)
      pollTimerRef.current = null
    }
    return () => {
      if (pollTimerRef.current) {
        window.clearInterval(pollTimerRef.current)
        pollTimerRef.current = null
      }
    }
  }, [lastRun?.status])

  // Auto-fit view on changes (toggleable)
  useEffect(() => {
    if (!reactFlowInstance || !autoFit) return
    const id = requestAnimationFrame(() => {
      try {
        reactFlowInstance.fitView({ padding: 0.2 })
      } catch {}
    })
    return () => cancelAnimationFrame(id)
  }, [nodes.length, edges.length, autoFit, reactFlowInstance])

  // Minimap color by node type
  const miniMapNodeColor = useCallback((n: Node<BuilderNodeData>) => {
    switch (n.data.type) {
      case 'start':
        return '#86efac'
      case 'end':
        return '#fca5a5'
      case 'decision':
        return '#fde68a'
      case 'verification':
        return '#93c5fd'
      default:
        return '#d1d5db'
    }
  }, [])

  return (
    <div className="h-screen flex">
      {/* Node Palette Sidebar */}
      <div className="w-80 bg-gray-50 border-r border-gray-200 flex flex-col">
        <div className="p-4 border-b border-gray-200">
          <h2 className="text-lg font-semibold mb-2">Workflow Builder</h2>
          <div className="space-y-3">
            <div>
              <Label htmlFor="workflow-name">Workflow Name</Label>
              <Input
                id="workflow-name"
                value={workflowName}
                onChange={(e) => setWorkflowName(e.target.value)}
                placeholder="Enter workflow name"
                aria-invalid={!workflowName.trim()}
              />
            </div>
            <div>
              <Label htmlFor="workflow-description">Description</Label>
              <Textarea
                id="workflow-description"
                value={workflowDescription}
                onChange={(e) => setWorkflowDescription(e.target.value)}
                placeholder="Describe this workflow"
                rows={2}
              />
            </div>
          </div>
        </div>

        <div className="flex-1 p-4">
          <h3 className="text-sm font-medium mb-3">Node Palette</h3>
          <ScrollArea className="h-full">
            <div className="space-y-2">
              {nodeTemplates.map((template) => (
                <div
                  key={template.templateKey}
                  className="p-3 bg-white border border-gray-200 rounded-lg cursor-move hover:shadow-md transition-shadow"
                  draggable
                  onDragStart={(event) => onDragStart(event, template.templateKey)}
                  role="button"
                  aria-label={`Drag ${template.label} node`}
                  title={`Drag ${template.label} node`}
                >
                  <div className="flex items-center gap-2 mb-1">
                    {template.icon}
                    <span className="text-sm font-medium">{template.label}</span>
                  </div>
                  <p className="text-xs text-gray-600">{template.description}</p>
                  {template.verificationType && (
                    <Badge variant="outline" className="mt-1 text-[10px]">
                      {template.verificationType}
                    </Badge>
                  )}
                </div>
              ))}
            </div>
          </ScrollArea>
        </div>
      </div>

      {/* Main Canvas Area */}
      <div className="flex-1 flex flex-col">
        {/* Top Bar with compact Actions */}
        <div className="h-12 bg-white border-b border-gray-200 flex items-center justify-between px-4">
          <div className="flex items-center gap-3 min-w-0">
            <h1 className="text-lg font-semibold truncate" title={workflowName}>
              {workflowName}
            </h1>
            <Badge variant="outline">{nodes.length} nodes</Badge>
            <Badge variant="outline">{edges.length} connections</Badge>
          </div>

          <div className="flex items-center gap-1">
            {/* Auto-fit toggle */}
            <Button
              size="sm"
              variant={autoFit ? 'default' : 'outline'}
              onClick={() => setAutoFit((v) => !v)}
              title="Auto Fit on change"
            >
              <Maximize2 className="w-4 h-4" />
              <span className="ml-1 hidden sm:inline">Auto Fit</span>
            </Button>

            {/* Test run (stub) */}
            <Button size="sm" variant="outline" title="Simulate the workflow (stub)">
              <Play className="w-4 h-4" />
              <span className="ml-1 hidden sm:inline">Test</span>
            </Button>

            {/* Run Q1 workflow for supplier */}
            <Button
              size="sm"
              variant="default"
              title="Run Q1 workflow for a supplier"
              onClick={() => setShowRunDialog(true)}
            >
              <Play className="w-4 h-4" />
              <span className="ml-1 hidden sm:inline">Run</span>
            </Button>

            {/* Compact actions toolbar to save vertical space */}
            <div className="inline-flex items-center rounded-md border border-gray-200 overflow-hidden">
              <Button size="sm" className="rounded-none" onClick={handleSaveClick} disabled={isSaving} title="Save to Database">
                <Save className="w-4 h-4" />
                <span className="ml-1 hidden sm:inline">{isSaving ? 'Saving…' : 'Save'}</span>
              </Button>
              <Button
                size="sm"
                variant="secondary"
                className="rounded-none"
                onClick={loadSavedTemplates}
                disabled={isLoadingTemplates}
                title="Load Template"
              >
                <FolderOpen className="w-4 h-4" />
                <span className="ml-1 hidden sm:inline">{isLoadingTemplates ? 'Loading…' : 'Templates'}</span>
              </Button>
              <Button size="sm" variant="outline" className="rounded-none" onClick={loadWorkflow} title="Load from File">
                <Upload className="w-4 h-4" />
                <span className="ml-1 hidden sm:inline">Import</span>
              </Button>
              <Button size="sm" variant="outline" className="rounded-none" onClick={exportWorkflow} disabled={isExporting} title="Export JSON">
                <Download className="w-4 h-4" />
                <span className="ml-1 hidden sm:inline">{isExporting ? 'Export…' : 'Export'}</span>
              </Button>
            </div>
          </div>
        </div>

        {/* Latest run summary banner */}
        {lastRun && (
          <div className="bg-white border-b border-gray-200 px-4 py-2 text-sm">
            <div className="flex items-center justify-between gap-2">
              <div className="truncate">
                <span className="font-medium">Last run</span>: status <Badge variant="outline" className="ml-1">{lastRun.status}</Badge>
                {lastRun.overall && (
                  <>
                    <span className="mx-1">•</span>
                    <span>overall</span> <Badge variant="secondary" className="ml-1">{lastRun.overall}</Badge>
                  </>
                )}
              </div>
              <div className="flex items-center gap-2">
                <Button size="sm" variant="outline" onClick={async () => {
                  try {
                    const supplierId = lastRun?.supplier_id || runSupplierId
                    if (!supplierId) return
                    const res = await fetch(`/api/workflows/status?supplierId=${encodeURIComponent(supplierId)}`)
                    if (res.ok) {
                      const data = await res.json()
                      if (data?.workflowRun) setLastRun(data.workflowRun)
                    }
                  } catch {}
                }}>Refresh</Button>
              </div>
            </div>
            {Array.isArray(lastRun?.steps) && lastRun.steps.length > 0 && (
              <div className="mt-2 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2">
                {lastRun.steps.map((s: any) => (
                  <div key={s.step_key} className="flex items-center justify-between rounded border px-2 py-1 bg-gray-50">
                    <span className="truncate mr-2">{s.name}</span>
                    <Badge variant={s.status === 'pass' ? 'default' : s.status === 'fail' ? 'destructive' : 'outline'}>
                      {s.status.toUpperCase()}
                    </Badge>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        <div className="flex-1 relative">
          <ReactFlowProvider>
            <div className="w-full h-full" ref={reactFlowWrapper}>
              <ReactFlow
                nodes={nodes}
                edges={edges}
                onNodesChange={onNodesChange}
                onEdgesChange={onEdgesChange}
                onConnect={onConnect}
                isValidConnection={isValidConnection}
                onInit={setReactFlowInstance}
                onDrop={onDrop}
                onDragOver={onDragOver}
                onNodeClick={onNodeClick}
                onEdgeDoubleClick={onEdgeDoubleClick}
                onEdgeUpdate={onEdgeUpdate}
                nodeTypes={nodeTypes}
                fitView
                // UX: snapping & smoother editing
                snapToGrid
                snapGrid={[16, 16]}
                panOnScroll
                selectionOnDrag
              >
                <Controls position="bottom-right" />
                <MiniMap nodeColor={miniMapNodeColor} />
                <Background variant="dots" gap={12} size={1} />
              </ReactFlow>
            </div>
          </ReactFlowProvider>
        </div>
      </div>

      {/* Properties Panel */}
      {selectedNode && (
        <div className="w-80 bg-gray-50 border-l border-gray-200 p-4">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold">Node Properties</h3>
            <Button size="sm" variant="destructive" onClick={() => deleteNode(selectedNode.id)} title="Delete node" aria-label="Delete node">
              <Trash2 className="w-4 h-4" />
            </Button>
          </div>

          <div className="space-y-4">
            <div>
              <Label htmlFor="node-label">Label</Label>
              <Input id="node-label" value={selectedNode.data.label} onChange={(e) => updateNodeData(selectedNode.id, { label: e.target.value })} />
            </div>

            <div>
              <Label htmlFor="node-description">Description</Label>
              <Textarea
                id="node-description"
                value={selectedNode.data.config?.description || ''}
                onChange={(e) =>
                  updateNodeData(selectedNode.id, {
                    config: { ...selectedNode.data.config, description: e.target.value },
                  })
                }
                rows={3}
              />
            </div>

            {selectedNode.data.type === 'verification' && (
              <>
                <div>
                  <Label htmlFor="verification-type">Verification Type</Label>
                  <Select
                    value={selectedNode.data.verificationType || ''}
                    onValueChange={(value) => updateNodeData(selectedNode.id, { verificationType: value as VerificationKind })}
                  >
                    <SelectTrigger id="verification-type" aria-label="Verification type">
                      <SelectValue placeholder="Select verification type" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="DURC">DURC</SelectItem>
                      <SelectItem value="VISURA">VISURA</SelectItem>
                      <SelectItem value="SOA">SOA</SelectItem>
                      <SelectItem value="ISO">ISO</SelectItem>
                      <SelectItem value="CCIAA">CCIAA</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label htmlFor="analysis-id">Analysis ID</Label>
                  <Input
                    id="analysis-id"
                    value={selectedNode.data.analysisId || ''}
                    onChange={(e) => updateNodeData(selectedNode.id, { analysisId: e.target.value })}
                    placeholder="Enter analysis UUID"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label htmlFor="timeout">Timeout (s)</Label>
                    <Input
                      id="timeout"
                      type="number"
                      min={0}
                      value={selectedNode.data.config?.timeout ?? 300}
                      onChange={(e) =>
                        updateNodeData(selectedNode.id, {
                          config: {
                            ...selectedNode.data.config,
                            timeout: Number.isNaN(parseInt(e.target.value)) ? 0 : parseInt(e.target.value),
                          },
                        })
                      }
                    />
                  </div>

                  <div>
                    <Label htmlFor="retries">Retries</Label>
                    <Input
                      id="retries"
                      type="number"
                      min={0}
                      value={selectedNode.data.config?.retries ?? 3}
                      onChange={(e) =>
                        updateNodeData(selectedNode.id, {
                          config: {
                            ...selectedNode.data.config,
                            retries: Number.isNaN(parseInt(e.target.value)) ? 0 : parseInt(e.target.value),
                          },
                        })
                      }
                    />
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <input
                    id="required"
                    type="checkbox"
                    className="h-4 w-4"
                    checked={!!selectedNode.data.config?.required}
                    onChange={(e) =>
                      updateNodeData(selectedNode.id, {
                        config: { ...selectedNode.data.config, required: e.target.checked },
                      })
                    }
                  />
                  <Label htmlFor="required">Required</Label>
                </div>

                {selectedNode.data.analysisId && selectedNode.data.verificationType && (
                  <>
                    <Separator className="my-2" />
                    <div className="space-y-2">
                      <Label className="text-sm">AI Verification Results</Label>
                      <DocumentVerificationResults
                        analysisId={selectedNode.data.analysisId}
                        docType={selectedNode.data.verificationType as 'DURC' | 'VISURA' | 'SOA' | 'ISO' | 'CCIAA'}
                      />
                    </div>
                  </>
                )}
              </>
            )}

            {selectedNode.data.type === 'decision' && (
              <div className="text-xs text-gray-600">
                Decision node has two branches: “Yes” (right) and “No” (left). Connect them to downstream steps.
              </div>
            )}
          </div>
        </div>
      )}

      {/* Template Gallery Modal */}
      {showTemplates && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50" role="dialog" aria-modal="true" aria-label="Load Workflow Template">
          <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full max-h-[80vh] overflow-hidden">
            <div className="flex items-center justify-between p-6 border-b">
              <h2 className="text-xl font-semibold">Load Workflow Template</h2>
              <Button variant="ghost" size="sm" onClick={() => setShowTemplates(false)} aria-label="Close">
                <X className="w-4 h-4" />
              </Button>
            </div>

            <div className="p-6 overflow-y-auto max-h-[60vh]">
              {savedTemplates.length === 0 ? (
                <div className="text-center py-8">
                  <FolderOpen className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                  <h3 className="text-lg font-medium text-gray-900 mb-2">No Templates Found</h3>
                  <p className="text-gray-500">Create and save your first workflow template to see it here.</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {savedTemplates.map((template: any) => (
                    <Card key={template.id} className="hover:shadow-lg transition-shadow">
                      <CardHeader className="pb-3">
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <CardTitle className="text-base font-medium line-clamp-2">{template.name}</CardTitle>
                            {template.description && <p className="text-sm text-gray-600 mt-1 line-clamp-2">{template.description}</p>}
                          </div>
                        </div>
                      </CardHeader>
                      <CardContent className="pt-0">
                        <div className="flex items-center justify-between text-xs text-gray-500 mb-3">
                          <span>{template.nodes?.length || 0} nodes</span>
                          <span>{template.created_at ? new Date(template.created_at).toLocaleDateString() : ''}</span>
                        </div>
                        <div className="flex flex-wrap gap-1 mb-3">
                          {(template.nodes || []).slice(0, 4).map((node: any, index: number) => (
                            <Badge key={index} variant="secondary" className="text-xs">
                              {node?.data?.verificationType || node?.data?.type || 'Node'}
                            </Badge>
                          ))}
                          {(template.nodes?.length || 0) > 4 && (
                            <Badge variant="outline" className="text-xs">
                              +{template.nodes.length - 4}
                            </Badge>
                          )}
                        </div>
                        <Button onClick={() => loadTemplate(template)} className="w-full" size="sm">
                          Load Template
                        </Button>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Save Confirmation Dialog */}
      <Dialog open={showSaveDialog} onOpenChange={setShowSaveDialog}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>Save Workflow Template</DialogTitle>
            <DialogDescription>
              Review your workflow details before saving to the database.
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4 py-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label className="text-sm font-medium">Workflow Name</Label>
                <p className="text-sm text-muted-foreground mt-1">{workflowName}</p>
              </div>
              <div>
                <Label className="text-sm font-medium">Template Type</Label>
                <p className="text-sm text-muted-foreground mt-1">Custom</p>
              </div>
            </div>
            
            {workflowDescription && (
              <div>
                <Label className="text-sm font-medium">Description</Label>
                <p className="text-sm text-muted-foreground mt-1">{workflowDescription}</p>
              </div>
            )}
            
            <div className="grid grid-cols-3 gap-4">
              <div>
                <Label className="text-sm font-medium">Nodes</Label>
                <p className="text-sm text-muted-foreground mt-1">{nodes.length} nodes</p>
              </div>
              <div>
                <Label className="text-sm font-medium">Connections</Label>
                <p className="text-sm text-muted-foreground mt-1">{edges.length} edges</p>
              </div>
              <div>
                <Label className="text-sm font-medium">Status</Label>
                <p className="text-sm text-muted-foreground mt-1">Ready to save</p>
              </div>
            </div>
            
            {/* Node Types Summary */}
            <div>
              <Label className="text-sm font-medium">Node Types</Label>
              <div className="flex flex-wrap gap-1 mt-2">
                {Array.from(new Set((nodes.map((n) => (n.data.verificationType ?? n.data.type) as string)))).map((t) => (
                  <Badge key={t} variant="secondary" className="text-xs">
                    {t}
                  </Badge>
                ))}
              </div>
            </div>
          </div>
          
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowSaveDialog(false)}>
              Cancel
            </Button>
            <Button onClick={saveWorkflow} disabled={isSaving}>
              {isSaving ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                  Saving...
                </>
              ) : (
                <>
                  <Save className="w-4 h-4 mr-2" />
                  Save Template
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Run Workflow Dialog */}
      <Dialog open={showRunDialog} onOpenChange={setShowRunDialog}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>Run Q1 Workflow</DialogTitle>
            <DialogDescription>
              Enter the Supplier ID. The system will retrieve relevant analyses (DURC, VISURA, ISO, SOA, CCIAA) and execute the workflow.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div>
              <Label htmlFor="run-supplier-id">Supplier ID</Label>
              <Input
                id="run-supplier-id"
                placeholder="e.g. b91a414b-a632-42ce-8584-47e0ca325a61"
                value={runSupplierId}
                onChange={(e) => setRunSupplierId(e.target.value)}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="flex items-center gap-2">
                <input
                  id="opt-include-soa"
                  type="checkbox"
                  className="h-4 w-4"
                  checked={includeSOA}
                  onChange={(e) => setIncludeSOA(e.target.checked)}
                />
                <Label htmlFor="opt-include-soa">Include SOA</Label>
              </div>
              <div className="flex items-center gap-2">
                <input
                  id="opt-include-whitelist"
                  type="checkbox"
                  className="h-4 w-4"
                  checked={includeWhiteList}
                  onChange={(e) => setIncludeWhiteList(e.target.checked)}
                />
                <Label htmlFor="opt-include-whitelist">Check White List</Label>
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowRunDialog(false)} disabled={runLoading}>
              Cancel
            </Button>
            <Button onClick={startWorkflowForSupplier} disabled={runLoading || !runSupplierId.trim()}>
              {runLoading ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                  Running...
                </>
              ) : (
                <>
                  <Play className="w-4 h-4 mr-2" />
                  Start
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}