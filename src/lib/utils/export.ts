// src/lib/utils/export.ts

export function exportToCSV(data: any[], filename: string) {
    if (!data || data.length === 0) {
      alert("No data to export");
      return;
    }
  
    // Get headers from the first object
    const headers = Object.keys(data[0]);
    
    // Convert data to CSV string
    const csvContent = [
      headers.join(','), // Header row
      ...data.map(row => 
        headers.map(fieldName => {
          // Handle values that might contain commas or quotes
          let val = row[fieldName];
          if (typeof val === 'string' && (val.includes(',') || val.includes('"'))) {
            val = `"${val.replace(/"/g, '""')}"`; 
          }
          return val;
        }).join(',')
      )
    ].join('\r\n');
  
    // Create download link
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `${filename}_${new Date().toISOString().split('T')[0]}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }