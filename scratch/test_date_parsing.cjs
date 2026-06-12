const fs = require('fs');
const https = require('https');

const url = 'https://script.google.com/macros/s/AKfycbzhD4TrmhBhb1484U7thVyEJDvZAFYtAbiG0bRK_jcWCiLKwy1EtBFCOQKikaj9l6yL2Q/exec?sheet=Transactions';

const parseDateString = (dateStr) => {
  if (!dateStr) return { day: '', month: '', year: '' };
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
    const dayPart = parts[2].split(/[tT\s]+/)[0];
    const dayVal = parseInt(dayPart, 10);
    const day = isNaN(dayVal) ? '' : String(dayVal);
    
    return { day, month, year };
  }

  const parts = trimmed.split(/[\s-]+/);
  if (parts.length >= 3) {
    let year = '';
    let month = '';
    let day = '';
    
    const yearPart = parts.find(p => /^\d{4}$/.test(p));
    if (yearPart) {
      year = yearPart;
    }
    
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

    const dayPart = parts.find(p => /^\d{1,2}$/.test(p));
    if (dayPart) {
      day = String(parseInt(dayPart, 10));
    }
    
    return { day, month, year };
  }
  
  return { day: '', month: '', year: '' };
};

https.get(url, (res) => {
    // Follow redirect
    if (res.statusCode === 302) {
        https.get(res.headers.location, (res2) => {
            let data = '';
            res2.on('data', chunk => data += chunk);
            res2.on('end', () => {
                const json = JSON.parse(data);
                const txs = json.data;
                const filtered = txs.filter(t => {
                    const { month, year } = parseDateString(t.date);
                    return year === '2024' || year === '2026';
                });
                for (const t of filtered) {
                    const parsed = parseDateString(t.date);
                    console.log(`Date: ${t.date} -> Parsed: ${JSON.stringify(parsed)}`);
                }
            });
        });
    }
});
