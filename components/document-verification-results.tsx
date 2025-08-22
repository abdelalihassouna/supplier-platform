"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Progress } from "@/components/ui/progress"
import { Separator } from "@/components/ui/separator"
import { Alert, AlertDescription } from "@/components/ui/alert"
import {
  CheckCircle,
  XCircle,
  AlertTriangle,
  Clock,
  Brain,
  FileCheck,
  AlertCircle,
  Sparkles,
  RefreshCw
} from "lucide-react"
import { cn } from "@/lib/utils"

interface VerificationField {
  field_name: string
  ocr_value: string | null
  api_value: string | null
  rule_type: string
  threshold: number
  is_required: boolean
  expected_values?: string[]
  match_score: number
  status: 'match' | 'mismatch' | 'missing' | 'invalid'
  notes?: string
}

interface VerificationResult {
  overall_result: 'match' | 'mismatch' | 'partial_match' | 'no_data'
  confidence_score: number
  field_comparisons: VerificationField[]
  discrepancies: string[]
  ai_analysis: string
}

type AIVerdict = {
  company_match: boolean
  fiscal_code_match: boolean
  address_match?: boolean
  durc_valid?: boolean
  document_valid?: boolean
  compliance_risk: 'High' | 'Medium' | 'Low'
  required_actions: string
  // Document-specific fields
  vat_match?: boolean
  activity_status?: boolean
  certificate_valid?: boolean
  rea_valid?: boolean
  soa_categories_match?: boolean
}

type DocumentType = 'DURC' | 'VISURA' | 'SOA' | 'ISO' | 'CCIAA'

interface DocumentVerificationResultsProps {
  analysisId: string
  docType: DocumentType
  onVerificationStart?: () => void
  onVerificationComplete?: (result: VerificationResult) => void
}

