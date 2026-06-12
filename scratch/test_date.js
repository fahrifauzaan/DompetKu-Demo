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
        'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Des'
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

const dates = [
  "2026-01-26",
  "2024-11-24T00:00:00.000Z",
  "26-Jan-2026",
  "24-Nov-2024"
];

for (const d of dates) {
  console.log(d, "->", parseDateString(d));
}
