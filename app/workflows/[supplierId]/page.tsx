// 'use client'

// import React, { useState } from 'react'
// import { useParams } from 'next/navigation'
// import { DashboardLayout } from "@/components/dashboard-layout"
// import { WorkflowFlow } from '@/components/workflow/workflow-flow'
// import { useWorkflow } from '@/hooks/use-workflow'
// import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
// import { Button } from '@/components/ui/button'
// import { Badge } from '@/components/ui/badge'
// import { Alert, AlertDescription } from '@/components/ui/alert'
// import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
// import { Switch } from '@/components/ui/switch'
// import { Label } from '@/components/ui/label'
// import { 
//   AlertCircle, 
//   RefreshCw, 
//   Settings,
//   FileText,
//   Activity,
//   ArrowLeft
// } from 'lucide-react'
// import Link from 'next/link'
// import { Q1WorkflowOptions } from '@/lib/workflows/q1-orchestrator'

// export default function WorkflowDetailPage() {
//   const params = useParams()
//   const supplierId = params.supplierId as string
  
//   const [workflowOptions, setWorkflowOptions] = useState<Q1WorkflowOptions>({
//     includeSOA: false,
//     includeWhiteList: true
//   })

//   const {
//     workflowRun,
//     isLoading,
//     isRunning,
//     error,
//     startWorkflow,
//     retryStep,
//     startStep,
//     refreshStatus
//   } = useWorkflow({ 
//     supplierId,
//     autoRefresh: true,
//     refreshInterval: 2000
//   })

//   const handleStartWorkflow = async () => {
//     try {
//       await startWorkflow(workflowOptions)
//     } catch (error) {
//       console.error('Failed to start workflow:', error)
//     }
//   }

//   const handleRetryStep = async (stepKey: string) => {
//     try {
//       await retryStep(stepKey)
//     } catch (error) {
//       console.error('Failed to retry step:', error)
//     }
//   }

//   const handleStartStep = async (stepKey: string) => {
//     try {
//       await startStep(stepKey)
//     } catch (error) {
//       console.error('Failed to start step:', error)
//     }
//   }

//   return (
//     <DashboardLayout>
//       <div className="container mx-auto p-6 space-y-6">
//         {/* Header */}
//         <div className="flex items-center justify-between">
//           <div className="flex items-center gap-4">
//             <Button variant="outline" size="sm" asChild>
//               <Link href="/workflows">
//                 <ArrowLeft className="h-4 w-4 mr-1" />
//                 Back to Workflows
//               </Link>
//             </Button>
//             <div>
//               <h1 className="text-3xl font-bold">Q1 Workflow Verification</h1>
//               <p className="text-muted-foreground">
//                 Supplier ID: <code className="bg-muted px-2 py-1 rounded text-sm">{supplierId}</code>
//               </p>
//             </div>
//           </div>
          
//           <div className="flex items-center gap-2">
//             <Button
//               variant="outline"
//               size="sm"
//               onClick={refreshStatus}
//               disabled={isLoading}
//             >
//               <RefreshCw className={`h-4 w-4 mr-1 ${isLoading ? 'animate-spin' : ''}`} />
//               Refresh
//             </Button>
            
//             {isRunning && (
//               <Badge variant="secondary" className="animate-pulse">
//                 <Activity className="h-3 w-3 mr-1" />
//                 Running
//               </Badge>
//             )}
//           </div>
//         </div>

//         {/* Error Alert */}
//         {error && (
//           <Alert variant="destructive">
//             <AlertCircle className="h-4 w-4" />
//             <AlertDescription>{error}</AlertDescription>
//           </Alert>
//         )}

//         <Tabs defaultValue="workflow" className="space-y-4">
//           <TabsList>
//             <TabsTrigger value="workflow">Workflow Visualization</TabsTrigger>
//             <TabsTrigger value="settings">Settings</TabsTrigger>
//             <TabsTrigger value="logs">Execution Logs</TabsTrigger>
//           </TabsList>

//           <TabsContent value="workflow" className="space-y-4">
//             {/* Workflow Visualization */}
//             <WorkflowFlow
//               supplierId={supplierId}
//               workflowRun={workflowRun}
//               onStartWorkflow={handleStartWorkflow}
//               onRetryStep={handleRetryStep}
//               onStartStep={handleStartStep}
//               isRunning={isRunning}
//             />
//           </TabsContent>

