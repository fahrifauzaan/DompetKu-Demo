const url = 'https://script.google.com/macros/s/AKfycbzhD4TrmhBhb1484U7thVyEJDvZAFYtAbiG0bRK_jcWCiLKwy1EtBFCOQKikaj9l6yL2Q/exec?sheet=Transactions';

fetch(url)
  .then(res => res.json())
  .then(data => {
    if (data.success) {
      const transactions = data.data.Transactions;
      
      console.log('Searching for transactions with account length <= 5 starting with BCA or BRI...');
      const filtered = transactions.filter(t => {
        if (!t.account) return false;
        const name = t.account.trim().toUpperCase();
        return (name.startsWith('BCA') || name.startsWith('BRI')) && name.length <= 5;
      });
      
      console.log(`Found ${filtered.length} transactions:`);
      filtered.forEach((t, i) => {
        console.log(`[${i+1}] Date: ${t.date} | Desc: ${t.desc} | Account: "${t.account}" | Amount: ${t.amount}`);
      });
    }
  });
