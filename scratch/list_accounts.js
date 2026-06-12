const url = 'https://script.google.com/macros/s/AKfycbzhD4TrmhBhb1484U7thVyEJDvZAFYtAbiG0bRK_jcWCiLKwy1EtBFCOQKikaj9l6yL2Q/exec?sheet=Accounts';

fetch(url)
  .then(res => res.json())
  .then(data => {
    if (data.success) {
      console.log('Accounts in sheet:');
      console.log(data.data.Accounts);
    } else {
      console.log('Fetch failed:', data.error);
    }
  })
  .catch(err => console.error(err));
