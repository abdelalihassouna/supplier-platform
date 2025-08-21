// Simple test script to verify the API endpoints
const testVerification = async () => {
  try {
    // Test POST request with a sample analysis ID and document type
    const response = await fetch('http://localhost:3000/api/documents/verify', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        analysisId: '25d8e033-ed0a-4d62-8517-73aa850682c8',
        docType: 'SOA',
        forceRerun: true
      })
    });

    const result = await response.json();
    console.log('POST Response:', response.status, result);

    // Test GET request
    const getResponse = await fetch('http://localhost:3000/api/documents/verify?analysisId=25d8e033-ed0a-4d62-8517-73aa850682c8&docType=SOA&forceRerun=true');
    const getResult = await getResponse.json();
    console.log('GET Response:', getResponse.status, getResult);

  } catch (error) {
    console.error('Test failed:', error);
  }
};

// Run if called directly
if (typeof window === 'undefined') {
  testVerification();
}
