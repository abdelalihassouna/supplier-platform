"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Separator } from "@/components/ui/separator"
import { Progress } from "@/components/ui/progress"
import {
  Brain,
  CheckCircle,
  XCircle,
  AlertTriangle,
  Clock,
  Eye,
  Edit,
  Save,
  RefreshCw,
  FileText,
  Sparkles,
  AlertCircle
} from "lucide-react"
import { cn } from "@/lib/utils"
import { 
  DocumentType, 
  DOCUMENT_TYPES, 
  DOCUMENT_TYPE_LABELS, 
  DOCUMENT_FIELD_DEFINITIONS,
  DocumentFields,
  DocumentValidators
} from "@/lib/document-schemas"

// Normalize extracted_fields coming from API, handling legacy shapes
const normalizeExtractedFields = (docType: DocumentType, extracted: any): DocumentFields => {
  try {
    if (!extracted) return {}

    // If already looks like flat fields, quickly return
    if (typeof extracted === 'object' &&
        (extracted.denominazione_ragione_sociale !== undefined ||
         extracted.codice_fiscale !== undefined)) {
      return extracted
    }

    // Legacy: documentAnnotation as JSON string within extracted
    if (typeof extracted?.documentAnnotation === 'string') {
      try {
        const fields = JSON.parse(extracted.documentAnnotation)
        return DocumentValidators.normalizeFields(docType, fields)
      } catch {}
    }

    // Other legacy shapes
    const candidates = [
      extracted?.document_annotation,
      extracted?.output_document_annotation,
      extracted?.output_structured
    ].filter(Boolean)

    for (const cand of candidates) {
      if (cand && typeof cand === 'object') {
        return DocumentValidators.normalizeFields(docType, cand)
      }
    }

    return {}
  } catch {
    return {}
  }
}

interface DocumentAnalysisDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  attachment: {
    id: string
    filename: string
    original_filename?: string
    cert_type?: string
    content_type?: string
    file_size?: number
  }

  supplierId?: string
  onAnalysisComplete?: () => void
}

interface AnalysisResult {
  id: string
  doc_type: DocumentType
  extracted_fields: DocumentFields
  analysis_status: 'pending' | 'processing' | 'completed' | 'failed'
  validation_status: 'pending' | 'approved' | 'rejected' | 'needs_review'
  analysis_error?: string
  validation_notes?: string
  created_at: string
  updated_at: string
  // Telemetry (optional)
  analysis_duration_ms?: number
  analysis_cost_eur?: number
  pages_count?: number
  annotation_used?: boolean
}

