// Test script to verify DURC document with proper field extraction
const testDURCVerification = async () => {
  try {
    console.log('Testing DURC verification with analysis ID: ed46a9fd-4791-472a-87e3-1cb8651a7874');
    
    // Start verification
    const response = await fetch('http://localhost:3000/api/documents/verify', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        analysisId: 'ed46a9fd-4791-472a-87e3-1cb8651a7874'
      })
    });

    const result = await response.json();
    console.log('Verification Response:', response.status);
    console.log('Result:', JSON.stringify(result, null, 2));

    if (result.data?.field_comparisons) {
      console.log('\n=== Field Comparisons ===');
      result.data.field_comparisons.forEach(field => {
        console.log(`${field.field_name}: ${field.status} (score: ${field.match_score})`);
        if (field.ocr_value) console.log(`  OCR: ${field.ocr_value}`);
        if (field.api_value) console.log(`  DB:  ${field.api_value}`);
      });
    }

  } catch (error) {
    console.error('Test failed:', error);
  }
};

// Run the test
testDURCVerification();
