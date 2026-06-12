const url = 'https://script.google.com/macros/s/AKfycbzhD4TrmhBhb1484U7thVyEJDvZAFYtAbiG0bRK_jcWCiLKwy1EtBFCOQKikaj9l6yL2Q/exec?sheet=Assets';

fetch(url)
  .then(res => res.json())
  .then(data => {
    if (data.success) {
      console.log('All Assets:');
      data.data.Assets.forEach((a, i) => {
        console.log(`[${i+1}] Title: ${a.title} | Cat: ${a.category} | subType: ${a.subType} | price: ${a.purchasePrice} | curVal: ${a.currentValue} | ticker: ${a.ticker} | shares: ${a.shares} | avgCost: ${a.avgCost}`);
      });
    }
  })
  .catch(err => console.error(err));
