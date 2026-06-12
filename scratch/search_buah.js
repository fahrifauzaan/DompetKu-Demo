const url = 'https://script.google.com/macros/s/AKfycbzhD4TrmhBhb1484U7thVyEJDvZAFYtAbiG0bRK_jcWCiLKwy1EtBFCOQKikaj9l6yL2Q/exec?sheet=Transactions';

fetch(url)
  .then(res => res.json())
  .then(data => {
    if (data.success) {
      const transactions = data.data.Transactions;
      const filtered = transactions.filter(t => t.desc && t.desc.toLowerCase().includes('buah naga'));
      console.log(`Found ${filtered.length} transactions with "Buah Naga":`);
      filtered.forEach((t, i) => {
        console.log(`[${i+1}] Date: ${t.date} | Desc: ${t.desc} | Account: ${t.account} | Amount: ${t.amount}`);
      });
    }
  });
