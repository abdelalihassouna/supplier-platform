"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Progress } from "@/components/ui/progress"
import { Separator } from "@/components/ui/separator"
import { Checkbox } from "@/components/ui/checkbox"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Alert, AlertDescription } from "@/components/ui/alert"
import {
  FileText,
  Download,
  Eye,
  CheckCircle,
  XCircle,
  AlertTriangle,
  Clock,
  Building2,
  Calendar,
  User,
  Shield,
  Zap,
  MessageSquare,
  RotateCcw,
  Save,
  Send,
  AlertCircle,
  FileCheck,
} from "lucide-react"
import { cn } from "@/lib/utils"

interface MinimalDocumentData {
  id: string
  name: string
  type: string
  supplierId?: string
  supplierName?: string
  uploadDate?: string
  expiryDate?: string
  issuer?: string
  documentNumber?: string
  status?: string
  fileSize?: string
  fileType?: string
  metadata?: Record<string, any>
  automatedChecks?: Array<{
    id: string
    name: string
    description?: string
    status: string
    confidence?: number
    details?: string
    timestamp?: string
  }>
  manualChecklist?: Array<{
    id: string
    category: string
    items: Array<{
      id: string
      description: string
      status: string
      required?: boolean
      notes?: string
      verifiedBy?: string | null
      verifiedAt?: string | null
    }>
  }>
  exceptions?: Array<{
    id: string
    type: string
    severity: string
    title: string
    description: string
    suggestedAction?: string
    status?: string
    createdAt?: string
  }>
  verificationHistory?: Array<{
    id: string
    action: string
    user: string
    timestamp: string
    details?: string
  }>
}

interface DocumentVerificationSystemProps {
  documentId: string
  data?: MinimalDocumentData
  useMock?: boolean
}

// Mock document data
const mockDocument = {
  id: "DOC-001",
  name: "DURC Certificate - Acme Construction Ltd",
  type: "DURC",
  supplierId: "SUP-001",
  supplierName: "Acme Construction Ltd",
  uploadDate: "2024-01-10T09:00:00Z",
  expiryDate: "2024-06-15T23:59:59Z",
  issuer: "Agenzia delle Entrate",
  documentNumber: "DURC-2024-001234",
  status: "pending_verification",
  fileSize: "2.3 MB",
  fileType: "PDF",
  metadata: {
    issueDate: "2024-01-01T00:00:00Z",
    validFrom: "2024-01-01T00:00:00Z",
    validUntil: "2024-06-15T23:59:59Z",
    authority: "Agenzia delle Entrate - Milano",
    certificateType: "Documento Unico di Regolarità Contributiva",
    language: "Italian",
  },
  automatedChecks: [
    {
      id: "check-001",
      name: "Document Authenticity",
      description: "Verify document signature and authenticity",
      status: "passed",
      confidence: 95,
      details: "Digital signature verified successfully",
      timestamp: "2024-01-10T09:05:00Z",
    },
    {
      id: "check-002",
      name: "Expiry Date Validation",
      description: "Check if document is within validity period",
      status: "passed",
      confidence: 100,
      details: "Document valid until June 15, 2024",
      timestamp: "2024-01-10T09:05:00Z",
    },
    {
      id: "check-003",
      name: "Issuer Verification",
      description: "Validate issuing authority",
      status: "passed",
      confidence: 98,
      details: "Issued by authorized authority: Agenzia delle Entrate",
      timestamp: "2024-01-10T09:05:00Z",
    },
    {
      id: "check-004",
      name: "Content Analysis",
      description: "Analyze document content for completeness",
      status: "warning",
      confidence: 85,
      details: "Some optional fields are missing",
      timestamp: "2024-01-10T09:05:00Z",
    },
  ],
  manualChecklist: [
    {
      id: "manual-001",
      category: "Document Quality",
      items: [
        {
          id: "item-001",
          description: "Document is clearly readable and not corrupted",
          status: "completed",
          required: true,
          notes: "Document quality is excellent",
          verifiedBy: "Admin User",
          verifiedAt: "2024-01-10T10:00:00Z",
        },
        {
          id: "item-002",
          description: "All required fields are present and filled",
          status: "completed",
          required: true,
          notes: "All mandatory fields verified",
          verifiedBy: "Admin User",
          verifiedAt: "2024-01-10T10:05:00Z",
        },
      ],
    },
    {
      id: "manual-002",
      category: "Compliance Verification",
      items: [
        {
          id: "item-003",
          description: "Company details match supplier registration",
          status: "pending",
          required: true,
          notes: "",
          verifiedBy: null,
          verifiedAt: null,
        },
        {
          id: "item-004",
          description: "Certificate covers required activities",
          status: "pending",
          required: true,
          notes: "",
          verifiedBy: null,
          verifiedAt: null,
        },
        {
          id: "item-005",
          description: "No exclusions or limitations noted",
          status: "pending",
          required: false,
          notes: "",
          verifiedBy: null,
          verifiedAt: null,
        },
      ],
    },
  ],
  exceptions: [
    {
      id: "exc-001",
      type: "expiry_warning",
      severity: "medium",
      title: "Document Expiring Soon",
      description: "This document will expire in 5 months",
      suggestedAction: "Request renewal from supplier",
      status: "open",
      createdAt: "2024-01-10T09:10:00Z",
    },
  ],
  verificationHistory: [
    {
      id: "hist-001",
      action: "Document uploaded",
      user: "Marco Rossi",
      timestamp: "2024-01-10T09:00:00Z",
      details: "DURC certificate uploaded by supplier",
    },
    {
      id: "hist-002",
      action: "Automated verification started",
      user: "System",
      timestamp: "2024-01-10T09:05:00Z",
      details: "Running automated verification checks",
    },
    {
      id: "hist-003",
      action: "Manual verification assigned",
      user: "Admin User",
      timestamp: "2024-01-10T09:30:00Z",
      details: "Assigned to compliance team for manual review",
    },
  ],
}

