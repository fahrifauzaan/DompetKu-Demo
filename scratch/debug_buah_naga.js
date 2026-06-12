const url = 'https://script.google.com/macros/s/AKfycbzhD4TrmhBhb1484U7thVyEJDvZAFYtAbiG0bRK_jcWCiLKwy1EtBFCOQKikaj9l6yL2Q/exec?sheet=Transactions';

fetch(url)
  .then(res => res.json())
  .then(data => {
    if (data.success) {
      console.log(`Total transactions in sheet: ${data.data.Transactions.length}`);
      const years = {};
      data.data.Transactions.forEach(t => {
        const year = t.date ? t.date.split('-')[0] : 'no-date';
        years[year] = (years[year] || 0) + 1;
      });
      console.log('Unique years in sheet:', years);
      console.log('Sample transactions (first 10):');
      data.data.Transactions.slice(0, 10).forEach(t => {
        console.log(`ID: ${t.id} | Date: "${t.date}" | Desc: "${t.desc}"`);
      });
    }
  })
  .catch(err => console.error(err));

