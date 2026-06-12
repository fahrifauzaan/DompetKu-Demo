const url = 'https://script.google.com/macros/s/AKfycbzhD4TrmhBhb1484U7thVyEJDvZAFYtAbiG0bRK_jcWCiLKwy1EtBFCOQKikaj9l6yL2Q/exec?sheet=Transactions';

fetch(url)
  .then(res => res.json())
  .then(data => {
    if (data.success) {
      const transactions = data.data.Transactions;
      console.log('Total transactions:', transactions.length);
      console.log('Last 5 transactions in sheet (will be first 5 in store):');
      transactions.slice(-5).reverse().forEach((t, i) => {
        console.log(`[${i+1}] ID: ${t.id} | Date: "${t.date}" | Desc: "${t.desc}" | Amount: ${t.amount}`);
      });
    }
  })
  .catch(err => console.error(err));
