// Document type schemas and validation utilities adapted from Python implementation

export interface DocumentField {
  value: string | null;
  confidence?: number;
  validated?: boolean;
}

export interface CCIAAFields {
  denominazione_ragione_sociale?: string | null;
  codice_fiscale?: string | null;
  sede_legale?: string | null;
  rea?: string | null;
  data_iscrizione?: string | null;
}

export interface DURCFields {
  denominazione_ragione_sociale?: string | null;
  codice_fiscale?: string | null;
  sede_legale?: string | null;
  scadenza_validita?: string | null;
  risultato?: string | null;
}

export interface ISOFields {
  numero_certificazione?: string | null;
  denominazione_ragione_sociale?: string | null;
  codice_fiscale?: string | null;
  standard?: string | null;
  ente_certificatore?: string | null;
  data_emissione?: string | null;
  data_scadenza?: string | null;
}

export interface SOAFields {
  denominazione_ragione_sociale?: string | null;
  codice_fiscale?: string | null;
  categorie?: string | null;
  ente_attestazione?: string | null;
  data_emissione?: string | null;
  data_scadenza_validita_triennale?: string | null;
  data_scadenza_validita_quinquennale?: string | null;
}

export interface VISURAFields {
  denominazione_ragione_sociale?: string | null;
  codice_fiscale?: string | null;
  partita_iva?: string | null;
  sede_legale?: string | null;
  attivita_esercitata?: string | null;
  stato_attivita?: string | null;
  capitale_sociale_sottoscritto?: string | null;
  data_estratto?: string | null;
}

export type DocumentFields = CCIAAFields | DURCFields | ISOFields | SOAFields | VISURAFields;

export type DocumentType = 'CCIAA' | 'DURC' | 'ISO' | 'SOA' | 'VISURA';

export const DOCUMENT_TYPES: DocumentType[] = ['CCIAA', 'DURC', 'ISO', 'SOA', 'VISURA'];

export const DOCUMENT_TYPE_LABELS: Record<DocumentType, string> = {
  CCIAA: 'Camera di Commercio',
  DURC: 'Documento Unico di Regolarità Contributiva',
  ISO: 'Certificazione ISO',
  SOA: 'Attestazione SOA',
  VISURA: 'Visura Camerale'
};

// Validation utilities adapted from validators.py
export class DocumentValidators {
  private static readonly RE_CF_11 = /\b\d{11}\b/;
  private static readonly RE_CF_16 = /\b[A-Z0-9]{16}\b/i;

  static normalizeCodiceFiscale(value?: string | null): string | null {
    if (!value) return null;
    
    const cleaned = value.replace(/[^A-Z0-9]/gi, '').toUpperCase();
    
    // Prefer 11-digit P.IVA over 16-char CF
    const match11 = cleaned.match(this.RE_CF_11);
    if (match11) return match11[0];
    
    const match16 = cleaned.match(this.RE_CF_16);
    if (match16) return match16[0];
    
    return null;
  }

  static normalizeDateDDMMYYYY(text?: string | null): string | null {
    if (!text) return null;
    
    try {
      // Simple date parsing - could be enhanced with a proper date library
      const dateRegex = /(\d{1,2})[\/\-\.](\d{1,2})[\/\-\.](\d{4})/;
      const match = text.match(dateRegex);
      
      if (match) {
        const [, day, month, year] = match;
        const d = parseInt(day, 10);
        const m = parseInt(month, 10);
        const y = parseInt(year, 10);
        
        if (d >= 1 && d <= 31 && m >= 1 && m <= 12 && y >= 1900 && y <= 2100) {
          return `${d.toString().padStart(2, '0')}/${m.toString().padStart(2, '0')}/${y}`;
        }
      }
      
      return null;
    } catch {
      return null;
    }
  }

  static normalizeAddress(value?: string | null): string | null {
    if (!value) return null;
    
    let normalized = value.trim().replace(/\s+/g, ' ');
    normalized = normalized.replace(/,{2,}/g, ',');
    normalized = normalized.replace(/\s+,/g, ',');
    
    return normalized;
  }

  static isValidCodiceFiscale(value?: string | null): boolean {
    if (!value) return false;
    
    const cleaned = value.trim().toUpperCase();
    return this.RE_CF_11.test(cleaned) || this.RE_CF_16.test(cleaned);
  }

  static normalizeFields(docType: DocumentType, fields: Record<string, any>): DocumentFields {
    const normalized: Record<string, any> = {};
    
    // Apply normalization rules
    if (fields.codice_fiscale) {
      normalized.codice_fiscale = this.normalizeCodiceFiscale(fields.codice_fiscale);
    }
    
    if (fields.partita_iva) {
      normalized.partita_iva = this.normalizeCodiceFiscale(fields.partita_iva);
    }
    
    if (fields.sede_legale) {
      normalized.sede_legale = this.normalizeAddress(fields.sede_legale);
    }
    
    // Normalize date fields
    const dateFields = [
      'data_iscrizione', 'scadenza_validita', 'data_emissione', 
      'data_scadenza', 'data_estratto', 'data_scadenza_validita_triennale',
      'data_scadenza_validita_quinquennale'
    ];
    
    for (const field of dateFields) {
      if (fields[field]) {
        normalized[field] = this.normalizeDateDDMMYYYY(fields[field]);
      }
    }
    
    // Clean up text fields
    if (fields.denominazione_ragione_sociale) {
      normalized.denominazione_ragione_sociale = fields.denominazione_ragione_sociale.trim();
    }
    
    // Copy other fields as-is
    for (const [key, value] of Object.entries(fields)) {
      if (!normalized.hasOwnProperty(key)) {
        normalized[key] = value;
      }
    }
    
    return normalized as DocumentFields;
  }
}

