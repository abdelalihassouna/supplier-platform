// 'use client'

// import React, { useCallback, useEffect, useState } from 'react'
// import {
//   ReactFlow,
//   Node,
//   Edge,
//   addEdge,
//   Connection,
//   useNodesState,
//   useEdgesState,
//   Controls,
//   MiniMap,
//   Background,
//   BackgroundVariant,
//   Panel
// } from '@xyflow/react'
// import '@xyflow/react/dist/style.css'

// import { WorkflowNode, WorkflowNodeData, WorkflowStepStatus } from './workflow-node'
// import { Button } from '@/components/ui/button'
// import { Badge } from '@/components/ui/badge'
// import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
// import { Play, Pause, RotateCcw, Download } from 'lucide-react'
// import { WorkflowRunResult, WorkflowStepResult } from '@/lib/workflows/q1-orchestrator'

// const nodeTypes = {
//   workflowStep: WorkflowNode
// }

// interface WorkflowFlowProps {
//   supplierId: string
//   workflowRun?: WorkflowRunResult
//   onStartWorkflow?: () => void
//   onRetryStep?: (stepKey: string) => void
//   onStartStep?: (stepKey: string) => void
//   isRunning?: boolean
// }

// const initialSteps = [
//   { key: 'registration', name: 'Registration Check', order: 1 },
//   { key: 'preliminary', name: 'Preliminary Data Verification', order: 2 },
//   { key: 'durc', name: 'DURC Verification', order: 3 },
//   { key: 'whitelist_insurance', name: 'White List & Insurance', order: 4 },
//   { key: 'visura', name: 'Qualification Questionnaire (VISURA)', order: 5 },
//   { key: 'certifications', name: 'Certifications Verification', order: 6 },
//   { key: 'soa', name: 'SOA Verification', order: 7 },
//   { key: 'scorecard', name: 'Q1 Scorecard Generation', order: 8 },
//   { key: 'finalize', name: 'Final Outcome & Follow-up', order: 9 }
// ]

// export function WorkflowFlow({ 
//   supplierId, 
//   workflowRun, 
//   onStartWorkflow, 
//   onRetryStep, 
//   onStartStep,
//   isRunning = false 
// }: WorkflowFlowProps) {
//   const [nodes, setNodes, onNodesChange] = useNodesState([])
//   const [edges, setEdges, onEdgesChange] = useEdgesState([])

//   // Create nodes from workflow steps
//   const createNodes = useCallback((steps: WorkflowStepResult[] = []): Node<WorkflowNodeData>[] => {
//     return initialSteps.map((stepDef, index) => {
//       const stepResult = steps.find(s => s.step_key === stepDef.key)
//       const status: WorkflowStepStatus = stepResult?.status || 'pending'
      
//       return {
//         id: stepDef.key,
//         type: 'workflowStep',
//         position: { 
//           x: (index % 3) * 350, 
//           y: Math.floor(index / 3) * 200 
//         },
//         data: {
//           id: stepResult?.id || '',
//           stepKey: stepDef.key,
//           name: stepDef.name,
//           status,
//           issues: stepResult?.issues || [],
//           details: stepResult?.details,
//           score: stepResult?.score,
//           startedAt: stepResult?.started_at,
//           endedAt: stepResult?.ended_at,
//           onRetry: onRetryStep,
//           onStart: onStartStep
//         }
//       }
//     })
//   }, [onRetryStep, onStartStep])

//   // Create edges between nodes
//   const createEdges = useCallback((): Edge[] => {
//     const edges: Edge[] = []
//     for (let i = 0; i < initialSteps.length - 1; i++) {
//       edges.push({
//         id: `${initialSteps[i].key}-${initialSteps[i + 1].key}`,
//         source: initialSteps[i].key,
//         target: initialSteps[i + 1].key,
//         type: 'smoothstep',
//         animated: isRunning,
//         style: { stroke: '#94a3b8', strokeWidth: 2 }
//       })
//     }
//     return edges
//   }, [isRunning])

//   // Update nodes when workflow changes
//   useEffect(() => {
//     const newNodes = createNodes(workflowRun?.steps)
//     setNodes(newNodes)
    
//     const newEdges = createEdges()
//     setEdges(newEdges)
//   }, [workflowRun, createNodes, createEdges, setNodes, setEdges])

//   const onConnect = useCallback(
//     (params: Connection) => setEdges((eds) => addEdge(params, eds)),
//     [setEdges]
//   )

//   const getWorkflowStatus = () => {
//     if (!workflowRun) return 'Not Started'
//     return workflowRun.status === 'running' ? 'Running' : 
//            workflowRun.status === 'completed' ? 'Completed' :
//            workflowRun.status === 'failed' ? 'Failed' : 'Unknown'
//   }

//   const getOverallResult = () => {
//     if (!workflowRun?.overall) return null
//     const resultConfig = {
//       qualified: { label: 'Qualified', color: 'bg-green-100 text-green-800' },
//       conditionally_qualified: { label: 'Conditionally Qualified', color: 'bg-yellow-100 text-yellow-800' },
//       not_qualified: { label: 'Not Qualified', color: 'bg-red-100 text-red-800' }
//     }
//     return resultConfig[workflowRun.overall]
//   }

