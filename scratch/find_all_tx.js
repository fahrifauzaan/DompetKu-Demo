const url = 'https://script.google.com/macros/s/AKfycbzhD4TrmhBhb1484U7thVyEJDvZAFYtAbiG0bRK_jcWCiLKwy1EtBFCOQKikaj9l6yL2Q/exec?sheet=Transactions';

fetch(url)
  .then(res => res.json())
  .then(data => {
    if (data.success) {
      console.log('Searching for transactions on 2024-05-10 or containing investment info:');
      const results = data.data.Transactions.filter(t => {
        return (t.date && t.date.startsWith('2024-05-10')) || 
               (t.account && t.account.includes('RDI')) ||
               (t.desc && (t.desc.includes('BUMI') || t.desc.includes('BRMS') || t.desc.includes('Schroder')));
      });
      console.log(`Found ${results.length} matches:`);
      results.forEach((t, i) => {
        console.log(`[${i+1}] Date: ${t.date} | Desc: ${t.desc} | Cat: ${t.category} | Amt: ${t.amount} | Acc: ${t.account}`);
      });
    }
  })
  .catch(err => console.error(err));