// Document type detection based on content
export class DocumentTypeDetector {
  static detectType(filename: string, certType?: string): DocumentType | null {
    const name = filename.toLowerCase();
    const cert = certType?.toLowerCase() || '';
    
    if (name.includes('durc') || cert.includes('durc')) {
      return 'DURC';
    }
    
    if (name.includes('iso') || cert.includes('iso') || 
        /iso\s*\d{4,5}/.test(name) || /iso\s*\d{4,5}/.test(cert)) {
      return 'ISO';
    }
    
    if (name.includes('soa') || cert.includes('soa')) {
      return 'SOA';
    }
    
    if (name.includes('cciaa') || name.includes('camera') || 
        cert.includes('cciaa') || cert.includes('camera')) {
      return 'CCIAA';
    }
    
    if (name.includes('visura') || cert.includes('visura')) {
      return 'VISURA';
    }
    
    return null;
  }
}

// Field definitions for each document type (for UI generation)
export const DOCUMENT_FIELD_DEFINITIONS: Record<DocumentType, Array<{
  key: string;
  label: string;
  type: 'text' | 'date' | 'textarea';
  required?: boolean;
  description?: string;
}>> = {
  CCIAA: [
    { key: 'denominazione_ragione_sociale', label: 'Denominazione/Ragione Sociale', type: 'text', required: true },
    { key: 'codice_fiscale', label: 'Codice Fiscale/P.IVA', type: 'text', required: true },
    { key: 'sede_legale', label: 'Sede Legale', type: 'textarea' },
    { key: 'rea', label: 'Numero REA', type: 'text' },
    { key: 'data_iscrizione', label: 'Data Iscrizione', type: 'date' }
  ],
  DURC: [
    { key: 'denominazione_ragione_sociale', label: 'Denominazione/Ragione Sociale', type: 'text', required: true },
    { key: 'codice_fiscale', label: 'Codice Fiscale/P.IVA', type: 'text', required: true },
    { key: 'sede_legale', label: 'Sede Legale', type: 'textarea' },
    { key: 'scadenza_validita', label: 'Scadenza Validità', type: 'date', required: true },
    { key: 'risultato', label: 'Risultato', type: 'text' }
  ],
  ISO: [
    { key: 'numero_certificazione', label: 'Numero Certificazione', type: 'text' },
    { key: 'denominazione_ragione_sociale', label: 'Denominazione/Ragione Sociale', type: 'text', required: true },
    { key: 'codice_fiscale', label: 'Codice Fiscale/P.IVA', type: 'text', required: true },
    { key: 'standard', label: 'Standard ISO', type: 'text', required: true },
    { key: 'ente_certificatore', label: 'Ente Certificatore', type: 'text' },
    { key: 'data_emissione', label: 'Data Emissione', type: 'date' },
    { key: 'data_scadenza', label: 'Data Scadenza', type: 'date', required: true }
  ],
  SOA: [
    { key: 'denominazione_ragione_sociale', label: 'Denominazione/Ragione Sociale', type: 'text', required: true },
    { key: 'codice_fiscale', label: 'Codice Fiscale/P.IVA', type: 'text', required: true },
    { key: 'categorie', label: 'Categorie SOA', type: 'text', required: true },
    { key: 'ente_attestazione', label: 'Ente Attestazione', type: 'text' },
    { key: 'data_emissione', label: 'Data Emissione', type: 'date' },
    { key: 'data_scadenza_validita_triennale', label: 'Scadenza Triennale', type: 'date' },
    { key: 'data_scadenza_validita_quinquennale', label: 'Scadenza Quinquennale', type: 'date' }
  ],
  VISURA: [
    { key: 'denominazione_ragione_sociale', label: 'Denominazione/Ragione Sociale', type: 'text', required: true },
    { key: 'codice_fiscale', label: 'Codice Fiscale', type: 'text' },
    { key: 'partita_iva', label: 'Partita IVA', type: 'text', required: true },
    { key: 'sede_legale', label: 'Sede Legale', type: 'textarea' },
    { key: 'attivita_esercitata', label: 'Attività Esercitata', type: 'textarea' },
    { key: 'stato_attivita', label: 'Stato Attività', type: 'text' },
    { key: 'capitale_sociale_sottoscritto', label: 'Capitale Sociale', type: 'text' },
    { key: 'data_estratto', label: 'Data Estratto', type: 'date' }
  ]
};
