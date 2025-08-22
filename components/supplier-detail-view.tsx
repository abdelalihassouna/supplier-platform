"use client"

import { useEffect, useState } from "react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Progress } from "@/components/ui/progress"
import { Separator } from "@/components/ui/separator"
import { Avatar, AvatarFallback, AvatarInitials } from "@/components/ui/avatar"
import {
  Building2,
  MapPin,
  Phone,
  Mail,
  Calendar,
  FileText,
  Download,
  Upload,
  CheckCircle,
  XCircle,
  AlertTriangle,
  Clock,
  Eye,
  Edit,
  MessageSquare,
  History,
  Shield,
  Award,
  FileCheck,
  AlertCircle,
  Brain,
  Sparkles,
} from "lucide-react"
import { cn } from "@/lib/utils"
import Link from "next/link"
import { DocumentAnalysisDialog } from "@/components/document-analysis-dialog"
import { SupplierProfileValidation } from "@/components/supplier-profile-validation"
import { LanguageSwitcher } from "@/components/language-switcher"
import { useI18n } from "@/hooks/use-i18n"
import { uiTranslations } from "@/lib/i18n/translations"

interface SupplierDetailViewProps {
  supplierId: string
}

// View-model type used by this component
type SupplierVM = {
  id?: string | number
  companyName: string
  legalName: string
  vatNumber: string | null
  fiscalCode: string | null
  address: { street: string; city: string; province: string; postalCode: string; country: string }
  contact: { primaryContact: string; email: string | null; phone: string | null; role: string }
  status: string
  registrationDate: string | null
  lastUpdate: string | null
  overallScore: number
  riskLevel: string
  certificationLevel: string
  scorecard: { sections: any[] }
  documents: any[]
  timeline: any[]
  debasicAnswers?: Record<string, any> | null
  attachments?: any[]
}

// Helper to map API row to view-model
function mapSupplierToVM(row: any): SupplierVM {
  return {
    id: row.id ?? row.bravo_id,
    companyName: row.company_name ?? "",
    legalName: row.legal_form ?? row.company_name ?? "",
    vatNumber: row.vat_number ?? null,
    fiscalCode: row.fiscal_code ?? null,
    address: {
      street: row.address ?? "",
      city: row.city ?? "",
      province: row.province ?? "",
      postalCode: row.postal_code ?? "",
      country: row.country ?? "",
    },
    contact: { primaryContact: "", email: row.email ?? null, phone: row.phone ?? null, role: "" },
    status: row.verification_status ?? "pending",
    registrationDate: row.last_sync_date ?? row.updated_at ?? null,
    lastUpdate: row.updated_at ?? null,
    overallScore: typeof row.compliance_score === "number" ? row.compliance_score : 0,
    riskLevel: "unknown",
    certificationLevel: row.verification_status ?? "N/A",
    scorecard: { sections: [] },
    documents: [],
    timeline: [],
    debasicAnswers: row.debasic_answers ?? null,
    attachments: row.attachments ?? [],
  }
}


