const url = 'https://script.google.com/macros/s/AKfycbzhD4TrmhBhb1484U7thVyEJDvZAFYtAbiG0bRK_jcWCiLKwy1EtBFCOQKikaj9l6yL2Q/exec?sheet=Transactions';

const parseDateString = (dateStr) => {
  if (!dateStr) return { day: '', month: '', year: '' };
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
    
    // Parse day part, removing any time component (e.g., '26T08:00:00.000Z' -> 26)
    const dayPart = parts[2].split(/[tT\s]+/)[0];
    const dayVal = parseInt(dayPart, 10);
    const day = isNaN(dayVal) ? '' : String(dayVal);
    
    return { day, month, year };
  }

  // 2. Space or hyphen separated formats (e.g. 26-Jan-2026 or 23 Mar 2024)
  const parts = trimmed.split(/[\s-]+/);
  if (parts.length >= 3) {
    let year = '';
    let month = '';
    let day = '';
    
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

    // Find day part (1 or 2 digits)
    const dayPart = parts.find(p => /^\d{1,2}$/.test(p));
    if (dayPart) {
      day = String(parseInt(dayPart, 10));
    }
    
    return { day, month, year };
  }
  
  return { day: '', month: '', year: '' };
};

const formatDate = (dateStr) => {
  if (!dateStr) return '';
  const { day, month, year } = parseDateString(dateStr);
  if (day && month && year) {
    return `${day.padStart(2, '0')}-${month}-${year}`;
  }
  return dateStr;
};

fetch(url)
  .then(res => res.json())
  .then(data => {
    if (data.success) {
      const transactions = data.data.Transactions;
      
      const selectedMonth = 'Jan';
      const selectedYear = '2024';
      
      console.log(`Filtering for Month: "${selectedMonth}", Year: "${selectedYear}"`);
      
      const filtered = transactions.filter(t => {
        let matchesMonth = true;
        let matchesYear = true;
        
        if (t.date) {
          const { month, year } = parseDateString(t.date);
          if (selectedMonth !== 'Semua Bulan') {
            matchesMonth = month === selectedMonth;
          }
          if (selectedYear !== 'Semua Tahun') {
            matchesYear = year === selectedYear;
          }
        } else if (selectedMonth !== 'Semua Bulan' || selectedYear !== 'Semua Tahun') {
          return false;
        }
        
        return matchesMonth && matchesYear;
      });
      
      console.log(`Found ${filtered.length} matched transactions.`);
      filtered.forEach((t, i) => {
        console.log(`[${i+1}] ID: ${t.id} | Date: "${t.date}" (formatted: "${formatDate(t.date)}") | Desc: "${t.desc}" | Amount: ${t.amount}`);
      });
    }
  })
  .catch(err => console.error(err));
