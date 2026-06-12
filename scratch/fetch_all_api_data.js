const url = 'https://script.google.com/macros/s/AKfycbzhD4TrmhBhb1484U7thVyEJDvZAFYtAbiG0bRK_jcWCiLKwy1EtBFCOQKikaj9l6yL2Q/exec?sheet=all';

fetch(url)
  .then(res => res.json())
  .then(data => {
    console.log('API Status:', data.success);
    if (data.success) {
      console.log('Keys in data:', Object.keys(data.data));
      for (const key of Object.keys(data.data)) {
        console.log(`- ${key}: ${data.data[key].length} rows`);
        if (data.data[key].length > 0) {
          console.log(`  Sample 1st row:`, JSON.stringify(data.data[key][0], null, 2));
        }
      }
    }
  })
  .catch(err => console.error(err));
