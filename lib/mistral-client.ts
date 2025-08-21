// Mistral OCR client adapted for Next.js environment

import { DocumentType, DocumentFields, DocumentValidators } from './document-schemas';
import { SystemSettingsManager } from './system-settings';
import { Mistral } from '@mistralai/mistralai';

interface MistralOCRResponse {
  output_document_annotation?: any;
  document_annotation?: any;
  output_document_annotations?: any;
  document_annotations?: any;
  output_structured?: any;
  [key: string]: any;
}

interface DocumentAnalysisResult {
  fields: DocumentFields;
  confidence?: number;
  source: 'mistral';
  meta: {
    doc_type: DocumentType;
    model: string;
    pages_processed?: number[];
  };
}

export class MistralDocumentClient {
  private apiKey: string | null = null;
  private client: Mistral | null = null;

  constructor(apiKey?: string) {
    this.apiKey = apiKey || null;
  }

  private async getApiKey(): Promise<string> {
    if (this.apiKey) return this.apiKey;

    // Try to get from system settings first
    const dbKey = await SystemSettingsManager.getMistralApiKey();
    if (dbKey) {
    this.apiKey = dbKey;
    return dbKey;
    }

    throw new Error('Mistral API key not found in system settings. Please add it to the system_settings table.');
  }

  private async getClient(): Promise<Mistral> {
    if (this.client) return this.client;
    const apiKey = await this.getApiKey();
    this.client = new Mistral({ apiKey });
    return this.client;
  }