export function DocumentVerificationResults({ 
  analysisId, 
  docType, 
  onVerificationStart,
  onVerificationComplete 
}: DocumentVerificationResultsProps) {
  const [verification, setVerification] = useState<any>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [verifying, setVerifying] = useState(false)

  useEffect(() => {
    fetchVerificationResults()
  }, [analysisId])

  const fetchVerificationResults = async () => {
    try {
      setLoading(true)
      setError(null)
      
      const response = await fetch(`/api/documents/verify?analysisId=${analysisId}`)
      const data = await response.json()
      
      if (response.ok && data.success) {
        setVerification(data.data)
      } else if (response.status === 404) {
        // No verification exists yet
        setVerification(null)
      } else {
        setError(data.error || 'Failed to fetch verification results')
      }
    } catch (err) {
      setError('Network error while fetching verification results')
    } finally {
      setLoading(false)
    }
  }

  const startVerification = async (forceRerun = false) => {
    try {
      setVerifying(true)
      setError(null)
      onVerificationStart?.()
      
      const response = await fetch('/api/documents/verify', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ analysisId, docType, forceRerun })
      })
      
      const data = await response.json()
      
      if (response.ok && data.success) {
        await fetchVerificationResults()
        onVerificationComplete?.(data.data)
      } else {
        setError(data.error || 'Verification failed')
      }
    } catch (err) {
      setError('Network error during verification')
    } finally {
      setVerifying(false)
    }
  }

  const getResultColor = (result: string) => {
    switch (result) {
      case 'match':
        return 'text-green-600 bg-green-100'
      case 'partial_match':
        return 'text-yellow-600 bg-yellow-100'
      case 'mismatch':
        return 'text-red-600 bg-red-100'
      case 'no_data':
        return 'text-gray-600 bg-gray-100'
      default:
        return 'text-gray-600 bg-gray-100'
    }
  }

  const getResultIcon = (result: string) => {
    switch (result) {
      case 'match':
        return <CheckCircle className="w-4 h-4" />
      case 'partial_match':
        return <AlertTriangle className="w-4 h-4" />
      case 'mismatch':
        return <XCircle className="w-4 h-4" />
      case 'no_data':
        return <AlertCircle className="w-4 h-4" />
      default:
        return <Clock className="w-4 h-4" />
    }
  }

  const getFieldStatusColor = (status: string) => {
    switch (status) {
      case 'match':
        return 'text-green-600 bg-green-50 border-green-200'
      case 'mismatch':
        return 'text-red-600 bg-red-50 border-red-200'
      case 'missing':
        return 'text-yellow-600 bg-yellow-50 border-yellow-200'
      case 'invalid':
        return 'text-red-600 bg-red-50 border-red-200'
      default:
        return 'text-gray-600 bg-gray-50 border-gray-200'
    }
  }

  const formatFieldName = (fieldName: string, docType: DocumentType) => {
    const fieldLabels: Record<string, Record<string, string>> = {
      DURC: {
        'denominazione_ragione_sociale': 'Company Name',
        'codice_fiscale': 'Fiscal Code',
        'sede_legale': 'Legal Address',
        'risultato': 'DURC Status',
        'scadenza_validita': 'Expiry Date'
      },
      VISURA: {
        'denominazione_ragione_sociale': 'Company Name',
        'codice_fiscale': 'Fiscal Code',
        'partita_iva': 'VAT Number',
        'sede_legale': 'Legal Address',
        'stato_attivita': 'Activity Status',
        'attivita_esercitata': 'Business Activity',
        'capitale_sociale_sottoscritto': 'Share Capital',
        'data_estratto': 'Extract Date'
      },
      SOA: {
        'denominazione_ragione_sociale': 'Company Name',
        'codice_fiscale': 'Fiscal Code',
        'categorie': 'SOA Categories',
        'ente_attestazione': 'Attestation Entity',
        'data_emissione': 'Issue Date',
        'data_scadenza_validita_triennale': 'Triennale Expiry',
        'data_scadenza_validita_quinquennale': 'Quinquennale Expiry'
      },
      ISO: {
        'denominazione_ragione_sociale': 'Company Name',
        'numero_certificazione': 'Certificate Number',
        'standard': 'ISO Standard',
        'ente_certificatore': 'Certification Body',
        'data_emissione': 'Issue Date',
        'data_scadenza': 'Expiry Date'
      },
      CCIAA: {
        'denominazione_ragione_sociale': 'Company Name',
        'codice_fiscale': 'Fiscal Code',
        'sede_legale': 'Legal Address',
        'rea': 'REA Number',
        'data_iscrizione': 'Registration Date'
      }
    }
    return fieldLabels[docType]?.[fieldName] || fieldName
  }

  const getDocumentSpecificFields = (docType: DocumentType): string[] => {
    const specificFields: Record<DocumentType, string[]> = {
      DURC: ['risultato', 'scadenza_validita'],
      VISURA: ['stato_attivita', 'attivita_esercitata', 'capitale_sociale_sottoscritto', 'data_estratto'],
      SOA: ['ente_attestazione', 'data_emissione', 'data_scadenza_validita_triennale', 'data_scadenza_validita_quinquennale'],
      ISO: ['numero_certificazione', 'standard', 'ente_certificatore', 'data_emissione', 'data_scadenza'],
      CCIAA: ['rea', 'data_iscrizione']
    }
    return specificFields[docType] || []
  }

  const renderDocumentSpecificVerdict = (verdict: AIVerdict, docType: DocumentType) => {
    switch (docType) {
      case 'DURC':
        return (
          <div className="p-3 rounded border bg-background/50">
            <div className="text-sm text-muted-foreground mb-1">DURC Valid</div>
            <Badge className={cn('text-xs', verdict.durc_valid ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700')} variant="outline">
              {verdict.durc_valid ? 'Valid' : 'Expired/Invalid'}
            </Badge>
          </div>
        )
      case 'VISURA':
        return (
          <>
            {verdict.vat_match !== undefined && (
              <div className="p-3 rounded border bg-background/50">
                <div className="text-sm text-muted-foreground mb-1">VAT Match</div>
                <Badge className={cn('text-xs', verdict.vat_match ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700')} variant="outline">
                  {verdict.vat_match ? 'Yes' : 'No'}
                </Badge>
              </div>
            )}
            {verdict.activity_status !== undefined && (
              <div className="p-3 rounded border bg-background/50">
                <div className="text-sm text-muted-foreground mb-1">Activity Status</div>
                <Badge className={cn('text-xs', verdict.activity_status ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700')} variant="outline">
                  {verdict.activity_status ? 'Active' : 'Inactive'}
                </Badge>
              </div>
            )}
          </>
        )
      case 'SOA':
        return (
          <>
            {verdict.soa_categories_match !== undefined && (
              <div className="p-3 rounded border bg-background/50">
                <div className="text-sm text-muted-foreground mb-1">SOA Categories Match</div>
                <Badge className={cn('text-xs', verdict.soa_categories_match ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700')} variant="outline">
                  {verdict.soa_categories_match ? 'Yes' : 'No'}
                </Badge>
              </div>
            )}
            <div className="p-3 rounded border bg-background/50">
              <div className="text-sm text-muted-foreground mb-1">Certificate Valid</div>
              <Badge className={cn('text-xs', verdict.certificate_valid ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700')} variant="outline">
                {verdict.certificate_valid ? 'Valid' : 'Expired/Invalid'}
              </Badge>
            </div>
          </>
        )
      case 'ISO':
        return (
          <div className="p-3 rounded border bg-background/50">
            <div className="text-sm text-muted-foreground mb-1">Certificate Valid</div>
            <Badge className={cn('text-xs', verdict.certificate_valid ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700')} variant="outline">
              {verdict.certificate_valid ? 'Valid' : 'Expired/Invalid'}
            </Badge>
          </div>
        )
      case 'CCIAA':
        return (
          <div className="p-3 rounded border bg-background/50">
            <div className="text-sm text-muted-foreground mb-1">REA Valid</div>
            <Badge className={cn('text-xs', verdict.rea_valid ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700')} variant="outline">
              {verdict.rea_valid ? 'Valid' : 'Invalid Format'}
            </Badge>
          </div>
        )
      default:
        return null
    }
  }

  if (loading) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="flex items-center justify-center space-x-2">
            <RefreshCw className="w-4 h-4 animate-spin" />
            <span className="text-sm text-muted-foreground">Loading verification results...</span>
          </div>
        </CardContent>
      </Card>
    )
  }

  if (error) {
    return (
      <Card>
        <CardContent className="p-6">
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
          <Button 
            variant="outline" 
            size="sm" 
            className="mt-4"
            onClick={fetchVerificationResults}
          >
            <RefreshCw className="w-4 h-4 mr-2" />
            Retry
          </Button>
        </CardContent>
      </Card>
    )
  }

  if (!verification) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <Brain className="w-5 h-5 mr-2" />
            AI Document Verification
          </CardTitle>
          <CardDescription>
            Use AI to verify {docType} document data against supplier information
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="text-center py-6">
            <Sparkles className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
            <p className="text-sm text-muted-foreground mb-4">
              No verification has been performed yet. Click below to start AI-powered verification.
            </p>
            <Button 
              onClick={() => startVerification(false)} 
              disabled={verifying}
              className="w-full"
            >
              {verifying ? (
                <>
                  <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                  Verifying with AI...
                </>
              ) : (
                <>
                  <Brain className="w-4 h-4 mr-2" />
                  Start AI Verification
                </>
              )}
            </Button>
          </div>
        </CardContent>
      </Card>
    )
  }

  // Handle field_comparisons - it might be already parsed or a string
  const fieldComparisons: VerificationField[] = typeof verification.field_comparisons === 'string' 
    ? (JSON.parse(verification.field_comparisons || '[]') as VerificationField[])
    : ((verification.field_comparisons || []) as VerificationField[])
  
  // Handle discrepancies - it might be already parsed or a string  
  const discrepancies: string[] = typeof verification.discrepancies === 'string'
    ? (JSON.parse(verification.discrepancies || '[]') as string[])
    : ((verification.discrepancies || []) as string[])

  // Deduplicate fields defensively: prefer non-document-specific over document-specific entries
  const dedupedComparisons: VerificationField[] = (() => {
    const map = new Map<string, VerificationField>()
    for (const f of fieldComparisons as VerificationField[]) {
      const key = f.field_name
      const existing = map.get(key)
      if (!existing) {
        map.set(key, f)
      } else {
        const existingIsDocSpecific = existing.rule_type === 'document_specific'
        const currentIsDocSpecific = f.rule_type === 'document_specific'
        if (existingIsDocSpecific && !currentIsDocSpecific) {
          map.set(key, f)
        }
      }
    }
    return Array.from(map.values())
  })()

  return (
    <div className="space-y-6">
      {/* Overall Result */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <div className="flex items-center">
              <Brain className="w-5 h-5 mr-2" />
              AI Verification Results
            </div>
            <Button 
              variant="outline" 
              size="sm" 
              onClick={() => startVerification(true)}
              disabled={verifying}
            >
              {verifying ? (
                <RefreshCw className="w-4 h-4 animate-spin" />
              ) : (
                <RefreshCw className="w-4 h-4" />
              )}
            </Button>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center space-x-3">
              <Badge className={cn("text-sm", getResultColor(verification.verification_result))}>
                {getResultIcon(verification.verification_result)}
                <span className="ml-2 capitalize">{verification.verification_result.replace('_', ' ')}</span>
              </Badge>
              <div className="text-sm text-muted-foreground">
                Confidence: {verification.confidence_score}%
              </div>
            </div>
            <div className="text-xs text-muted-foreground">
              Verified: {new Date(verification.created_at).toLocaleString()}
            </div>
          </div>
          
          <Progress value={verification.confidence_score} className="mb-4" />
          
          {discrepancies.length > 0 && (
            <Alert variant="destructive" className="mb-4">
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription>
                <strong>{discrepancies.length} issue(s) found:</strong>
                <ul className="mt-2 list-disc list-inside text-sm">
                  {discrepancies.slice(0, 3).map((discrepancy, index) => (
                    <li key={index}>{discrepancy}</li>
                  ))}
                  {discrepancies.length > 3 && (
                    <li>...and {discrepancies.length - 3} more</li>
                  )}
                </ul>
              </AlertDescription>
            </Alert>
          )}
        </CardContent>
      </Card>

      {/* Field Comparisons */}
      <Card>
        <CardHeader>
          <CardTitle>Field-by-Field Comparison</CardTitle>
          <CardDescription>
            Detailed comparison between OCR extracted data and supplier database
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {dedupedComparisons.map((field, index) => (
              <div 
                key={index} 
                className={cn(
                  "p-4 rounded-lg border",
                  getFieldStatusColor(field.status)
                )}
              >
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center space-x-2">
                    <h4 className="font-medium">{formatFieldName(field.field_name, docType)}</h4>
                    <Badge variant="outline" className="text-xs">
                      {field.match_score.toFixed(1)}%
                    </Badge>
                    {field.is_required && (
                      <Badge variant="destructive" className="text-xs">Required</Badge>
                    )}
                  </div>
                  <Badge variant="outline" className="text-xs capitalize">
                    {field.status}
                  </Badge>
                </div>
                
                {/* Show different layouts based on whether field has API comparison */}
                {getDocumentSpecificFields(docType).includes(field.field_name) ? (
                  // Single column for fields without API data
                  <div className="text-sm">
                    <div>
                      <p className="text-muted-foreground mb-1">OCR Extracted:</p>
                      <p className="font-mono bg-background/50 p-2 rounded border">
                        {field.ocr_value || <span className="text-muted-foreground italic">Not found</span>}
                      </p>
                    </div>
                  </div>
                ) : (
                  // Two columns for fields with API comparison
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                    <div>
                      <p className="text-muted-foreground mb-1">OCR Extracted:</p>
                      <p className="font-mono bg-background/50 p-2 rounded border">
                        {field.ocr_value || <span className="text-muted-foreground italic">Not found</span>}
                      </p>
                    </div>
                    <div>
                      <p className="text-muted-foreground mb-1">Supplier DB:</p>
                      <p className="font-mono bg-background/50 p-2 rounded border">
                        {field.api_value || <span className="text-muted-foreground italic">Not available</span>}
                      </p>
                    </div>
                  </div>
                )}
                
                {field.notes && (
                  <div className="mt-2 text-xs text-muted-foreground">
                    <strong>Note:</strong> {field.notes}
                  </div>
                )}
                
                {field.expected_values && field.expected_values.length > 0 && (
                  <div className="mt-2 text-xs text-muted-foreground">
                    <strong>Expected values:</strong> {field.expected_values.join(', ')}
                  </div>
                )}
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* AI Verdict (structured) + AI Analysis (raw fallback) */}
      {verification.ai_analysis && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <Sparkles className="w-5 h-5 mr-2" />
              AI Verdict & Analysis
            </CardTitle>
          </CardHeader>
          <CardContent>
            {(() => {
              const text: string = verification.ai_analysis || ''
              // Try to extract the first JSON object from the beginning of the text
              let verdict: AIVerdict | null = null
              let explanation: string | null = null
              try {
                const jsonMatch = text.match(/\{[\s\S]*?\}/)
                if (jsonMatch) {
                  verdict = JSON.parse(jsonMatch[0]) as AIVerdict
                  explanation = text.slice(jsonMatch.index! + jsonMatch[0].length).trim()
                }
              } catch {
                verdict = null
              }

              return (
                <div className="space-y-4">
                  {verdict && (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="p-3 rounded border bg-background/50">
                        <div className="text-sm text-muted-foreground mb-1">Company Match</div>
                        <Badge className={cn('text-xs', verdict.company_match ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700')} variant="outline">
                          {verdict.company_match ? 'Yes' : 'No'}
                        </Badge>
                      </div>
                      {docType !== 'ISO' && (
                        <div className="p-3 rounded border bg-background/50">
                          <div className="text-sm text-muted-foreground mb-1">Fiscal Code Match</div>
                          <Badge className={cn('text-xs', verdict.fiscal_code_match ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700')} variant="outline">
                            {verdict.fiscal_code_match ? 'Yes' : 'No'}
                          </Badge>
                        </div>
                      )}
                      <div className="p-3 rounded border bg-background/50">
                        <div className="text-sm text-muted-foreground mb-1">Address Match</div>
                        <Badge className={cn('text-xs', verdict.address_match ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700')} variant="outline">
                          {verdict.address_match ? 'Yes' : 'No'}
                        </Badge>
                      </div>
                      {renderDocumentSpecificVerdict(verdict, docType)}
                      <div className="p-3 rounded border bg-background/50">
                        <div className="text-sm text-muted-foreground mb-1">Compliance Risk</div>
                        <Badge variant="outline" className={cn('text-xs',
                          verdict.compliance_risk === 'Low' && 'bg-green-100 text-green-700',
                          verdict.compliance_risk === 'Medium' && 'bg-yellow-100 text-yellow-700',
                          verdict.compliance_risk === 'High' && 'bg-red-100 text-red-700'
                        )}>
                          {verdict.compliance_risk}
                        </Badge>
                      </div>
                      <div className="p-3 rounded border bg-background/50 md:col-span-2">
                        <div className="text-sm text-muted-foreground mb-1">Required Actions</div>
                        <div className="text-sm whitespace-pre-wrap">{verdict.required_actions}</div>
                      </div>
                    </div>
                  )}

                  {/* Explanation and raw fallback */}
                  <div className="bg-muted/50 p-4 rounded-lg">
                    <pre className="whitespace-pre-wrap text-sm font-mono">
                      {verdict ? (explanation || '') : text}
                    </pre>
                  </div>
                </div>
              )
            })()}
          </CardContent>
        </Card>
      )}
    </div>
  )
}