//           <TabsContent value="settings" className="space-y-4">
//             <Card>
//               <CardHeader>
//                 <CardTitle className="flex items-center gap-2">
//                   <Settings className="h-5 w-5" />
//                   Workflow Configuration
//                 </CardTitle>
//               </CardHeader>
//               <CardContent className="space-y-4">
//                 <div className="flex items-center justify-between">
//                   <div className="space-y-0.5">
//                     <Label htmlFor="include-soa">Include SOA Verification</Label>
//                     <p className="text-sm text-muted-foreground">
//                       Enable SOA (Società Organismi di Attestazione) document verification
//                     </p>
//                   </div>
//                   <Switch
//                     id="include-soa"
//                     checked={workflowOptions.includeSOA}
//                     onCheckedChange={(checked) => 
//                       setWorkflowOptions(prev => ({ ...prev, includeSOA: checked }))
//                     }
//                     disabled={isRunning}
//                   />
//                 </div>

//                 <div className="flex items-center justify-between">
//                   <div className="space-y-0.5">
//                     <Label htmlFor="include-whitelist">Include White List Check</Label>
//                     <p className="text-sm text-muted-foreground">
//                       Enable white list and insurance documentation verification
//                     </p>
//                   </div>
//                   <Switch
//                     id="include-whitelist"
//                     checked={workflowOptions.includeWhiteList}
//                     onCheckedChange={(checked) => 
//                       setWorkflowOptions(prev => ({ ...prev, includeWhiteList: checked }))
//                     }
//                     disabled={isRunning}
//                   />
//                 </div>

//                 {!workflowRun && (
//                   <Button 
//                     onClick={handleStartWorkflow}
//                     disabled={isLoading}
//                     className="w-full"
//                   >
//                     Start Workflow with Current Settings
//                   </Button>
//                 )}
//               </CardContent>
//             </Card>
//           </TabsContent>

//           <TabsContent value="logs" className="space-y-4">
//             <Card>
//               <CardHeader>
//                 <CardTitle className="flex items-center gap-2">
//                   <FileText className="h-5 w-5" />
//                   Execution Logs
//                 </CardTitle>
//               </CardHeader>
//               <CardContent>
//                 {workflowRun ? (
//                   <div className="space-y-4">
//                     <div className="grid grid-cols-2 gap-4 text-sm">
//                       <div>
//                         <span className="font-medium">Workflow ID:</span> {workflowRun.id}
//                       </div>
//                       <div>
//                         <span className="font-medium">Status:</span> {workflowRun.status}
//                       </div>
//                       <div>
//                         <span className="font-medium">Started:</span> {new Date(workflowRun.started_at).toLocaleString()}
//                       </div>
//                       <div>
//                         <span className="font-medium">Ended:</span> {workflowRun.ended_at ? new Date(workflowRun.ended_at).toLocaleString() : 'Running...'}
//                       </div>
//                     </div>

//                     <div className="space-y-2">
//                       <h4 className="font-medium">Step Execution Timeline:</h4>
//                       <div className="space-y-2 max-h-96 overflow-y-auto">
//                         {workflowRun.steps.map((step) => (
//                           <div key={step.id} className="border rounded p-3 space-y-2">
//                             <div className="flex items-center justify-between">
//                               <span className="font-medium">{step.name}</span>
//                               <Badge variant={
//                                 step.status === 'pass' ? 'default' :
//                                 step.status === 'fail' ? 'destructive' :
//                                 step.status === 'skip' ? 'secondary' : 'outline'
//                               }>
//                                 {step.status}
//                               </Badge>
//                             </div>
                            
//                             {step.started_at && (
//                               <div className="text-xs text-muted-foreground">
//                                 Started: {new Date(step.started_at).toLocaleString()}
//                                 {step.ended_at && (
//                                   <> | Ended: {new Date(step.ended_at).toLocaleString()}</>
//                                 )}
//                               </div>
//                             )}

//                             {step.issues.length > 0 && (
//                               <div className="space-y-1">
//                                 <p className="text-xs font-medium text-red-600">Issues:</p>
//                                 <ul className="text-xs text-red-600 space-y-1">
//                                   {step.issues.map((issue, index) => (
//                                     <li key={index}>• {issue}</li>
//                                   ))}
//                                 </ul>
//                               </div>
//                             )}

//                             {step.score !== undefined && (
//                               <div className="text-xs">
//                                 <span className="font-medium">Score:</span> {step.score}/100
//                               </div>
//                             )}
//                           </div>
//                         ))}
//                       </div>
//                     </div>
//                   </div>
//                 ) : (
//                   <p className="text-muted-foreground">No workflow execution data available.</p>
//                 )}
//               </CardContent>
//             </Card>
//           </TabsContent>
//         </Tabs>
//       </div>
//     </DashboardLayout>
//   )
// }
