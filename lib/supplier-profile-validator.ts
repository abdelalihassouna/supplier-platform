/**
 * Supplier Profile Validation Service
 * Validates deBasic answers against specific business requirements
 */

export interface ValidationRule {
  field: string;
  type: 'exact_match' | 'not_empty' | 'boolean_check';
  expectedValue?: string;
  description: string;
  required: boolean;
}

export interface ValidationResult {
  field: string;
  isValid: boolean;
  currentValue: any;
  expectedValue?: string;
  message: string;
  type: 'exact_match' | 'not_empty' | 'boolean_check';
}

export interface ProfileValidationSummary {
  isCompliant: boolean;
  totalFields: number;
  validFields: number;
  invalidFields: number;
  missingFields: number;
  complianceScore: number;
  results: ValidationResult[];
}

// Validation rules based on your requirements
export const SUPPLIER_PROFILE_VALIDATION_RULES: ValidationRule[] = [
  {
    field: 'Q0_INFORMAZIONI',
    type: 'exact_match',
    expectedValue: 'Si, dichiaro che le informazioni fornite sono complete e veritiere',
    description: 'Information declaration must be complete and truthful',
    required: true
  },
  {
    field: 'GRUPPO_IVA',
    type: 'exact_match',
    expectedValue: 'No, non fa parte di Gruppo IVA',
    description: 'Must not be part of VAT group',
    required: true
  },
  {
    field: 'Q1_LEGALE_RAPPRESENTANTE',
    type: 'not_empty',
    description: 'Legal representative must be specified',
    required: true
  },
  {
    field: 'Q1_DIMENSIONE_SOCIETARIA',
    type: 'not_empty',
    description: 'Company size must be specified',
    required: true
  },
  {
    field: 'Q1_CAPITALE_SOCIALE',
    type: 'not_empty',
    description: 'Share capital must be specified',
    required: true
  },
  {
    field: 'Q1_CCIAA',
    type: 'exact_match',
    expectedValue: 'Si, è iscritta/dichiarazione sostitutiva',
    description: 'Must be registered with Chamber of Commerce',
    required: true
  },
  {
    field: 'Q1_PATENTE_CREDITI',
    type: 'exact_match',
    expectedValue: 'No',
    description: 'Credit license must be No',
    required: true
  },
  {
    field: 'Q1_CCIAA_ALLEGATO',
    type: 'not_empty',
    description: 'CCIAA attachment must be provided',
    required: true
  },
  {
    field: 'Q1_CONDANNE',
    type: 'exact_match',
    expectedValue: 'No, non sono stati condannati con sentenza definitiva',
    description: 'No final convictions allowed',
    required: true
  },
  {
    field: 'Q1_CODICE_ETICO',
    type: 'exact_match',
    expectedValue: 'Si, adotta un codice etico',
    description: 'Must adopt ethical code',
    required: true
  },
  {
    field: 'Q1_LEGAMI_PARENTELA',
    type: 'exact_match',
    expectedValue: 'No, non esistono legami',
    description: 'No family relationships allowed',
    required: true
  },
  {
    field: 'Q1_EMBARGO_UE',
    type: 'exact_match',
    expectedValue: 'No, non ha attività',
    description: 'No EU embargo activities',
    required: true
  },
  {
    field: 'Q1_PROCEDIMENTI_PENALI',
    type: 'exact_match',
    expectedValue: 'No, non sono coinvolti',
    description: 'No criminal proceedings involvement',
    required: true
  },
  {
    field: 'Q1_PUBBLICA_AMMINISTRAZIONE',
    type: 'exact_match',
    expectedValue: 'No, non ha il divieto con la PA',
    description: 'No prohibition with Public Administration',
    required: true
  }
];

export class SupplierProfileValidator {
  
  /**
   * Validates supplier profile answers against business rules
   */
  static validateProfile(debasicAnswers: Record<string, any> | null): ProfileValidationSummary {
    // Handle null, undefined, or empty object responses
    if (!debasicAnswers || Object.keys(debasicAnswers).length === 0) {
      return {
        isCompliant: false,
        totalFields: SUPPLIER_PROFILE_VALIDATION_RULES.length,
        validFields: 0,
        invalidFields: 0,
        missingFields: SUPPLIER_PROFILE_VALIDATION_RULES.length,
        complianceScore: 0,
        results: SUPPLIER_PROFILE_VALIDATION_RULES.map(rule => ({
          field: rule.field,
          isValid: false,
          currentValue: null,
          expectedValue: rule.expectedValue,
          message: 'No profile data available - supplier has not filled the deBasic questionnaire',
          type: rule.type
        }))
      };
    }

    const results: ValidationResult[] = [];
    let validFields = 0;
    let invalidFields = 0;
    let missingFields = 0;

    for (const rule of SUPPLIER_PROFILE_VALIDATION_RULES) {
      const currentValue = debasicAnswers[rule.field];
      const result = this.validateField(rule, currentValue);
      
      results.push(result);
      
      if (result.isValid) {
        validFields++;
      } else if (currentValue === undefined || currentValue === null || currentValue === '') {
        missingFields++;
      } else {
        invalidFields++;
      }
    }

    const totalFields = SUPPLIER_PROFILE_VALIDATION_RULES.length;
    const complianceScore = Math.round((validFields / totalFields) * 100);
    const isCompliant = complianceScore >= 100; // All fields must be valid for compliance

    return {
      isCompliant,
      totalFields,
      validFields,
      invalidFields,
      missingFields,
      complianceScore,
      results
    };
  }

