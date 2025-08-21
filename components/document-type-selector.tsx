'use client'

import { useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { FileText, Building2, Award, Shield, Briefcase } from 'lucide-react'
import { cn } from '@/lib/utils'

type DocumentType = 'DURC' | 'VISURA' | 'SOA' | 'ISO' | 'CCIAA'

interface DocumentTypeInfo {
  id: DocumentType
  name: string
  description: string
  icon: React.ComponentType<{ className?: string }>
  fields: string[]
  color: string
}

const documentTypes: DocumentTypeInfo[] = [
  {
    id: 'DURC',
    name: 'DURC',
    description: 'Documento Unico di Regolarità Contributiva',
    icon: Shield,
    fields: ['Company Name', 'Fiscal Code', 'Legal Address', 'DURC Status', 'Expiry Date'],
    color: 'bg-blue-50 border-blue-200 hover:bg-blue-100'
  },
  {
    id: 'VISURA',
    name: 'VISURA',
    description: 'Visura Camerale - Chamber of Commerce Extract',
    icon: Building2,
    fields: ['Company Name', 'Fiscal Code', 'VAT Number', 'Legal Address', 'Activity Status'],
    color: 'bg-green-50 border-green-200 hover:bg-green-100'
  },
  {
    id: 'SOA',
    name: 'SOA',
    description: 'Società Organismi di Attestazione',
    icon: Award,
    fields: ['Company Name', 'Fiscal Code', 'SOA Categories', 'Attestation Entity', 'Expiry Dates'],
    color: 'bg-purple-50 border-purple-200 hover:bg-purple-100'
  },
  {
    id: 'ISO',
    name: 'ISO',
    description: 'International Organization for Standardization Certificate',
    icon: FileText,
    fields: ['Company Name', 'Fiscal Code', 'Certificate Number', 'ISO Standard', 'Certification Body'],
    color: 'bg-orange-50 border-orange-200 hover:bg-orange-100'
  },
  {
    id: 'CCIAA',
    name: 'CCIAA',
    description: 'Camera di Commercio, Industria, Artigianato e Agricoltura',
    icon: Briefcase,
    fields: ['Company Name', 'Fiscal Code', 'Legal Address', 'REA Number', 'Registration Date'],
    color: 'bg-teal-50 border-teal-200 hover:bg-teal-100'
  }
]

interface DocumentTypeSelectorProps {
  selectedType?: DocumentType
  onTypeSelect: (type: DocumentType) => void
  disabled?: boolean
}

export function DocumentTypeSelector({ 
  selectedType, 
  onTypeSelect, 
  disabled = false 
}: DocumentTypeSelectorProps) {
  const [hoveredType, setHoveredType] = useState<DocumentType | null>(null)

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center">
          <FileText className="w-5 h-5 mr-2" />
          Select Document Type
        </CardTitle>
        <CardDescription>
          Choose the type of Italian business document you want to verify
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {documentTypes.map((docType) => {
            const Icon = docType.icon
            const isSelected = selectedType === docType.id
            const isHovered = hoveredType === docType.id
            
            return (
              <div
                key={docType.id}
                className={cn(
                  "relative p-4 rounded-lg border-2 cursor-pointer transition-all duration-200",
                  docType.color,
                  isSelected && "ring-2 ring-primary ring-offset-2",
                  disabled && "opacity-50 cursor-not-allowed",
                  !disabled && "hover:shadow-md"
                )}
                onClick={() => !disabled && onTypeSelect(docType.id)}
                onMouseEnter={() => !disabled && setHoveredType(docType.id)}
                onMouseLeave={() => setHoveredType(null)}
              >
                {isSelected && (
                  <div className="absolute -top-2 -right-2">
                    <Badge className="bg-primary text-primary-foreground">
                      Selected
                    </Badge>
                  </div>
                )}
                
                <div className="flex items-start space-x-3">
                  <div className={cn(
                    "p-2 rounded-lg",
                    isSelected ? "bg-primary text-primary-foreground" : "bg-white/80"
                  )}>
                    <Icon className="w-6 h-6" />
                  </div>
                  
                  <div className="flex-1 min-w-0">
                    <h3 className="font-semibold text-lg mb-1">{docType.name}</h3>
                    <p className="text-sm text-muted-foreground mb-3 leading-relaxed">
                      {docType.description}
                    </p>
                    
                    {(isHovered || isSelected) && (
                      <div className="space-y-2">
                        <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                          Verified Fields:
                        </p>
                        <div className="flex flex-wrap gap-1">
                          {docType.fields.map((field, index) => (
                            <Badge 
                              key={index} 
                              variant="secondary" 
                              className="text-xs"
                            >
                              {field}
                            </Badge>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )
          })}
        </div>
        
        {selectedType && (
          <div className="mt-6 p-4 bg-muted/50 rounded-lg">
            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium">Selected: {selectedType}</p>
                <p className="text-sm text-muted-foreground">
                  {documentTypes.find(t => t.id === selectedType)?.description}
                </p>
              </div>
              <Button 
                variant="outline" 
                size="sm"
                onClick={() => onTypeSelect(selectedType)}
                disabled={disabled}
              >
                Continue with {selectedType}
              </Button>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
