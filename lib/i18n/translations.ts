/**
 * Translation definitions for supplier platform
 * Contains all text strings in English and Italian
 */

import { TranslationKey } from './index';

// Supplier Profile Validation translations
export const supplierProfileTranslations = {
  // Main titles and descriptions
  profileComplianceValidation: {
    en: 'Profile Compliance Validation',
    it: 'Validazione Conformità Profilo'
  } as TranslationKey,
  
  profileValidationDescription: {
    en: 'Validation of supplier profile answers against business requirements',
    it: 'Validazione delle risposte del profilo fornitore rispetto ai requisiti aziendali'
  } as TranslationKey,

  // Compliance metrics
  complianceScore: {
    en: 'Compliance Score',
    it: 'Punteggio di Conformità'
  } as TranslationKey,

  validFields: {
    en: 'Valid Fields',
    it: 'Campi Validi'
  } as TranslationKey,

  invalidFields: {
    en: 'Invalid Fields',
    it: 'Campi Non Validi'
  } as TranslationKey,

  missingFields: {
    en: 'Missing Fields',
    it: 'Campi Mancanti'
  } as TranslationKey,

  profileCompletion: {
    en: 'Profile Completion',
    it: 'Completamento Profilo'
  } as TranslationKey,

  fields: {
    en: 'fields',
    it: 'campi'
  } as TranslationKey,

  // Status badges
  profileCompliant: {
    en: 'Profile Compliant',
    it: 'Profilo Conforme'
  } as TranslationKey,

  profileNonCompliant: {
    en: 'Profile Non-Compliant',
    it: 'Profilo Non Conforme'
  } as TranslationKey,

  // Field validation details
  fieldValidationDetails: {
    en: 'Field Validation Details',
    it: 'Dettagli Validazione Campi'
  } as TranslationKey,

  current: {
    en: 'Current',
    it: 'Attuale'
  } as TranslationKey,

  expected: {
    en: 'Expected',
    it: 'Previsto'
  } as TranslationKey,

  valid: {
    en: 'Valid',
    it: 'Valido'
  } as TranslationKey,

  invalid: {
    en: 'Invalid',
    it: 'Non Valido'
  } as TranslationKey,

  missing: {
    en: 'Missing',
    it: 'Mancante'
  } as TranslationKey,

  lastValidated: {
    en: 'Last validated',
    it: 'Ultima validazione'
  } as TranslationKey,

  // Loading and error states
  loadingProfileValidation: {
    en: 'Loading profile validation...',
    it: 'Caricamento validazione profilo...'
  } as TranslationKey,

  failedToLoadProfileValidation: {
    en: 'Failed to load profile validation',
    it: 'Impossibile caricare la validazione del profilo'
  } as TranslationKey,

  retry: {
    en: 'Retry',
    it: 'Riprova'
  } as TranslationKey,

  noValidationDataAvailable: {
    en: 'No validation data available',
    it: 'Nessun dato di validazione disponibile'
  } as TranslationKey,

  noComplianceAlerts: {
    en: 'No compliance alerts',
    it: 'Nessun avviso di conformità'
  } as TranslationKey,

  allDocumentsInGoodStanding: {
    en: 'All documents are in good standing',
    it: 'Tutti i documenti sono in regola'
  } as TranslationKey,

  // Field display names
  fieldNames: {
    Q0_INFORMAZIONI: {
      en: 'Information Declaration',
      it: 'Dichiarazione Informazioni'
    } as TranslationKey,
    GRUPPO_IVA: {
      en: 'VAT Group Status',
      it: 'Stato Gruppo IVA'
    } as TranslationKey,
    Q1_LEGALE_RAPPRESENTANTE: {
      en: 'Legal Representative',
      it: 'Rappresentante Legale'
    } as TranslationKey,
    Q1_DIMENSIONE_SOCIETARIA: {
      en: 'Company Size',
      it: 'Dimensione Societaria'
    } as TranslationKey,
    Q1_CAPITALE_SOCIALE: {
      en: 'Share Capital',
      it: 'Capitale Sociale'
    } as TranslationKey,
    Q1_CCIAA: {
      en: 'Chamber of Commerce Registration',
      it: 'Iscrizione Camera di Commercio'
    } as TranslationKey,
    Q1_PATENTE_CREDITI: {
      en: 'Credit License',
      it: 'Patente a Crediti'
    } as TranslationKey,
    Q1_CCIAA_ALLEGATO: {
      en: 'CCIAA Attachment',
      it: 'Allegato CCIAA'
    } as TranslationKey,
    Q1_CONDANNE: {
      en: 'Criminal Convictions',
      it: 'Condanne Penali'
    } as TranslationKey,
    Q1_CODICE_ETICO: {
      en: 'Ethical Code',
      it: 'Codice Etico'
    } as TranslationKey,
    Q1_LEGAMI_PARENTELA: {
      en: 'Family Relationships',
      it: 'Legami di Parentela'
    } as TranslationKey,
    Q1_EMBARGO_UE: {
      en: 'EU Embargo Activities',
      it: 'Attività Embargo UE'
    } as TranslationKey,
    Q1_PROCEDIMENTI_PENALI: {
      en: 'Criminal Proceedings',
      it: 'Procedimenti Penali'
    } as TranslationKey,
    Q1_PUBBLICA_AMMINISTRAZIONE: {
      en: 'Public Administration Prohibition',
      it: 'Divieto Pubblica Amministrazione'
    } as TranslationKey
  },

  // Validation messages
  validationMessages: {
    matchesRequiredValue: {
      en: 'Matches required value',
      it: 'Corrisponde al valore richiesto'
    } as TranslationKey,
    fieldProperlyFilled: {
      en: 'Field is properly filled',
      it: 'Campo compilato correttamente'
    } as TranslationKey,
    fieldMissingOrEmpty: {
      en: 'Field is missing or empty',
      it: 'Campo mancante o vuoto'
    } as TranslationKey,
    noProfileDataAvailable: {
      en: 'No profile data available - supplier has not filled the deBasic questionnaire',
      it: 'Nessun dato profilo disponibile - il fornitore non ha compilato il questionario deBasic'
    } as TranslationKey,
    expectedGot: {
      en: 'Expected: "{expected}", Got: "{current}"',
      it: 'Previsto: "{expected}", Ricevuto: "{current}"'
    } as TranslationKey
  }
};

