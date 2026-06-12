const url = 'https://script.google.com/macros/s/AKfycbzhD4TrmhBhb1484U7thVyEJDvZAFYtAbiG0bRK_jcWCiLKwy1EtBFCOQKikaj9l6yL2Q/exec?sheet=Transactions';

fetch(url)
  .then(res => res.json())
  .then(data => {
    if (data.success) {
      console.log('Total transactions:', data.data.Transactions.length);
      const filtered = data.data.Transactions.filter(t => {
        const desc = (t.desc || '').toLowerCase();
        const cat = (t.category || '').toLowerCase();
        const loc = (t.location || '').toLowerCase();
        return desc.includes('saham') || desc.includes('dividen') || desc.includes('bumi') || desc.includes('brms') || desc.includes('schroder') || desc.includes('investasi') ||
               cat.includes('investasi') || cat.includes('dividen') ||
               loc.includes('ajaib') || loc.includes('bibit');
      });
      console.log(`Found ${filtered.length} relevant transactions:`);
      filtered.forEach((t, i) => {
        console.log(`[${i+1}] Date: ${t.date} | Desc: ${t.desc} | Cat: ${t.category} | Amount: ${t.amount} | Acc: ${t.account} | Type: ${t.type}`);
      });
    }
  })
  .catch(err => console.error(err));
