// 'use client'

// import React from 'react'
// import { Button } from '@/components/ui/button'
// import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
// import { Badge } from '@/components/ui/badge'
// import { 
//   Workflow, 
//   Play, 
//   CheckCircle, 
//   XCircle, 
//   Clock,
//   ExternalLink
// } from 'lucide-react'
// import Link from 'next/link'

// interface WorkflowLauncherProps {
//   supplierId: string
//   supplierName?: string
//   lastWorkflowStatus?: 'completed' | 'running' | 'failed' | null
//   lastWorkflowResult?: 'qualified' | 'conditionally_qualified' | 'not_qualified' | null
// }

// export function WorkflowLauncher({ 
//   supplierId, 
//   supplierName,
//   lastWorkflowStatus,
//   lastWorkflowResult 
// }: WorkflowLauncherProps) {
//   const getStatusConfig = () => {
//     switch (lastWorkflowStatus) {
//       case 'completed':
//         return {
//           icon: CheckCircle,
//           color: 'text-green-600',
//           bgColor: 'bg-green-50',
//           label: 'Completed'
//         }
//       case 'running':
//         return {
//           icon: Clock,
//           color: 'text-blue-600',
//           bgColor: 'bg-blue-50',
//           label: 'Running'
//         }
//       case 'failed':
//         return {
//           icon: XCircle,
//           color: 'text-red-600',
//           bgColor: 'bg-red-50',
//           label: 'Failed'
//         }
//       default:
//         return {
//           icon: Workflow,
//           color: 'text-gray-600',
//           bgColor: 'bg-gray-50',
//           label: 'Not Started'
//         }
//     }
//   }

//   const getResultConfig = () => {
//     switch (lastWorkflowResult) {
//       case 'qualified':
//         return {
//           label: 'Qualified',
//           variant: 'default' as const,
//           color: 'bg-green-100 text-green-800'
//         }
//       case 'conditionally_qualified':
//         return {
//           label: 'Conditionally Qualified',
//           variant: 'secondary' as const,
//           color: 'bg-yellow-100 text-yellow-800'
//         }
//       case 'not_qualified':
//         return {
//           label: 'Not Qualified',
//           variant: 'destructive' as const,
//           color: 'bg-red-100 text-red-800'
//         }
//       default:
//         return null
//     }
//   }

//   const statusConfig = getStatusConfig()
//   const resultConfig = getResultConfig()
//   const StatusIcon = statusConfig.icon

//   return (
//     <Card className="w-full">
//       <CardHeader className="pb-3">
//         <div className="flex items-center justify-between">
//           <CardTitle className="text-lg flex items-center gap-2">
//             <Workflow className="h-5 w-5" />
//             Q1 Workflow Verification
//           </CardTitle>
//           <div className={`p-2 rounded-full ${statusConfig.bgColor}`}>
//             <StatusIcon className={`h-4 w-4 ${statusConfig.color}`} />
//           </div>
//         </div>
//         {supplierName && (
//           <p className="text-sm text-muted-foreground">
//             {supplierName}
//           </p>
//         )}
//       </CardHeader>
      
//       <CardContent className="space-y-4">
//         <div className="flex items-center justify-between">
//           <div className="space-y-1">
//             <p className="text-sm font-medium">Status</p>
//             <Badge variant="outline" className={statusConfig.bgColor}>
//               {statusConfig.label}
//             </Badge>
//           </div>
          
//           {resultConfig && (
//             <div className="space-y-1 text-right">
//               <p className="text-sm font-medium">Result</p>
//               <Badge className={resultConfig.color}>
//                 {resultConfig.label}
//               </Badge>
//             </div>
//           )}
//         </div>

//         <div className="flex gap-2">
//           <Button asChild className="flex-1">
//             <Link href={`/workflows/${supplierId}`}>
//               <Play className="h-4 w-4 mr-1" />
//               {lastWorkflowStatus === 'running' ? 'View Progress' : 'Start Workflow'}
//             </Link>
//           </Button>
          
//           {lastWorkflowStatus && (
//             <Button variant="outline" asChild>
//               <Link href={`/workflows/${supplierId}`}>
//                 <ExternalLink className="h-4 w-4" />
//               </Link>
//             </Button>
//           )}
//         </div>

//         <div className="text-xs text-muted-foreground">
//           <p>Automated verification of DURC, VISURA, SOA, ISO, and CCIAA documents</p>
//         </div>
//       </CardContent>
//     </Card>
//   )
// }