//   const exportWorkflowData = () => {
//     if (!workflowRun) return
    
//     const data = {
//       workflow_id: workflowRun.id,
//       supplier_id: supplierId,
//       status: workflowRun.status,
//       overall_result: workflowRun.overall,
//       steps: workflowRun.steps,
//       exported_at: new Date().toISOString()
//     }
    
//     const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' })
//     const url = URL.createObjectURL(blob)
//     const a = document.createElement('a')
//     a.href = url
//     a.download = `q1-workflow-${supplierId}-${workflowRun.id}.json`
//     a.click()
//     URL.revokeObjectURL(url)
//   }

//   return (
//     <div className="h-[800px] w-full border rounded-lg bg-background">
//       <ReactFlow
//         nodes={nodes}
//         edges={edges}
//         onNodesChange={onNodesChange}
//         onEdgesChange={onEdgesChange}
//         onConnect={onConnect}
//         nodeTypes={nodeTypes}
//         fitView
//         className="bg-background"
//       >
//         <Controls />
//         <MiniMap 
//           nodeColor={(node) => {
//             const status = (node.data as WorkflowNodeData).status
//             return status === 'pass' ? '#22c55e' :
//                    status === 'fail' ? '#ef4444' :
//                    status === 'running' ? '#3b82f6' :
//                    status === 'skip' ? '#eab308' : '#94a3b8'
//           }}
//           className="bg-background border"
//         />
//         <Background variant={BackgroundVariant.Dots} gap={20} size={1} />
        
//         {/* Control Panel */}
//         <Panel position="top-left">
//           <Card className="w-80">
//             <CardHeader className="pb-3">
//               <div className="flex items-center justify-between">
//                 <CardTitle className="text-lg">Q1 Workflow</CardTitle>
//                 <Badge variant="outline">
//                   {getWorkflowStatus()}
//                 </Badge>
//               </div>
//               {workflowRun && (
//                 <div className="text-sm text-muted-foreground">
//                   Supplier ID: {supplierId}
//                 </div>
//               )}
//             </CardHeader>
            
//             <CardContent className="space-y-3">
//               {/* Overall Result */}
//               {workflowRun?.overall && (
//                 <div className="flex items-center gap-2">
//                   <span className="text-sm font-medium">Result:</span>
//                   <Badge className={getOverallResult()?.color}>
//                     {getOverallResult()?.label}
//                   </Badge>
//                 </div>
//               )}

//               {/* Progress Stats */}
//               {workflowRun?.steps && (
//                 <div className="grid grid-cols-2 gap-2 text-sm">
//                   <div>
//                     <span className="font-medium text-green-600">
//                       {workflowRun.steps.filter(s => s.status === 'pass').length}
//                     </span>
//                     <span className="text-muted-foreground"> Passed</span>
//                   </div>
//                   <div>
//                     <span className="font-medium text-red-600">
//                       {workflowRun.steps.filter(s => s.status === 'fail').length}
//                     </span>
//                     <span className="text-muted-foreground"> Failed</span>
//                   </div>
//                   <div>
//                     <span className="font-medium text-yellow-600">
//                       {workflowRun.steps.filter(s => s.status === 'skip').length}
//                     </span>
//                     <span className="text-muted-foreground"> Skipped</span>
//                   </div>
//                   <div>
//                     <span className="font-medium text-blue-600">
//                       {workflowRun.steps.filter(s => s.status === 'running').length}
//                     </span>
//                     <span className="text-muted-foreground"> Running</span>
//                   </div>
//                 </div>
//               )}

//               {/* Action Buttons */}
//               <div className="flex gap-2 pt-2">
//                 {!workflowRun && onStartWorkflow && (
//                   <Button onClick={onStartWorkflow} size="sm" className="flex-1">
//                     <Play className="h-4 w-4 mr-1" />
//                     Start Workflow
//                   </Button>
//                 )}
                
//                 {workflowRun && (
//                   <Button 
//                     onClick={exportWorkflowData} 
//                     variant="outline" 
//                     size="sm"
//                     className="flex-1"
//                   >
//                     <Download className="h-4 w-4 mr-1" />
//                     Export
//                   </Button>
//                 )}
//               </div>

//               {/* Issues Summary */}
//               {workflowRun?.notes && workflowRun.notes.length > 0 && (
//                 <div className="space-y-1">
//                   <p className="text-sm font-medium text-red-600">Workflow Issues:</p>
//                   <ul className="space-y-1 max-h-20 overflow-y-auto">
//                     {workflowRun.notes.slice(0, 3).map((note, index) => (
//                       <li key={index} className="text-xs text-red-600 flex items-start gap-1">
//                         <span className="text-red-400 mt-0.5">•</span>
//                         <span className="flex-1">{note}</span>
//                       </li>
//                     ))}
//                     {workflowRun.notes.length > 3 && (
//                       <li className="text-xs text-red-500">
//                         +{workflowRun.notes.length - 3} more issues
//                       </li>
//                     )}
//                   </ul>
//                 </div>
//               )}
//             </CardContent>
//           </Card>
//         </Panel>
//       </ReactFlow>
//     </div>
//   )
// }