export function DocumentAnalysisDialog({
  open,
  onOpenChange,
  attachment,
  supplierId,
  onAnalysisComplete
}: DocumentAnalysisDialogProps) {
  const [activeTab, setActiveTab] = useState("analyze")
  const [selectedDocType, setSelectedDocType] = useState<DocumentType | "">("")
  const [isAnalyzing, setIsAnalyzing] = useState(false)
  const [analysis, setAnalysis] = useState<AnalysisResult | null>(null)
  const [editedFields, setEditedFields] = useState<DocumentFields>({})
  const [validationNotes, setValidationNotes] = useState("")
  const [isValidating, setIsValidating] = useState(false)

  // Helpers to format telemetry values (handle string or number from API)
  const toNum = (v: any): number | null => {
    if (v === null || v === undefined) return null
    const n = typeof v === 'number' ? v : Number(v)
    return Number.isFinite(n) ? n : null
  }
  const fmtMs = (v: any) => {
    const n = toNum(v)
    return n === null ? '—' : `${Math.round(n / 1000)} s`
  }
  const fmtCost = (v: any) => {
    const n = toNum(v)
    return n === null ? '—' : n.toFixed(4)
  }
  const fmtInt = (v: any) => {
    const n = toNum(v)
    return n === null ? '—' : String(Math.round(n))
  }

  // Auto-select document type from Document Information (attachment.cert_type)
  useEffect(() => {
    if (!open) return
    if (selectedDocType) return
    const infoType = (attachment.cert_type || '').toUpperCase()
    if (DOCUMENT_TYPES.includes(infoType as DocumentType)) {
      setSelectedDocType(infoType as DocumentType)
    }
  }, [open, attachment.cert_type, selectedDocType])

  // Load existing analysis when dialog opens
  useEffect(() => {
    if (open && attachment.id) {
      loadExistingAnalysis()
    }
  }, [open, attachment.id])

  // Reset state when dialog closes
  useEffect(() => {
    if (!open) {
      setAnalysis(null)
      setEditedFields({})
      setValidationNotes("")
      setSelectedDocType("")
      setActiveTab("analyze")
    }
  }, [open])

  const loadExistingAnalysis = async () => {
    try {
      const response = await fetch(`/api/documents/analyze?attachmentId=${attachment.id}`)
      const result = await response.json()
      
      if (result.success && result.data) {
        setAnalysis(result.data)
        const normalized = normalizeExtractedFields(result.data.doc_type, result.data.extracted_fields)
        setEditedFields(normalized)
        setValidationNotes(result.data.validation_notes || "")
        setSelectedDocType(result.data.doc_type)
        setActiveTab("review")
      }
    } catch (error) {
      console.error('Failed to load analysis:', error)
    }
  }

  const handleAnalyze = async () => {
    if (!selectedDocType) return

    setIsAnalyzing(true)
    try {
      const response = await fetch('/api/documents/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          attachmentId: attachment.id,
          docType: selectedDocType,
          pages: [0, 1] // Analyze first 2 pages
        })
      })

      const result = await response.json()
      
      if (result.success) {
        // Set the analysis data immediately
        setAnalysis(result.data)
        const normalized = normalizeExtractedFields(result.data.doc_type, result.data.extracted_fields)
        setEditedFields(normalized)
        setValidationNotes(result.data.validation_notes || "")
        setActiveTab("review")
        onAnalysisComplete?.()
      } else {
        throw new Error(result.error || 'Analysis failed')
      }
    } catch (error) {
      console.error('Analysis failed:', error)
      // Show error to user
    } finally {
      setIsAnalyzing(false)
    }
  }

  const handleValidate = async (status: 'approved' | 'rejected' | 'needs_review') => {
    if (!analysis) return

    setIsValidating(true)
    try {
      const response = await fetch('/api/documents/validate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          analysisId: analysis.id,
          validatedFields: editedFields,
          validationStatus: status,
          validationNotes: validationNotes,
          userId: null // TODO: Get from auth context
        })
      })

      const result = await response.json()
      
      if (result.success) {
        setAnalysis(result.data)
        onAnalysisComplete?.()
        onOpenChange(false)
      } else {
        throw new Error(result.error || 'Validation failed')
      }
    } catch (error) {
      console.error('Validation failed:', error)
    } finally {
      setIsValidating(false)
    }
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed':
      case 'approved':
        return <CheckCircle className="w-4 h-4 text-green-600" />
      case 'failed':
      case 'rejected':
        return <XCircle className="w-4 h-4 text-red-600" />
      case 'processing':
        return <RefreshCw className="w-4 h-4 text-blue-600 animate-spin" />
      case 'needs_review':
        return <AlertTriangle className="w-4 h-4 text-yellow-600" />
      default:
        return <Clock className="w-4 h-4 text-gray-600" />
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed':
      case 'approved':
        return "text-green-600 bg-green-100"
      case 'failed':
      case 'rejected':
        return "text-red-600 bg-red-100"
      case 'processing':
        return "text-blue-600 bg-blue-100"
      case 'needs_review':
        return "text-yellow-600 bg-yellow-100"
      default:
        return "text-gray-600 bg-gray-100"
    }
  }

  const renderFieldEditor = (fieldKey: string, fieldDef: any) => {
    const value = editedFields[fieldKey as keyof DocumentFields] || ""
    
    const handleFieldChange = (newValue: string) => {
      setEditedFields(prev => ({
        ...prev,
        [fieldKey]: newValue
      }))
    }

    if (fieldDef.type === 'textarea') {
      return (
        <Textarea
          value={value}
          onChange={(e) => handleFieldChange(e.target.value)}
          placeholder={fieldDef.description}
          className="min-h-[80px]"
        />
      )
    }

    return (
      <Input
        type={fieldDef.type === 'date' ? 'text' : 'text'}
        value={value}
        onChange={(e) => handleFieldChange(e.target.value)}
        placeholder={fieldDef.type === 'date' ? 'dd/mm/YYYY' : fieldDef.description}
      />
    )
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Brain className="w-5 h-5 text-primary" />
            Document Analysis
          </DialogTitle>
          <DialogDescription>
            Analyze and extract structured data from {attachment.filename || attachment.original_filename}
          </DialogDescription>
        </DialogHeader>

        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="analyze">Analyze Document</TabsTrigger>
            <TabsTrigger value="review" disabled={!analysis}>Review & Validate</TabsTrigger>
          </TabsList>

          <TabsContent value="analyze" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <FileText className="w-4 h-4" />
                  Document Information
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label className="text-sm text-muted-foreground">Filename</Label>
                    <p className="font-medium">{attachment.filename || attachment.original_filename}</p>
                  </div>
                  <div>
                    <Label className="text-sm text-muted-foreground">Type</Label>
                    <p className="font-medium">{attachment.cert_type || 'Document'}</p>
                  </div>
                  <div>
                    <Label className="text-sm text-muted-foreground">Size</Label>
                    <p className="font-medium">
                      {attachment.file_size ? `${(attachment.file_size / 1024).toFixed(1)} KB` : 'Unknown'}
                    </p>
                  </div>
                  <div>
                    <Label className="text-sm text-muted-foreground">Format</Label>
                    <p className="font-medium">{attachment.content_type || 'Unknown'}</p>
                  </div>
                </div>

                <Separator />

                <div className="space-y-2">
                  <Label htmlFor="docType">Document Type *</Label>
                  <Select value={selectedDocType} onValueChange={(value) => setSelectedDocType(value as DocumentType)}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select document type for analysis" />
                    </SelectTrigger>
                    <SelectContent>
                      {DOCUMENT_TYPES.map((type) => (
                        <SelectItem key={type} value={type}>
                          {DOCUMENT_TYPE_LABELS[type]}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <Button 
                  onClick={handleAnalyze} 
                  disabled={!selectedDocType || isAnalyzing}
                  className="w-full"
                >
                  {isAnalyzing ? (
                    <>
                      <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                      Analyzing Document...
                    </>
                  ) : (
                    <>
                      <Sparkles className="w-4 h-4 mr-2" />
                      Start Analysis
                    </>
                  )}
                </Button>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="review" className="space-y-4">
            {analysis && (
              <>
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center justify-between">
                      <span className="flex items-center gap-2">
                        <Eye className="w-4 h-4" />
                        Analysis Results
                      </span>
                      <div className="flex items-center gap-2">
                        <Badge className={cn("text-xs", getStatusColor(analysis.analysis_status))}>
                          {getStatusIcon(analysis.analysis_status)}
                          <span className="ml-1">{analysis.analysis_status}</span>
                        </Badge>
                        <Badge className={cn("text-xs", getStatusColor(analysis.validation_status))}>
                          {getStatusIcon(analysis.validation_status)}
                          <span className="ml-1">{analysis.validation_status}</span>
                        </Badge>
                      </div>
                    </CardTitle>
                    <CardDescription>
                      <div className="flex flex-col gap-1 md:flex-row md:items-center md:gap-4">
                        <span>Document Type: {DOCUMENT_TYPE_LABELS[analysis.doc_type]}</span>
                        <span className="text-xs text-muted-foreground">
                          {fmtMs(analysis.analysis_duration_ms)} • {fmtCost(analysis.analysis_cost_eur)} € • {fmtInt(analysis.pages_count)} pages
                        </span>
                      </div>
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {analysis.analysis_error && (
                      <div className="p-3 bg-red-50 border border-red-200 rounded-md">
                        <div className="flex items-center gap-2 text-red-700">
                          <AlertCircle className="w-4 h-4" />
                          <span className="font-medium">Analysis Error</span>
                        </div>
                        <p className="text-sm text-red-600 mt-1">{analysis.analysis_error}</p>
                      </div>
                    )}

                    <div className="grid gap-4">
                      {DOCUMENT_FIELD_DEFINITIONS[analysis.doc_type]?.map((fieldDef) => (
                        <div key={fieldDef.key} className="space-y-2">
                          <Label htmlFor={fieldDef.key} className="flex items-center gap-2">
                            {fieldDef.label}
                            {fieldDef.required && <span className="text-red-500">*</span>}
                          </Label>
                          {renderFieldEditor(fieldDef.key, fieldDef)}
                          {fieldDef.description && (
                            <p className="text-xs text-muted-foreground">{fieldDef.description}</p>
                          )}
                        </div>
                      ))}
                    </div>

                    <Separator />

                    {/* Telemetry */}
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                      <div className="p-3 rounded-md border">
                        <div className="text-xs text-muted-foreground">Duration</div>
                        <div className="font-medium">{fmtMs(analysis.analysis_duration_ms)}</div>
                      </div>
                      <div className="p-3 rounded-md border">
                        <div className="text-xs text-muted-foreground">Pages</div>
                        <div className="font-medium">{fmtInt(analysis.pages_count)}</div>
                      </div>
                      <div className="p-3 rounded-md border">
                        <div className="text-xs text-muted-foreground">Cost (EUR)</div>
                        <div className="font-medium">{fmtCost(analysis.analysis_cost_eur)}</div>
                      </div>
                      {/* <div className="p-3 rounded-md border">
                        <div className="text-xs text-muted-foreground">Annotation</div>
                        <div className="font-medium">{analysis.annotation_used ? 'With annotation' : 'No annotation'}</div>
                      </div> */}
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="validationNotes">Validation Notes</Label>
                      <Textarea
                        id="validationNotes"
                        value={validationNotes}
                        onChange={(e) => setValidationNotes(e.target.value)}
                        placeholder="Add notes about the validation..."
                        className="min-h-[80px]"
                      />
                    </div>
                  </CardContent>
                </Card>
              </>
            )}
          </TabsContent>
        </Tabs>

        <DialogFooter className="flex items-center justify-between">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          
          {activeTab === "review" && analysis && (
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                onClick={() => handleValidate('needs_review')}
                disabled={isValidating}
              >
                <AlertTriangle className="w-4 h-4 mr-2" />
                Needs Review
              </Button>
              <Button
                variant="outline"
                onClick={() => handleValidate('rejected')}
                disabled={isValidating}
              >
                <XCircle className="w-4 h-4 mr-2" />
                Reject
              </Button>
              <Button
                onClick={() => handleValidate('approved')}
                disabled={isValidating}
              >
                {isValidating ? (
                  <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                ) : (
                  <CheckCircle className="w-4 h-4 mr-2" />
                )}
                Approve
              </Button>
            </div>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
