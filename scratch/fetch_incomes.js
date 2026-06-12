async function testFetch() {
  const url = 'https://script.google.com/macros/s/AKfycbzhD4TrmhBhb1484U7thVyEJDvZAFYtAbiG0bRK_jcWCiLKwy1EtBFCOQKikaj9l6yL2Q/exec?sheet=all';
  console.log('Fetching from URL:', url);
  try {
    const response = await fetch(url);
    const result = await response.json();
    console.log('Success:', result.success);
    
    if (result.success && result.data) {
      if (result.data.BudgetCategories) {
        console.log('\nAll Budget Categories Rows:');
        result.data.BudgetCategories.forEach(c => {
          if (c.type === 'Pemasukan' || c.name.includes('Income') || c.name.includes('Salary')) {
            console.log(`- ${c.name}: ${c.allocated} (type: ${c.type})`);
          }
        });
      }
    }
  } catch (e) {
    console.error('Error fetching:', e);
  }
}

testFetch();