export function SupplierDetailView({ supplierId }: SupplierDetailViewProps) {
  const [activeTab, setActiveTab] = useState("overview")
  const [supplier, setSupplier] = useState<SupplierVM | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [analysisDialogOpen, setAnalysisDialogOpen] = useState(false)
  const [selectedAttachment, setSelectedAttachment] = useState<any>(null)
  const { t, formatDate, formatDateTime } = useI18n()

  // Reusable loader so we can refresh without reloading the page
  useEffect(() => {
    let abort = false

    const fetchSupplier = async () => {
      setLoading(true)
      setError(null)
      try {
        const res = await fetch(`/api/suppliers/${encodeURIComponent(supplierId)}`)
        const json = await res.json()
        if (!res.ok || !json.success) throw new Error(json.error || "Failed to load supplier")
        if (!abort) setSupplier(mapSupplierToVM(json.data))
      } catch (e) {
        if (!abort) setError((e as Error).message)
      } finally {
        if (!abort) setLoading(false)
      }
    }

    fetchSupplier()

    // Expose a method on window for debugging if needed
    ;(window as any).__refreshSupplier = fetchSupplier

    return () => {
      abort = true
      delete (window as any).__refreshSupplier
    }
  }, [supplierId])

  const getStatusColor = (status: string) => {
    switch (status) {
      case "completed":
      case "passed":
        return "text-green-600 bg-green-100"
      case "warning":
      case "expiring_soon":
        return "text-yellow-600 bg-yellow-100"
      case "error":
      case "failed":
        return "text-red-600 bg-red-100"
      case "pending":
        return "text-blue-600 bg-blue-100"
      default:
        return "text-gray-600 bg-gray-100"
    }
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "completed":
      case "passed":
        return <CheckCircle className="w-4 h-4" />
      case "warning":
      case "expiring_soon":
        return <AlertTriangle className="w-4 h-4" />
      case "error":
      case "failed":
        return <XCircle className="w-4 h-4" />
      case "pending":
        return <Clock className="w-4 h-4" />
      default:
        return <AlertCircle className="w-4 h-4" />
    }
  }


  if (loading) {
    return <div className="p-4 text-sm text-muted-foreground">Loading supplier...</div>
  }

  if (error) {
    return (
      <div className="p-4 text-sm text-red-700 bg-red-50 border border-red-200 rounded">
        Failed to load supplier: {error}
      </div>
    )
  }

  if (!supplier) {
    return <div className="p-4 text-sm text-muted-foreground">Supplier not found.</div>
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div className="space-y-2">
          <div className="flex items-center space-x-3">
            <div className="w-12 h-12 bg-primary/10 rounded-lg flex items-center justify-center">
              <Building2 className="w-6 h-6 text-primary" />
            </div>
            <div>
              <h1 className="text-3xl font-bold">{supplier.companyName}</h1>
              <p className="text-muted-foreground">{supplier.legalName}</p>
            </div>
          </div>
          <div className="flex items-center space-x-4">
            <Badge className={cn("text-sm", getStatusColor(supplier.status))}>{supplier.certificationLevel}</Badge>
            <div className="flex items-center text-sm text-muted-foreground">
              <MapPin className="w-4 h-4 mr-1" />
              {supplier.address.city}, {supplier.address.country}
            </div>
          </div>
        </div>
        <div className="flex items-center space-x-2">
          <LanguageSwitcher />
          <Button variant="outline">
            <MessageSquare className="w-4 h-4 mr-2" />
            Contact
          </Button>
          <Button variant="outline">
            <Edit className="w-4 h-4 mr-2" />
            Edit
          </Button>
          <Button>
            <FileCheck className="w-4 h-4 mr-2" />
            Start Verification
          </Button>
        </div>
      </div>

      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Overall Score</p>
                <p className="text-2xl font-bold text-green-600">{supplier.overallScore}/100</p>
              </div>
              <Award className="w-8 h-8 text-green-600" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Risk Level</p>
                <p className="text-2xl font-bold text-green-600 capitalize">{supplier.riskLevel}</p>
              </div>
              <Shield className="w-8 h-8 text-green-600" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Documents</p>
                <p className="text-2xl font-bold">{supplier.attachments?.length ?? 0}</p>
              </div>
              <FileText className="w-8 h-8 text-primary" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Last Update</p>
                <p className="text-sm font-medium">{supplier.lastUpdate ? formatDate(supplier.lastUpdate) : "-"}</p>
              </div>
              <Calendar className="w-8 h-8 text-primary" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Main Content Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-5">
          <TabsTrigger value="overview">{t(uiTranslations.overview)}</TabsTrigger>
          <TabsTrigger value="profile">{t(uiTranslations.profile)}</TabsTrigger>
          <TabsTrigger value="documents">{t(uiTranslations.documents)}</TabsTrigger>
          <TabsTrigger value="scorecard">{t(uiTranslations.scorecard)}</TabsTrigger>
          <TabsTrigger value="timeline">{t(uiTranslations.timeline)}</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Company Information */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <Building2 className="w-5 h-5 mr-2" />
                  {t(uiTranslations.companyInformation)}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm text-muted-foreground">VAT Number</p>
                    <p className="font-medium">{supplier.vatNumber || '-'}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Fiscal Code</p>
                    <p className="font-medium">{supplier.fiscalCode || '-'}</p>
                  </div>
                </div>
                <Separator />
                <div className="space-y-3">
                  <p className="text-sm font-medium text-muted-foreground">Address</p>
                  <div className="text-sm">
                    <p>{supplier.address.street}</p>
                    <p>{supplier.address.city} {supplier.address.postalCode}</p>
                    <p>{supplier.address.province}, {supplier.address.country}</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Contact Information */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <Phone className="w-5 h-5 mr-2" />
                  {t(uiTranslations.contactInformation)}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center space-x-3">
                  <Avatar>
                    <AvatarFallback>
                      <AvatarInitials name={supplier.contact.primaryContact || 'N/A'} />
                    </AvatarFallback>
                  </Avatar>
                  <div>
                    <p className="font-medium">{supplier.contact.primaryContact || 'No contact assigned'}</p>
                    <p className="text-sm text-muted-foreground">{supplier.contact.role || 'N/A'}</p>
                  </div>
                </div>
                <Separator />
                <div className="space-y-2">
                  <div className="flex items-center">
                    <Mail className="w-4 h-4 mr-2 text-muted-foreground" />
                    <span className="text-sm">{supplier.contact.email || 'No email provided'}</span>
                  </div>
                  <div className="flex items-center">
                    <Phone className="w-4 h-4 mr-2 text-muted-foreground" />
                    <span className="text-sm">{supplier.contact.phone || 'No phone provided'}</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Profile / deBasic Answers */}
        <TabsContent value="profile" className="space-y-6">
          {/* Profile Validation */}
          <SupplierProfileValidation supplierId={supplierId} />
        </TabsContent>

        <TabsContent value="scorecard" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <Award className="w-5 h-5 mr-2" />
                Interactive Scorecard
              </CardTitle>
              <CardDescription>Detailed verification status for all compliance requirements</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {(supplier.scorecard.sections as any[]).map((section: any) => (
                <div key={section.id} className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                      <div
                        className={cn("w-3 h-3 rounded-full", getStatusColor(section.status).replace("text-", "bg-"))}
                      />
                      <h3 className="text-lg font-semibold">{section.name}</h3>
                      <Badge variant="outline">{section.score}/100</Badge>
                    </div>
                    <div className="text-sm text-muted-foreground">Weight: {section.weight}%</div>
                  </div>
                  <Progress value={section.score} className="h-2" />
                  <div className="space-y-2">
                    {(section.requirements as any[]).map((req: any, index: number) => (
                      <div key={index} className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
                        <div className="flex items-center space-x-3">
                          <div
                            className={cn(
                              "flex items-center justify-center w-6 h-6 rounded-full text-xs",
                              getStatusColor(req.status),
                            )}
                          >
                            {getStatusIcon(req.status)}
                          </div>
                          <div>
                            <p className="font-medium">{req.name}</p>
                            {req.expiryDate && (
                              <p className="text-xs text-muted-foreground">Expires: {formatDate(req.expiryDate)}</p>
                            )}
                          </div>
                        </div>
                        <div className="flex items-center space-x-2">
                          {req.required && (
                            <Badge variant="destructive" className="text-xs">
                              Required
                            </Badge>
                          )}
                          <Badge className={cn("text-xs", getStatusColor(req.status))} variant="outline">
                            {req.status}
                          </Badge>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="documents" className="space-y-6">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="flex items-center">
                  <FileText className="w-5 h-5 mr-2" />
                  Document Management
                </CardTitle>
                <Button>
                  <Upload className="w-4 h-4 mr-2" />
                  Upload Document
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {supplier.attachments && supplier.attachments.length > 0 ? (
                  supplier.attachments.map((attachment: any) => (
                    <div key={attachment.id} className="flex items-center justify-between p-4 border rounded-lg">
                      <div className="flex items-center space-x-3">
                        <div className="w-10 h-10 bg-primary/10 rounded-lg flex items-center justify-center">
                          <FileText className="w-5 h-5 text-primary" />
                        </div>
                        <div>
                          <p className="font-medium">{attachment.filename || attachment.original_filename}</p>
                          <div className="flex items-center space-x-4 text-sm text-muted-foreground">
                            <span>Type: {attachment.cert_type || 'Document'}</span>
                            {attachment.file_size && (
                              <span>Size: {(attachment.file_size / 1024).toFixed(1)} KB</span>
                            )}
                            <span>Downloaded: {attachment.downloaded_at ? formatDate(attachment.downloaded_at) : "-"}</span>
                          </div>
                          {attachment.question_code && (
                            <p className="text-xs text-muted-foreground">Question: {attachment.question_code}</p>
                          )}
                          {attachment.content_type && (
                            <p className="text-xs text-muted-foreground">Format: {attachment.content_type}</p>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center space-x-2">
                        <Badge 
                          className={cn("text-xs", 
                            attachment.download_status === 'success' ? "text-green-600 bg-green-100" :
                            attachment.download_status === 'failed' ? "text-red-600 bg-red-100" :
                            "text-yellow-600 bg-yellow-100"
                          )} 
                          variant="outline"
                        >
                          {attachment.download_status === 'success' ? 'Downloaded' :
                           attachment.download_status === 'failed' ? 'Failed' : 'Pending'}
                        </Badge>
                        {attachment.analysis_status && (
                          <Badge 
                            className={cn("text-xs",
                              attachment.analysis_status === 'completed' ? "text-blue-600 bg-blue-100" :
                              attachment.analysis_status === 'processing' ? "text-orange-600 bg-orange-100" :
                              attachment.analysis_status === 'failed' ? "text-red-600 bg-red-100" :
                              "text-gray-600 bg-gray-100"
                            )}
                            variant="outline"
                          >
                            {attachment.analysis_status === 'completed' ? 'Analyzed' :
                             attachment.analysis_status === 'processing' ? 'Analyzing' :
                             attachment.analysis_status === 'failed' ? 'Analysis Failed' : 'Not Analyzed'}
                          </Badge>
                        )}
                        {attachment.download_status === 'success' && (
                          <>
                            <Button 
                              variant="ghost" 
                              size="sm"
                              title="Analyze document with AI"
                              onClick={() => {
                                setSelectedAttachment(attachment)
                                setAnalysisDialogOpen(true)
                              }}
                            >
                              <Brain className="w-4 h-4" />
                            </Button>
                            <Button 
                              variant="ghost" 
                              size="sm"
                              title="Preview file"
                              onClick={() => {
                                // Preview file directly from database
                                window.open(`/api/attachments/${attachment.id}`, '_blank')
                              }}
                            >
                              <Eye className="w-4 h-4" />
                            </Button>
                            <Button 
                              variant="ghost" 
                              size="sm"
                              title="Download file"
                              onClick={() => {
                                // Download file directly from database
                                const link = document.createElement('a')
                                link.href = `/api/attachments/${attachment.id}`
                                link.download = attachment.filename || 'attachment'
                                document.body.appendChild(link)
                                link.click()
                                document.body.removeChild(link)
                              }}
                            >
                              <Download className="w-4 h-4" />
                            </Button>
                          </>
                        )}
                        {attachment.download_status === 'failed' && attachment.download_error && (
                          <Button 
                            variant="ghost" 
                            size="sm"
                            title={`Error: ${attachment.download_error}`}
                          >
                            <AlertTriangle className="w-4 h-4 text-red-500" />
                          </Button>
                        )}
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="text-center py-8 text-muted-foreground">
                    <FileText className="w-12 h-12 mx-auto mb-4 opacity-50" />
                    <p>No documents available</p>
                    <p className="text-sm">Documents will appear here after supplier synchronization</p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="timeline" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <History className="w-5 h-5 mr-2" />
                Verification Timeline
              </CardTitle>
              <CardDescription>Complete audit trail of all supplier activities</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {(supplier.timeline ?? []).map((event: any, index: number) => (
                  <div key={event.id} className="flex items-start space-x-3">
                    <div className="w-2 h-2 bg-primary rounded-full mt-2" />
                    <div className="flex-1 space-y-1">
                      <div className="flex items-center justify-between">
                        <p className="font-medium">{event.title}</p>
                        <span className="text-sm text-muted-foreground">{formatDateTime(event.timestamp)}</span>
                      </div>
                      <p className="text-sm text-muted-foreground">{event.description}</p>
                      <p className="text-xs text-muted-foreground">by {event.user}</p>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Document Analysis Dialog */}
      {selectedAttachment && (
        <DocumentAnalysisDialog
          open={analysisDialogOpen}
          onOpenChange={setAnalysisDialogOpen}
          attachment={selectedAttachment}
          supplierId={supplierId}
          onAnalysisComplete={() => {
            // Refresh supplier data to show updated analysis status without page reload
            if (typeof (window as any).__refreshSupplier === 'function') {
              (window as any).__refreshSupplier()
            }
          }}
        />
      )}
    </div>
  )
}
