const url = 'https://script.google.com/macros/s/AKfycbzhD4TrmhBhb1484U7thVyEJDvZAFYtAbiG0bRK_jcWCiLKwy1EtBFCOQKikaj9l6yL2Q/exec?sheet=all';

fetch(url)
  .then(res => res.json())
  .then(data => {
    if (data.success && data.data['Fixed Income Investment']) {
      console.log('Fixed Income Investment details:');
      console.log(JSON.stringify(data.data['Fixed Income Investment'], null, 2));
    } else {
      console.log('No Fixed Income Investment data found or success is false');
    }
  })
  .catch(err => console.error(err));
