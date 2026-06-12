async function testFetch() {
  const url = 'https://script.google.com/macros/s/AKfycbzhD4TrmhBhb1484U7thVyEJDvZAFYtAbiG0bRK_jcWCiLKwy1EtBFCOQKikaj9l6yL2Q/exec?sheet=all';
  console.log('Fetching from URL:', url);
  try {
    const response = await fetch(url);
    const result = await response.json();
    console.log('Success:', result.success);
    
    if (result.success && result.data) {
      console.log('Available sheets:', Object.keys(result.data));
      
      if (result.data.Settings) {
        console.log('\nSettings Rows:');
        console.log(JSON.stringify(result.data.Settings, null, 2));
      }
      
      if (result.data.BudgetCategories) {
        console.log('\nBudget Categories Rows:');
        console.log(JSON.stringify(result.data.BudgetCategories.slice(0, 5), null, 2));
      }
    }
  } catch (e) {
    console.error('Error fetching:', e);
  }
}

testFetch();
