const url = 'https://script.google.com/macros/s/AKfycbzhD4TrmhBhb1484U7thVyEJDvZAFYtAbiG0bRK_jcWCiLKwy1EtBFCOQKikaj9l6yL2Q/exec?sheet=Transactions';

fetch(url)
  .then(res => res.json())
  .then(data => {
    if (data.success) {
      const transactions = data.data.Transactions;
      
      const idCounts = {};
      transactions.forEach(t => {
        idCounts[t.id] = (idCounts[t.id] || 0) + 1;
      });
      
      const duplicates = Object.keys(idCounts).filter(id => idCounts[id] > 1);
      console.log(`Total transactions in sheet: ${transactions.length}`);
      console.log(`Unique IDs in sheet: ${Object.keys(idCounts).length}`);
      console.log(`Duplicate IDs count: ${duplicates.length}`);
      
      if (duplicates.length > 0) {
        console.log('\nDuplicate IDs examples:');
        duplicates.slice(0, 5).forEach(id => {
          console.log(`\nID: "${id}" appears ${idCounts[id]} times:`);
          transactions.filter(t => t.id === id).forEach(t => {
            console.log(`- Date: ${t.date} | Desc: ${t.desc} | Account: ${t.account}`);
          });
        });
      }
    }
  });
