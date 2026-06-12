const url = 'https://script.google.com/macros/s/AKfycbzhD4TrmhBhb1484U7thVyEJDvZAFYtAbiG0bRK_jcWCiLKwy1EtBFCOQKikaj9l6yL2Q/exec';

async function testSettings() {
  console.log('Sending update request for settings...');
  const payload = {
    action: 'update',
    sheet: 'Settings',
    data: {
      key: 'phone',
      value: '+62 877 5133 4784 TEST'
    }
  };
  
  try {
    const response = await fetch(url, {
      method: 'POST',
      body: JSON.stringify(payload)
    });
    const result = await response.json();
    console.log('Update result:', result);
  } catch (err) {
    console.error('Error:', err);
  }
}

testSettings();
