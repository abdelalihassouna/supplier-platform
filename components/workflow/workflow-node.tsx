// 'use client'

// import React from 'react'
// import { Handle, Position, NodeProps } from '@xyflow/react'
// import { Badge } from '@/components/ui/badge'
// import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
// import { Button } from '@/components/ui/button'
// import { 
//   CheckCircle, 
//   XCircle, 
//   Clock, 
//   AlertCircle, 
//   Play, 
//   RotateCcw,
//   FileText,
//   Shield,
//   Building2,
//   Award,
//   Briefcase,
//   BarChart3
// } from 'lucide-react'
// import { cn } from '@/lib/utils'

// export type WorkflowStepStatus = 'pending' | 'running' | 'pass' | 'fail' | 'skip'

// export interface WorkflowNodeData {
//   id: string
//   stepKey: string
//   name: string
//   status: WorkflowStepStatus
//   issues: string[]
//   details?: any
//   score?: number
//   startedAt?: string
//   endedAt?: string
//   onRetry?: (stepKey: string) => void
//   onStart?: (stepKey: string) => void
// }

// const stepIcons = {
//   registration: Building2,
//   preliminary: FileText,
//   durc: Shield,
//   whitelist_insurance: Award,
//   visura: FileText,
//   certifications: Award,
//   soa: Briefcase,
//   scorecard: BarChart3,
//   finalize: CheckCircle
// }

// const statusConfig = {
//   pending: {
//     color: 'bg-gray-100 border-gray-300 text-gray-700',
//     icon: Clock,
//     iconColor: 'text-gray-500'
//   },
//   running: {
//     color: 'bg-blue-50 border-blue-300 text-blue-700',
//     icon: Play,
//     iconColor: 'text-blue-500'
//   },
//   pass: {
//     color: 'bg-green-50 border-green-300 text-green-700',
//     icon: CheckCircle,
//     iconColor: 'text-green-500'
//   },
//   fail: {
//     color: 'bg-red-50 border-red-300 text-red-700',
//     icon: XCircle,
//     iconColor: 'text-red-500'
//   },
//   skip: {
//     color: 'bg-yellow-50 border-yellow-300 text-yellow-700',
//     icon: AlertCircle,
//     iconColor: 'text-yellow-500'
//   }
// }

// export function WorkflowNode({ data }: NodeProps) {
//   const nodeData = data as WorkflowNodeData
//   const StepIcon = stepIcons[nodeData.stepKey as keyof typeof stepIcons] || FileText
//   const StatusIcon = statusConfig[nodeData.status].icon
//   const config = statusConfig[nodeData.status]

//   const formatDuration = (start?: string, end?: string) => {
//     if (!start) return null
//     const startTime = new Date(start)
//     const endTime = end ? new Date(end) : new Date()
//     const duration = Math.round((endTime.getTime() - startTime.getTime()) / 1000)
//     return `${duration}s`
//   }

//   return (
//     <>
//       <Handle type="target" position={Position.Top} />
      
//       <Card className={cn(
//         'w-80 transition-all duration-200 hover:shadow-lg',
//         config.color
//       )}>
//         <CardHeader className="pb-3">
//           <div className="flex items-center justify-between">
//             <div className="flex items-center gap-2">
//               <StepIcon className="h-5 w-5" />
//               <CardTitle className="text-sm font-medium">{nodeData.name}</CardTitle>
//             </div>
//             <div className="flex items-center gap-2">
//               <StatusIcon className={cn('h-4 w-4', config.iconColor)} />
//               <Badge variant="outline" className="text-xs">
//                 {nodeData.status.toUpperCase()}
//               </Badge>
//             </div>
//           </div>
//         </CardHeader>

//         <CardContent className="space-y-3">
//           {/* Duration and Score */}
//           <div className="flex justify-between text-xs text-muted-foreground">
//             {nodeData.startedAt && (
//               <span>Duration: {formatDuration(nodeData.startedAt, nodeData.endedAt) || 'Running...'}</span>
//             )}
//             {nodeData.score !== undefined && (
//               <span>Score: {nodeData.score}/100</span>
//             )}
//           </div>

//           {/* Issues */}
//           {nodeData.issues.length > 0 && (
//             <div className="space-y-1">
//               <p className="text-xs font-medium text-red-600">Issues:</p>
//               <ul className="space-y-1">
//                 {nodeData.issues.slice(0, 3).map((issue: string, index: number) => (
//                   <li key={index} className="text-xs text-red-600 flex items-start gap-1">
//                     <span className="text-red-400 mt-0.5">•</span>
//                     <span className="flex-1">{issue}</span>
//                   </li>
//                 ))}
//                 {nodeData.issues.length > 3 && (
//                   <li className="text-xs text-red-500">
//                     +{nodeData.issues.length - 3} more issues
//                   </li>
//                 )}
//               </ul>
//             </div>
//           )}

//           {/* Document-specific details */}
//           {nodeData.details && (
//             <div className="space-y-1">
//               <p className="text-xs font-medium">Details:</p>
//               {nodeData.stepKey === 'durc' && nodeData.details.verification_result && (
//                 <div className="text-xs space-y-1">
//                   <p>Verification: {nodeData.details.verification_result.overall_result}</p>
//                   <p>Confidence: {Math.round(nodeData.details.verification_result.confidence_score)}%</p>
//                 </div>
//               )}
//               {nodeData.stepKey === 'certifications' && (
//                 <div className="text-xs">
//                   <p>Valid: {nodeData.details.valid_certifications}/{nodeData.details.total_certifications}</p>
//                 </div>
//               )}
//               {nodeData.stepKey === 'scorecard' && nodeData.details.scorecard_id && (
//                 <div className="text-xs">
//                   <p>ID: {nodeData.details.scorecard_id}</p>
//                 </div>
//               )}
//             </div>
//           )}

//           {/* Action buttons */}
//           <div className="flex gap-2 pt-2">
//             {nodeData.status === 'fail' && nodeData.onRetry && (
//               <Button
//                 size="sm"
//                 variant="outline"
//                 onClick={() => nodeData.onRetry!(nodeData.stepKey)}
//                 className="h-7 text-xs"
//               >
//                 <RotateCcw className="h-3 w-3 mr-1" />
//                 Retry
//               </Button>
//             )}
//             {nodeData.status === 'pending' && nodeData.onStart && (
//               <Button
//                 size="sm"
//                 onClick={() => nodeData.onStart!(nodeData.stepKey)}
//                 className="h-7 text-xs"
//               >
//                 <Play className="h-3 w-3 mr-1" />
//                 Start
//               </Button>
//             )}
//           </div>
//         </CardContent>
//       </Card>

//       <Handle type="source" position={Position.Bottom} />
//     </>
//   )
// }
