const url = 'https://script.google.com/macros/s/AKfycbzhD4TrmhBhb1484U7thVyEJDvZAFYtAbiG0bRK_jcWCiLKwy1EtBFCOQKikaj9l6yL2Q/exec?sheet=Transactions';

fetch(url)
  .then(res => res.json())
  .then(data => {
    if (data.success) {
      const transactions = data.data.Transactions;
      const bcaBri = transactions.filter(t => t.account === 'BCA' || t.account === 'BRI');
      console.log(`Found ${bcaBri.length} transactions with exact account 'BCA' or 'BRI':`);
      bcaBri.forEach((t, i) => {
        console.log(`[${i+1}] Date: ${t.date} | Desc: ${t.desc} | Account: ${t.account} | Amount: ${t.amount}`);
      });
    }
  });
