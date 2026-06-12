const url = 'https://script.google.com/macros/s/AKfycbzhD4TrmhBhb1484U7thVyEJDvZAFYtAbiG0bRK_jcWCiLKwy1EtBFCOQKikaj9l6yL2Q/exec?sheet=Transactions';

// Custom robust date parser from FinanceTransactions.tsx
const parseDateString = (dateStr) => {
  if (!dateStr) return { month: '', year: '' };
  const trimmed = dateStr.trim();
  
  // 1. Standard ISO format YYYY-MM-DD
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

  // 2. Space or hyphen separated formats (e.g. 26-Jan-2026 or 23 Mar 2024)
  const parts = trimmed.split(/[\s-]+/);
  if (parts.length >= 3) {
    let year = '';
    let month = '';
    
    // Find 4-digit year
    const yearPart = parts.find(p => /^\d{4}$/.test(p));
    if (yearPart) {
      year = yearPart;
    }
    
    // Find month part
    const monthNamesIndo = [
      'Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun',
      'Jul', 'Ags', 'Sep', 'Okt', 'Nov', 'Des'
    ];
    const monthNamesEng = [
      'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
      'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'
    ];
    
    const monthPart = parts.find(p => /^[a-zA-Z]{3,}/.test(p));
    if (monthPart) {
      const prefix = monthPart.slice(0, 3);
      const matchedIdx = monthNamesIndo.findIndex(m => m.toLowerCase() === prefix.toLowerCase());
      if (matchedIdx !== -1) {
        month = monthNamesIndo[matchedIdx];
      } else {
        const matchedEngIdx = monthNamesEng.findIndex(m => m.toLowerCase() === prefix.toLowerCase());
        if (matchedEngIdx !== -1) {
          month = monthNamesIndo[matchedEngIdx];
        }
      }
    }
    return { month, year };
  }
  
  return { month: '', year: '' };
};

fetch(url)
  .then(res => res.json())
  .then(data => {
    if (data.success) {
      const transactions = data.data.Transactions;
      
      console.log(`Listing all 2024 transactions in sheet...`);
      
      const matched = transactions.filter(t => {
        if (t.date) {
          const { year } = parseDateString(t.date);
          return year === '2024';
        }
        return false;
      });
      
      console.log(`Matched ${matched.length} transactions:`);
      matched.forEach((t, i) => {
        const { month, year } = parseDateString(t.date);
        console.log(`[${i+1}] ID: ${t.id} | Date: "${t.date}" (parsed: ${month}-${year}) | Desc: "${t.desc}" | Amount: ${t.amount}`);
      });
    }
  })
  .catch(err => console.error(err));