  /**
   * Validates a single field against its rule
   */
  private static validateField(rule: ValidationRule, currentValue: any): ValidationResult {
    let isValid = false;
    let message = '';

    // Handle missing values
    if (currentValue === undefined || currentValue === null || currentValue === '') {
      return {
        field: rule.field,
        isValid: false,
        currentValue,
        expectedValue: rule.expectedValue,
        message: 'Field is missing or empty',
        type: rule.type
      };
    }

    // Extract simple value from complex nested structures
    const extractedValue = this.extractSimpleValue(currentValue);
    const stringValue = String(extractedValue).trim();

    switch (rule.type) {
      case 'exact_match':
        isValid = stringValue === rule.expectedValue;
        message = isValid 
          ? 'Matches required value' 
          : `Expected: "${rule.expectedValue}", Got: "${stringValue}"`;
        break;

      case 'not_empty':
        isValid = stringValue.length > 0;
        message = isValid 
          ? 'Field is properly filled' 
          : 'Field is empty or contains only whitespace';
        break;

      case 'boolean_check':
        // For future boolean validations if needed
        isValid = Boolean(currentValue);
        message = isValid ? 'Boolean check passed' : 'Boolean check failed';
        break;

      default:
        isValid = false;
        message = 'Unknown validation type';
    }

    return {
      field: rule.field,
      isValid,
      currentValue: stringValue,
      expectedValue: rule.expectedValue,
      message,
      type: rule.type
    };
  }

  /**
   * Extracts simple string value from complex nested answer structures
   */
  private static extractSimpleValue(value: any): any {
    // Handle simple string/number values
    if (typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean') {
      return value;
    }

    // Handle arrays - join with commas or take first element
    if (Array.isArray(value)) {
      if (value.length === 0) return '';
      if (value.length === 1) return String(value[0]);
      return value.join(', ');
    }

    // Handle complex objects (like Q1_ALLEGATO_ISO_*_FULL)
    if (typeof value === 'object' && value !== null) {
      // Check for nested values array (attachment structure)
      if (value.values && Array.isArray(value.values) && value.values.length > 0) {
        return value.values[0].value || value.values[0].id || 'Attachment present';
      }
      
      // Check for direct value property
      if (value.value !== undefined) {
        return value.value;
      }
      
      // Check for label property
      if (value.label !== undefined) {
        return value.label;
      }
      
      // For other objects, return a summary
      return 'Complex data structure present';
    }

    return value;
  }

  /**
   * Get validation status for a specific field
   */
  static getFieldValidation(debasicAnswers: Record<string, any> | null, fieldName: string): ValidationResult | null {
    const rule = SUPPLIER_PROFILE_VALIDATION_RULES.find(r => r.field === fieldName);
    if (!rule) return null;

    // Handle empty or null answers
    if (!debasicAnswers || Object.keys(debasicAnswers).length === 0) {
      return {
        field: rule.field,
        isValid: false,
        currentValue: null,
        expectedValue: rule.expectedValue,
        message: 'No profile data available',
        type: rule.type
      };
    }

    const currentValue = debasicAnswers[fieldName];
    return this.validateField(rule, currentValue);
  }

  /**
   * Get summary statistics for validation results
   */
  static getValidationStats(results: ValidationResult[]) {
    const stats = {
      total: results.length,
      valid: results.filter(r => r.isValid).length,
      invalid: results.filter(r => !r.isValid && r.currentValue !== null && r.currentValue !== '').length,
      missing: results.filter(r => !r.isValid && (r.currentValue === null || r.currentValue === '')).length
    };

    return {
      ...stats,
      validPercentage: Math.round((stats.valid / stats.total) * 100),
      invalidPercentage: Math.round((stats.invalid / stats.total) * 100),
      missingPercentage: Math.round((stats.missing / stats.total) * 100)
    };
  }
}
