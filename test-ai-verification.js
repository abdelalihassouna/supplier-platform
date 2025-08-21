const { AIVerificationService } = require('./lib/ai-verification-service.ts')

// Test the AI field matching with the problematic data
async function testAIFieldMatch() {
  const service = new AIVerificationService()
  
  console.log('Testing AI field matching with sample data...\n')
  
  // Test company name matching
  const companyResult = await service.aiFieldMatch(
    'denominazione_ragione_sociale',
    'CAPITAL FERRO SPA',
    'CAPITAL FERRO S.P.A.',
    { company_name: 'CAPITAL FERRO S.P.A.' }
  )
  console.log('Company name result:', companyResult)
  
  // Test address matching  
  const addressResult = await service.aiFieldMatch(
    'sede_legale',
    'S S ROMEA 157/A CHIOGGIA VE 30015',
    'STS ROMEA 157/A, VALLI DI CHIOGGIA, Venezia',
    { 
      address: 'STS ROMEA 157/A',
      city: 'VALLI DI CHIOGGIA', 
      province: 'Venezia'
    }
  )
  console.log('Address result:', addressResult)
  
  // Test fiscal code matching (should be exact)
  const fiscalResult = await service.aiFieldMatch(
    'codice_fiscale',
    '02672590276',
    '02672590276',
    { fiscal_code: '02672590276' }
  )
  console.log('Fiscal code result:', fiscalResult)
}

testAIFieldMatch().catch(console.error)
