const url = 'https://script.google.com/macros/s/AKfycbzhD4TrmhBhb1484U7thVyEJDvZAFYtAbiG0bRK_jcWCiLKwy1EtBFCOQKikaj9l6yL2Q/exec?sheet=Transactions';

const parseDateString = (dateStr) => {
  if (!dateStr) return { month: '', year: '' };
  const trimmed = dateStr.trim();
  if (/^\d{4}-\d{2}-\d{2}/.test(trimmed)) {
    const parts = trimmed.split('-');
    const year = parts[0];
    const monthIndex = parseInt(parts[1], 10) - 1;
    const monthNamesIndo = [
      'Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun',
      'Jul', 'Ags', 'Sep', 'Okt', 'Nov', 'Des'
    ];
    const month = monthNamesIndo[monthIndex] || '';
    return { month, year };
  }
  return { month: '', year: '' };
};

fetch(url)
  .then(res => res.json())
  .then(data => {
    if (data.success) {
      const transactions = data.data.Transactions;
      console.log('January transactions in database:');
      transactions.forEach((t, i) => {
        const { month, year } = parseDateString(t.date || '');
        if (month === 'Jan') {
          console.log(`[${i+1}] ID: ${t.id} | Date: "${t.date}" (${month}-${year}) | Desc: "${t.desc}" | Account: "${t.account}" | Amount: ${t.amount} | Type: "${t.type}"`);
        }
      });
    }
  })
  .catch(err => console.error(err));
