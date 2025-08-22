"use client"

import { useEffect, useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import { Button } from "@/components/ui/button"
import { Separator } from "@/components/ui/separator"
import { 
  CheckCircle, 
  XCircle, 
  AlertTriangle, 
  RefreshCw, 
  Shield, 
  FileCheck,
  AlertCircle,
  Info
} from "lucide-react"
import { cn } from "@/lib/utils"
import { ProfileValidationSummary, ValidationResult } from "@/lib/supplier-profile-validator"
import { useI18n } from "@/hooks/use-i18n"
import { supplierProfileTranslations } from "@/lib/i18n/translations"

interface SupplierProfileValidationProps {
  supplierId: string
  className?: string
}

interface ValidationData {
  supplierId: string
  bravoId?: string
  companyName: string
  validation: ProfileValidationSummary
  lastValidated: string
}

export function SupplierProfileValidation({ supplierId, className }: SupplierProfileValidationProps) {
  const [validationData, setValidationData] = useState<ValidationData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [refreshing, setRefreshing] = useState(false)
  const { t, formatDateTime } = useI18n()

  const fetchValidation = async () => {
    try {
      setError(null)
      const response = await fetch(`/api/suppliers/${encodeURIComponent(supplierId)}/profile-validation`)
      const result = await response.json()

      if (!response.ok || !result.success) {
        throw new Error(result.error || 'Failed to fetch validation data')
      }

      setValidationData(result.data)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error')
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }

  useEffect(() => {
    fetchValidation()
  }, [supplierId])

  const handleRefresh = async () => {
    setRefreshing(true)
    await fetchValidation()
  }

  const getValidationIcon = (result: ValidationResult) => {
    if (result.isValid) {
      return <CheckCircle className="w-4 h-4 text-green-600" />
    } else if (result.currentValue === null || result.currentValue === '') {
      return <AlertTriangle className="w-4 h-4 text-yellow-600" />
    } else {
      return <XCircle className="w-4 h-4 text-red-600" />
    }
  }

  const getValidationColor = (result: ValidationResult) => {
    if (result.isValid) {
      return "text-green-600 bg-green-100"
    } else if (result.currentValue === null || result.currentValue === '') {
      return "text-yellow-600 bg-yellow-100"
    } else {
      return "text-red-600 bg-red-100"
    }
  }

  const getFieldDisplayName = (fieldName: string) => {
    const fieldTranslation = supplierProfileTranslations.fieldNames[fieldName as keyof typeof supplierProfileTranslations.fieldNames]
    return fieldTranslation ? t(fieldTranslation) : fieldName
  }

  if (loading) {
    return (
      <Card className={className}>
        <CardContent className="p-6">
          <div className="flex items-center justify-center">
            <RefreshCw className="w-6 h-6 animate-spin mr-2" />
            <span>{t(supplierProfileTranslations.loadingProfileValidation)}</span>
          </div>
        </CardContent>
      </Card>
    )
  }

  if (error) {
    return (
      <Card className={className}>
        <CardContent className="p-6">
          <div className="text-center">
            <AlertCircle className="w-12 h-12 mx-auto mb-4 text-red-500" />
            <p className="text-red-600 mb-4">{t(supplierProfileTranslations.failedToLoadProfileValidation)}</p>
            <p className="text-sm text-muted-foreground mb-4">{error}</p>
            <Button onClick={handleRefresh} variant="outline">
              <RefreshCw className="w-4 h-4 mr-2" />
              {t(supplierProfileTranslations.retry)}
            </Button>
          </div>
        </CardContent>
      </Card>
    )
  }

  if (!validationData) {
    return (
      <Card className={className}>
        <CardContent className="p-6">
          <div className="text-center text-muted-foreground">
          {t(supplierProfileTranslations.noValidationDataAvailable)}
        </div>
        </CardContent>
      </Card>
    )
  }

  const { validation } = validationData

  return (
    <Card className={className}>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <Shield className="w-5 h-5" />
            <CardTitle>{t(supplierProfileTranslations.profileComplianceValidation)}</CardTitle>
          </div>
          <Button 
            variant="ghost" 
            size="sm" 
            onClick={handleRefresh}
            disabled={refreshing}
          >
            <RefreshCw className={cn("w-4 h-4", refreshing && "animate-spin")} />
          </Button>
        </div>
        <CardDescription>
          {t(supplierProfileTranslations.profileValidationDescription)}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Compliance Summary */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="text-center">
            <div className={cn(
              "text-3xl font-bold mb-1",
              validation.isCompliant ? "text-green-600" : "text-red-600"
            )}>
              {validation.complianceScore}%
            </div>
            <p className="text-sm text-muted-foreground">{t(supplierProfileTranslations.complianceScore)}</p>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-green-600 mb-1">
              {validation.validFields}
            </div>
            <p className="text-sm text-muted-foreground">{t(supplierProfileTranslations.validFields)}</p>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-red-600 mb-1">
              {validation.invalidFields}
            </div>
            <p className="text-sm text-muted-foreground">{t(supplierProfileTranslations.invalidFields)}</p>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-yellow-600 mb-1">
              {validation.missingFields}
            </div>
            <p className="text-sm text-muted-foreground">{t(supplierProfileTranslations.missingFields)}</p>
          </div>
        </div>

        {/* Progress Bar */}
        <div className="space-y-2">
          <div className="flex justify-between text-sm">
            <span>{t(supplierProfileTranslations.profileCompletion)}</span>
            <span>{validation.validFields}/{validation.totalFields} {t(supplierProfileTranslations.fields)}</span>
          </div>
          <Progress value={validation.complianceScore} className="h-2" />
        </div>

        {/* Overall Status Badge */}
        <div className="flex items-center justify-center">
          <Badge 
            variant={validation.isCompliant ? "default" : "destructive"}
            className="text-sm px-4 py-2"
          >
            {validation.isCompliant ? (
              <>
                <CheckCircle className="w-4 h-4 mr-2" />
                {t(supplierProfileTranslations.profileCompliant)}
              </>
            ) : (
              <>
                <XCircle className="w-4 h-4 mr-2" />
                {t(supplierProfileTranslations.profileNonCompliant)}
              </>
            )}
          </Badge>
        </div>

        <Separator />

        {/* Detailed Field Validation */}
        <div className="space-y-3">
          <h4 className="font-medium flex items-center">
            <FileCheck className="w-4 h-4 mr-2" />
            {t(supplierProfileTranslations.fieldValidationDetails)}
          </h4>
          
          <div className="space-y-2 max-h-96 overflow-y-auto">
            {validation.results.map((result, index) => (
              <div key={index} className="flex items-start justify-between p-3 border rounded-lg">
                <div className="flex items-start space-x-3 flex-1">
                  {getValidationIcon(result)}
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-sm">{getFieldDisplayName(result.field)}</p>
                    <p className="text-xs text-muted-foreground mb-1">{result.field}</p>
                    
                    {result.currentValue && (
                      <p className="text-xs text-muted-foreground break-words">
                        <strong>{t(supplierProfileTranslations.current)}:</strong> {String(result.currentValue)}
                      </p>
                    )}
                    
                    {result.expectedValue && result.type === 'exact_match' && (
                      <p className="text-xs text-muted-foreground break-words">
                        <strong>{t(supplierProfileTranslations.expected)}:</strong> {result.expectedValue}
                      </p>
                    )}
                    
                    <p className="text-xs mt-1 text-muted-foreground">
                      {result.message}
                    </p>
                  </div>
                </div>
                
                <Badge 
                  variant="outline" 
                  className={cn("text-xs ml-2 flex-shrink-0", getValidationColor(result))}
                >
                  {result.isValid ? t(supplierProfileTranslations.valid) : 
                   (result.currentValue === null || result.currentValue === '') ? t(supplierProfileTranslations.missing) : t(supplierProfileTranslations.invalid)}
                </Badge>
              </div>
            ))}
          </div>
        </div>

        {/* Last Validated */}
        <div className="text-xs text-muted-foreground text-center">
          {t(supplierProfileTranslations.lastValidated)}: {formatDateTime(validationData.lastValidated)}
        </div>
      </CardContent>
    </Card>
  )
}