export function DocumentVerificationSystem({ documentId, data, useMock = false }: DocumentVerificationSystemProps) {
  const [activeTab, setActiveTab] = useState("viewer")
  const [selectedChecklistItem, setSelectedChecklistItem] = useState<string | null>(null)
  const [verificationNotes, setVerificationNotes] = useState("")
  const [verificationDecision, setVerificationDecision] = useState<string>("")

  const document: MinimalDocumentData | undefined = useMock ? mockDocument : data

  const getStatusColor = (status: string) => {
    switch (status) {
      case "passed":
      case "completed":
        return "text-green-600 bg-green-100"
      case "warning":
        return "text-yellow-600 bg-yellow-100"
      case "failed":
      case "error":
        return "text-red-600 bg-red-100"
      case "pending":
        return "text-blue-600 bg-blue-100"
      default:
        return "text-gray-600 bg-gray-100"
    }
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "passed":
      case "completed":
        return <CheckCircle className="w-4 h-4" />
      case "warning":
        return <AlertTriangle className="w-4 h-4" />
      case "failed":
      case "error":
        return <XCircle className="w-4 h-4" />
      case "pending":
        return <Clock className="w-4 h-4" />
      default:
        return <AlertCircle className="w-4 h-4" />
    }
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("it-IT", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    })
  }

  const formatDateTime = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("it-IT", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    })
  }

  const handleChecklistItemUpdate = (itemId: string, status: string, notes: string) => {
    // Update checklist item status and notes
    console.log("Updating checklist item:", itemId, status, notes)
  }

  const handleVerificationComplete = () => {
    // Complete verification process
    console.log("Completing verification with decision:", verificationDecision)
  }

  const completedChecks = (document?.automatedChecks ?? []).filter((check) => check.status === "passed").length
  const totalChecks = (document?.automatedChecks ?? []).length
  const automatedProgress = totalChecks > 0 ? (completedChecks / totalChecks) * 100 : 0

  const completedManualItems = (document?.manualChecklist ?? [])
    .flatMap((category) => category.items)
    .filter((item) => item.status === "completed").length
  const totalManualItems = (document?.manualChecklist ?? []).flatMap((category) => category.items).length
  const manualProgress = totalManualItems > 0 ? (completedManualItems / totalManualItems) * 100 : 0

  if (!document) {
    return (
      <div className="space-y-4">
        <Card>
          <CardHeader>
            <CardTitle>Document Verification</CardTitle>
            <CardDescription>No document selected</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="w-full h-40 bg-muted rounded-lg flex items-center justify-center border-2 border-dashed border-muted-foreground/25">
              <div className="text-center text-muted-foreground">Select a document to view verification details</div>
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div className="space-y-2">
          <div className="flex items-center space-x-3">
            <div className="w-12 h-12 bg-primary/10 rounded-lg flex items-center justify-center">
              <FileText className="w-6 h-6 text-primary" />
            </div>
            <div>
              <h1 className="text-3xl font-bold">{document.name}</h1>
              <p className="text-muted-foreground">
                {(document.supplierName ?? "")} • {document.type} • {(document.fileSize ?? "")}
              </p>
            </div>
          </div>
          <div className="flex items-center space-x-4">
            <Badge className={cn("text-sm", getStatusColor(document.status ?? ""))}>
              {String(document.status ?? "").replace("_", " ")}
            </Badge>
            <div className="flex items-center text-sm text-muted-foreground">
              <Calendar className="w-4 h-4 mr-1" />
              Expires: {document.expiryDate ? formatDate(document.expiryDate) : "-"}
            </div>
          </div>
        </div>
        <div className="flex items-center space-x-2">
          <Button variant="outline">
            <Download className="w-4 h-4 mr-2" />
            Download
          </Button>
          <Button variant="outline">
            <RotateCcw className="w-4 h-4 mr-2" />
            Re-verify
          </Button>
          <Button>
            <FileCheck className="w-4 h-4 mr-2" />
            Complete Verification
          </Button>
        </div>
      </div>

      {/* Progress Overview */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Automated Checks</span>
                <span className="text-sm font-medium">
                  {completedChecks}/{totalChecks}
                </span>
              </div>
              <Progress value={automatedProgress} className="h-2" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Manual Verification</span>
                <span className="text-sm font-medium">
                  {completedManualItems}/{totalManualItems}
                </span>
              </div>
              <Progress value={manualProgress} className="h-2" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Exceptions</span>
                <span className="text-sm font-medium">{(document.exceptions ?? []).length}</span>
              </div>
              <div className="flex items-center">
                <AlertTriangle className="w-4 h-4 mr-1 text-yellow-600" />
                <span className="text-sm text-yellow-600">Requires attention</span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Exception Alerts */}
      {(document.exceptions ?? []).length > 0 && (
        <div className="space-y-2">
          {(document.exceptions ?? []).map((exception) => (
            <Alert key={exception.id} className="border-yellow-200 bg-yellow-50">
              <AlertTriangle className="h-4 w-4 text-yellow-600" />
              <AlertDescription className="text-yellow-800">
                <strong>{exception.title}:</strong> {exception.description}
                <br />
                <em>Suggested action: {exception.suggestedAction}</em>
              </AlertDescription>
            </Alert>
          ))}
        </div>
      )}

      {/* Main Content Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-5">
          <TabsTrigger value="viewer">Document Viewer</TabsTrigger>
          <TabsTrigger value="metadata">Metadata</TabsTrigger>
          <TabsTrigger value="automated">Automated Checks</TabsTrigger>
          <TabsTrigger value="manual">Manual Verification</TabsTrigger>
          <TabsTrigger value="history">History</TabsTrigger>
        </TabsList>

        <TabsContent value="viewer" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <Eye className="w-5 h-5 mr-2" />
                Document Viewer
              </CardTitle>
              <CardDescription>View and annotate the document</CardDescription>
            </CardHeader>
            <CardContent>
              {/* PDF Viewer Placeholder */}
              <div className="w-full h-96 bg-muted rounded-lg flex items-center justify-center border-2 border-dashed border-muted-foreground/25">
                <div className="text-center space-y-2">
                  <FileText className="w-12 h-12 mx-auto text-muted-foreground" />
                  <p className="text-muted-foreground">PDF Document Viewer</p>
                  <p className="text-sm text-muted-foreground">{document.name}</p>
                  <Button variant="outline" size="sm">
                    <Eye className="w-4 h-4 mr-2" />
                    Open in Full Screen
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="metadata" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <FileText className="w-5 h-5 mr-2" />
                  Document Information
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm text-muted-foreground">Document Number</p>
                    <p className="font-medium">{document.documentNumber}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Document Type</p>
                    <p className="font-medium">{document.metadata?.certificateType ?? "-"}</p>
                  </div>
                </div>
                <Separator />
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm text-muted-foreground">Issue Date</p>
                    <p className="font-medium">{document.metadata?.issueDate ? formatDate(document.metadata.issueDate) : "-"}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Valid Until</p>
                    <p className="font-medium">{document.metadata?.validUntil ? formatDate(document.metadata.validUntil) : "-"}</p>
                  </div>
                </div>
                <Separator />
                <div>
                  <p className="text-sm text-muted-foreground">Language</p>
                  <p className="font-medium">{document.metadata?.language ?? "-"}</p>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <Building2 className="w-5 h-5 mr-2" />
                  Issuing Authority
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <p className="text-sm text-muted-foreground">Authority</p>
                  <p className="font-medium">{document.metadata?.authority ?? "-"}</p>
                </div>
                <Separator />
                <div>
                  <p className="text-sm text-muted-foreground">Issuer</p>
                  <p className="font-medium">{document.issuer}</p>
                </div>
                <Separator />
                <div className="flex items-center space-x-2">
                  <Shield className="w-4 h-4 text-green-600" />
                  <span className="text-sm text-green-600">Verified Authority</span>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="automated" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <Zap className="w-5 h-5 mr-2" />
                Automated Verification Results
              </CardTitle>
              <CardDescription>AI-powered document verification and analysis</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {(document.automatedChecks ?? []).map((check) => (
                  <div key={check.id} className="p-4 border rounded-lg">
                    <div className="flex items-start justify-between">
                      <div className="flex items-start space-x-3">
                        <div
                          className={cn(
                            "flex items-center justify-center w-8 h-8 rounded-full",
                            getStatusColor(check.status),
                          )}
                        >
                          {getStatusIcon(check.status)}
                        </div>
                        <div className="space-y-1">
                          <h4 className="font-medium">{check.name}</h4>
                          <p className="text-sm text-muted-foreground">{check.description}</p>
                          <p className="text-sm">{check.details}</p>
                        </div>
                      </div>
                      <div className="text-right space-y-1">
                        <Badge className={cn("text-xs", getStatusColor(check.status))} variant="outline">
                          {check.status}
                        </Badge>
                        <p className="text-xs text-muted-foreground">Confidence: {check.confidence ?? 0}%</p>
                        <p className="text-xs text-muted-foreground">{check.timestamp ? formatDateTime(check.timestamp) : "-"}</p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="manual" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <User className="w-5 h-5 mr-2" />
                Manual Verification Checklist
              </CardTitle>
              <CardDescription>Complete manual verification steps</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-6">
                {(document.manualChecklist ?? []).map((category) => (
                  <div key={category.id} className="space-y-4">
                    <h3 className="text-lg font-semibold">{category.category}</h3>
                    <div className="space-y-3">
                      {category.items.map((item) => (
                        <div key={item.id} className="p-4 border rounded-lg">
                          <div className="flex items-start space-x-3">
                            <Checkbox
                              checked={item.status === "completed"}
                              onCheckedChange={(checked) => {
                                if (checked) {
                                  handleChecklistItemUpdate(item.id, "completed", item.notes)
                                }
                              }}
                              className="mt-1"
                            />
                            <div className="flex-1 space-y-2">
                              <div className="flex items-center justify-between">
                                <p className="font-medium">{item.description}</p>
                                <div className="flex items-center space-x-2">
                                  {item.required && (
                                    <Badge variant="destructive" className="text-xs">
                                      Required
                                    </Badge>
                                  )}
                                  <Badge className={cn("text-xs", getStatusColor(item.status))} variant="outline">
                                    {item.status}
                                  </Badge>
                                </div>
                              </div>
                              {item.notes && <p className="text-sm text-muted-foreground">{item.notes}</p>}
                              {item.verifiedBy && item.verifiedAt && (
                                <p className="text-xs text-muted-foreground">
                                  Verified by {item.verifiedBy} on {formatDateTime(item.verifiedAt)}
                                </p>
                              )}
                              {item.status === "pending" && (
                                <div className="space-y-2">
                                  <Textarea placeholder="Add verification notes..." className="text-sm" rows={2} />
                                  <div className="flex items-center space-x-2">
                                    <Button size="sm" variant="outline" onClick={() => handleChecklistItemUpdate(item.id, "completed", item.notes ?? "") }>
                                      <CheckCircle className="w-4 h-4 mr-1" />
                                      Pass
                                    </Button>
                                    <Button size="sm" variant="outline" onClick={() => handleChecklistItemUpdate(item.id, "failed", item.notes ?? "") }>
                                      <XCircle className="w-4 h-4 mr-1" />
                                      Fail
                                    </Button>
                                  </div>
                                </div>
                              )}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Verification Decision */}
          <Card>
            <CardHeader>
              <CardTitle>Final Verification Decision</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">Overall Decision</label>
                <Select value={verificationDecision} onValueChange={setVerificationDecision}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select verification outcome" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="approved">Approved</SelectItem>
                    <SelectItem value="approved_with_conditions">Approved with Conditions</SelectItem>
                    <SelectItem value="rejected">Rejected</SelectItem>
                    <SelectItem value="requires_additional_info">Requires Additional Information</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Verification Notes</label>
                <Textarea
                  placeholder="Add final verification notes and comments..."
                  value={verificationNotes}
                  onChange={(e) => setVerificationNotes(e.target.value)}
                  rows={4}
                />
              </div>
              <div className="flex items-center space-x-2">
                <Button onClick={handleVerificationComplete} disabled={!verificationDecision}>
                  <Send className="w-4 h-4 mr-2" />
                  Submit Verification
                </Button>
                <Button variant="outline">
                  <Save className="w-4 h-4 mr-2" />
                  Save Draft
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="history" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <MessageSquare className="w-5 h-5 mr-2" />
                Verification History
              </CardTitle>
              <CardDescription>Complete audit trail of document verification process</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {(document.verificationHistory ?? []).map((event, index) => (
                  <div key={event.id} className="flex items-start space-x-3">
                    <div className="w-2 h-2 bg-primary rounded-full mt-2" />
                    <div className="flex-1 space-y-1">
                      <div className="flex items-center justify-between">
                        <p className="font-medium">{event.action}</p>
                        <span className="text-sm text-muted-foreground">{formatDateTime(event.timestamp)}</span>
                      </div>
                      <p className="text-sm text-muted-foreground">{event.details}</p>
                      <p className="text-xs text-muted-foreground">by {event.user}</p>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}