// General UI translations
export const uiTranslations = {
  // Common actions
  refresh: {
    en: 'Refresh',
    it: 'Aggiorna'
  } as TranslationKey,

  loading: {
    en: 'Loading...',
    it: 'Caricamento...'
  } as TranslationKey,

  error: {
    en: 'Error',
    it: 'Errore'
  } as TranslationKey,

  success: {
    en: 'Success',
    it: 'Successo'
  } as TranslationKey,

  // Language switcher
  language: {
    en: 'Language',
    it: 'Lingua'
  } as TranslationKey,

  english: {
    en: 'English',
    it: 'Inglese'
  } as TranslationKey,

  italian: {
    en: 'Italian',
    it: 'Italiano'
  } as TranslationKey,

  // Supplier detail view
  supplierProfile: {
    en: 'Supplier Profile',
    it: 'Profilo Fornitore'
  } as TranslationKey,

  companyInformation: {
    en: 'Company Information',
    it: 'Informazioni Azienda'
  } as TranslationKey,

  contactInformation: {
    en: 'Contact Information',
    it: 'Informazioni Contatto'
  } as TranslationKey,

  // Tabs
  overview: {
    en: 'Overview',
    it: 'Panoramica'
  } as TranslationKey,

  profile: {
    en: 'Profile',
    it: 'Profilo'
  } as TranslationKey,

  documents: {
    en: 'Documents',
    it: 'Documenti'
  } as TranslationKey,

  scorecard: {
    en: 'Scorecard',
    it: 'Scorecard'
  } as TranslationKey,

  timeline: {
    en: 'Timeline',
    it: 'Timeline'
  } as TranslationKey
};