  /**
   * Extract structured data from document using Mistral OCR
   */
  async extractFromDocument(
    docType: DocumentType,
    documentData: Buffer,
    filename: string,
    pages?: number[]
  ): Promise<DocumentAnalysisResult> {
    try {
    // Convert buffer to base64 data URL
    const mimeType = this.getMimeType(filename);
    const base64Data = documentData.toString('base64');
    const dataUrl = `data:${mimeType};base64,${base64Data}`;

    // Normalize docType and get schema for document type
    const normalizedDocType = (docType as string).toUpperCase() as DocumentType;
    const schema = this.getSchemaForDocType(normalizedDocType);
    if (!schema) {
      console.warn(`MistralDocumentClient: no schema found for docType=${normalizedDocType}, falling back to text mode.`);
    }

    // Default to first 2 pages for better performance and accuracy
    const effectivePages = pages || [0, 1];

    const response = await this.callMistralOCR(dataUrl, schema, effectivePages.slice(0, 8), filename);

    // Extract structured data from response
    const extractedData = this.extractAnnotationDict(response, normalizedDocType);

    // Normalize fields
    const normalizedFields = DocumentValidators.normalizeFields(normalizedDocType, extractedData);

    // If all fields are empty, retry with different pages
    if (this.areAllFieldsEmpty(normalizedFields) && pages === undefined) {
    try {
    const retryResponse = await this.callMistralOCR(dataUrl, schema, [0, 1, 2, 3].slice(0, 8), filename);
    const retryData = this.extractAnnotationDict(retryResponse, normalizedDocType);
    const retryFields = DocumentValidators.normalizeFields(normalizedDocType, retryData);

    if (!this.areAllFieldsEmpty(retryFields)) {
    return {
    fields: retryFields,
    source: 'mistral',
    meta: {
    doc_type: normalizedDocType,
    model: 'mistral-ocr-latest',
    pages_processed: [0, 1, 2, 3]
    }
    };
    }
    } catch (retryError) {
    console.warn('Retry extraction failed:', retryError);
    }
    }

    return {
    fields: normalizedFields,
    source: 'mistral',
    meta: {
    doc_type: normalizedDocType,
    model: 'mistral-ocr-latest',
    pages_processed: effectivePages
    }
    };

    } catch (error) {
    console.error('Mistral OCR extraction failed:', error);
    throw new Error(`Document analysis failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  private async callMistralOCR(
    documentUrl: string,
    schema: any,
    pages: number[],
    filename?: string
  ): Promise<MistralOCRResponse> {
    const client = await this.getClient();
    
    // Determine document type based on MIME type
    const mimeType = filename ? this.getMimeType(filename) : 'application/pdf';
    const isImage = mimeType.startsWith('image/');
    
    // Use correct discriminated union format based on Mistral docs
    const document = isImage 
      ? { type: "image_url" as const, imageUrl: documentUrl }
      : { type: "document_url" as const, documentUrl: documentUrl };
    
    // Retry configuration for API errors
    const maxRetries = 3;
    const baseDelay = 2000; // 2 seconds
    
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        // Use the official SDK to process OCR requests
        const resp = await client.ocr.process({
          model: 'mistral-ocr-latest',
          pages,
          document,
          // Pass schema for annotation format if provided
          documentAnnotationFormat: schema
          ? {
            type: 'json_schema',
            jsonSchema: {
              name: 'DocumentFields',
              schemaDefinition: schema as any,
            },
          }
          : { type: 'text' },
          includeImageBase64: false,
        } as any);

        // SDK returns a typed object; return as a plain object to satisfy current types
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        return resp as unknown as MistralOCRResponse;
        
      } catch (error: any) {
        const isRetryableError = (
          error?.statusCode === 503 || 
          error?.status === 503 ||
          (error?.message && error.message.includes('Service unavailable')) ||
          (error?.message && error.message.includes('503'))
        );
        
        if (isRetryableError && attempt < maxRetries) {
          const delay = baseDelay * Math.pow(2, attempt - 1); // Exponential backoff
          console.warn(`Mistral API attempt ${attempt} failed with 503 error, retrying in ${delay}ms...`);
          await new Promise(resolve => setTimeout(resolve, delay));
          continue;
        }
        
        // If not retryable or max retries reached, throw the error
        throw error;
      }
    }
    
    // This should never be reached, but TypeScript requires it
    throw new Error('Max retries exceeded');
  }

  private extractAnnotationDict(response: MistralOCRResponse, docType: DocumentType): Record<string, any> {
    // Try different response attributes that might contain the structured data
    const attributes = [
    'output_document_annotation',
    'document_annotation',
    'output_document_annotations',
    'document_annotations',
    'output_structured'
    ];

    for (const attr of attributes) {
    const data = response[attr];
    if (data && typeof data === 'object') {
    return data;
    }
    if (typeof data === 'string') {
    try {
    const parsed = JSON.parse(data);
    if (typeof parsed === 'object') {
    return parsed;
    }
    } catch {
    // Continue to next attribute
    }
    }
    }

    // Fallback: search for best matching object in the response
    const schemaFields = this.getSchemaFields(docType);
    return this.findBestMatchingDict(response, schemaFields);
  }

  private findBestMatchingDict(obj: any, schemaFields: Set<string>): Record<string, any> {
    let best: Record<string, any> = {};
    let bestScore = -1;

    const visit = (current: any) => {
    if (current && typeof current === 'object' && !Array.isArray(current)) {
    const score = Object.keys(current).filter(key => schemaFields.has(key)).length;
    if (score > bestScore) {
    best = current;
    bestScore = score;
    }

    Object.values(current).forEach(visit);
    } else if (Array.isArray(current)) {
    current.forEach(visit);
    }
    };

    visit(obj);
    return best;
  }

  private areAllFieldsEmpty(fields: DocumentFields): boolean {
    return Object.values(fields).every(value =>
    value === null || value === undefined || (typeof value === 'string' && value.trim() === '')
    );
  }

  private getMimeType(filename: string): string {
    const ext = filename.toLowerCase().split('.').pop();
    switch (ext) {
    case 'pdf': return 'application/pdf';
    case 'jpg':
    case 'jpeg': return 'image/jpeg';
    case 'png': return 'image/png';
    case 'tiff':
    case 'tif': return 'image/tiff';
    default: return 'application/octet-stream';
    }
  }

  private getSchemaForDocType(docType: DocumentType): any {
    // Simplified schema definitions for Mistral API
    const schemas = {
    CCIAA: {
    type: "object",
    properties: {
    denominazione_ragione_sociale: {
    type: "string",
    description: "Denominazione/Ragione sociale dell'azienda esattamente come riportata in visura"
    },
    codice_fiscale: {
    type: "string",
    description: "Codice fiscale o Partita IVA dell'azienda (11 cifre P.IVA preferita, altrimenti CF 16 caratteri)"
    },
    sede_legale: {
    type: "string",
    description: "Indirizzo completo della sede legale su una sola riga"
    },
    rea: {
    type: "string",
    description: "Numero REA (Registro Economico Amministrativo)"
    },
    data_iscrizione: {
    type: "string",
    description: "Data di iscrizione al registro imprese in formato dd/mm/YYYY"
    }
    }
    },
    DURC: {
    type: "object",
    properties: {
    denominazione_ragione_sociale: { type: "string", description: "Denominazione/Ragione sociale come riportata nel DURC" },
    codice_fiscale: { type: "string", description: "P.IVA (11 cifre) o CF (16 alfanumerico), senza spazi/punteggiatura" },
    sede_legale: { type: "string", description: "Indirizzo completo della sede legale su una riga" },
    scadenza_validita: { type: "string", description: "Data di scadenza della validità del DURC, formato dd/mm/YYYY" },
    risultato: { type: "string", description: "Risultato del DURC (es. 'RISULTA REGOLARE' o 'RISULTA IRREGOLARE')" }
    }
    },
    ISO: {
    type: "object",
    properties: {
    numero_certificazione: { type: "string", description: "Numero certificazione così come riportato sul certificato" },
    denominazione_ragione_sociale: { type: "string", description: "Ragione sociale esatta come in certificato" },
    codice_fiscale: { type: "string", description: "P.IVA (11 cifre) o CF (16 alfanumerico), senza spazi/punteggiatura" },
    standard: { type: "string", description: "Standard ISO (es. 'ISO 9001:2015')" },
    ente_certificatore: { type: "string", description: "Ente certificatore (es. DNV, TÜV, RINA, ecc.)" },
    data_emissione: { type: "string", description: "Data di emissione in formato dd/mm/YYYY" },
    data_scadenza: { type: "string", description: "Data di scadenza in formato dd/mm/YYYY" }
    }
    },
    SOA: {
    type: "object",
    properties: {
    denominazione_ragione_sociale: { type: "string", description: "Ragione sociale come in attestazione SOA" },
    codice_fiscale: { type: "string", description: "P.IVA (11 cifre) o CF (16 alfanumerico), senza spazi/punteggiatura" },
    categorie: { type: "string", description: "Categorie SOA (es. OG1 III, OS30 II), elencate in stringa" },
    ente_attestazione: { type: "string", description: "Organismo/ente che rilascia l'attestazione" },
    data_emissione: { type: "string", description: "Data emissione in formato dd/mm/YYYY" },
    data_scadenza_validita_triennale: { type: "string", description: "Data scadenza validità triennale in formato dd/mm/YYYY" },
    data_scadenza_validita_quinquennale: { type: "string", description: "Data scadenza validità quinquennale in formato dd/mm/YYYY" }
    }
    },
    VISURA: {
    type: "object",
    properties: {
    denominazione_ragione_sociale: { type: "string", description: "Ragione sociale esatta" },
    codice_fiscale: { type: "string", description: "Codice fiscale (16 caratteri alfanumerici)" },
    partita_iva: { type: "string", description: "Partita IVA (11 cifre)" },
    sede_legale: { type: "string", description: "Indirizzo completo sede legale su una riga" },
    attivita_esercitata: { type: "string", description: "Descrizione attività prevalente esercitata" },
    stato_attivita: { type: "string", description: "Stato attività come riportato" },
    capitale_sociale_sottoscritto: { type: "string", description: "Capitale sociale sottoscritto come riportato" },
    data_estratto: { type: "string", description: "Data estratto come riportato" }
    }
    }
    };

    return schemas[docType];
  }

  private getSchemaFields(docType: DocumentType): Set<string> {
    const schema = this.getSchemaForDocType(docType);
    return new Set(Object.keys(schema.properties || {}));
  }
}