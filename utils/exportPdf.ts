
import { renderCell } from './exportWord';

interface ExportHeader {
  key: string;
  label: string;
  type?: string;
}

interface PdfPageData {
  title: string;
  headers: ExportHeader[];
  data: any[];
}

export const exportToPdf = (
  headersOrPages: ExportHeader[] | PdfPageData[],
  data: any[] | null, 
  fileName: string,
  reportTitle: string
) => {
  let pages: PdfPageData[] = [];

  // Check if we are in multi-page mode (passed array of page objects) or single-page mode (headers + data)
  if (data === null && Array.isArray(headersOrPages)) {
    // Multi-page mode
    pages = headersOrPages as PdfPageData[];
  } else {
    // Single page mode (backward compatibility)
    pages = [{
      title: reportTitle,
      headers: headersOrPages as ExportHeader[],
      data: data || []
    }];
  }

  const date = new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });

  const generatePageHtml = (page: PdfPageData, index: number, total: number) => {
    const tableHeaders = page.headers.map(h => `<th>${h.label}</th>`).join('');
    
    const tableRowsHtml = page.data.map(item => {
      const isGuestEvaluation = item.isGuestEvaluation || false;
      const rowCellsHtml = page.headers.map(header => {
        // Handle cases where item is just {label, value} vs full object
        const value = item[header.key] !== undefined ? item[header.key] : item[header.key as keyof typeof item];
        const cellContent = renderCell(value, header.type);
        const style = isGuestEvaluation ? 'color: #dc2626; font-weight: bold;' : '';
        return `<td style="border: 1px solid #ccc; padding: 5px; text-align: left; vertical-align: middle; ${style}">${cellContent}</td>`;
      }).join('');
      return `<tr>${rowCellsHtml}</tr>`;
    }).join('');

    return `
      <div class="page-container ${index < total - 1 ? 'page-break' : ''}">
        <div class="header">
          <h1>${page.title}</h1>
          <p>Report Date: ${date}</p>
        </div>

        <table>
          <thead>
            <tr>${tableHeaders}</tr>
          </thead>
          <tbody>
            ${tableRowsHtml}
          </tbody>
        </table>
      </div>
    `;
  };

  const allPagesHtml = pages.map((page, idx) => generatePageHtml(page, idx, pages.length)).join('');

  const htmlContent = `
    <!DOCTYPE html>
    <html lang="en" dir="ltr">
    <head>
      <meta charset="UTF-8">
      <title>${fileName}</title>
      <link rel="preconnect" href="https://fonts.googleapis.com">
      <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
      <link href="https://fonts.googleapis.com/css2?family=Tajawal:wght@400;500;700&display=swap" rel="stylesheet">
      <style>
        @page {
            size: A4 landscape;
            margin: 10mm;
        }
        body {
          font-family: 'Tajawal', sans-serif;
          margin: 0;
          padding: 20px;
          color: #333;
          font-size: 8pt;
        }
        .page-container {
          margin-bottom: 20px;
        }
        .header {
          text-align: center;
          margin-bottom: 15px;
          border-bottom: 2px solid #006A4E;
          padding-bottom: 8px;
        }
        .header h1 {
          color: #006A4E;
          margin: 0 0 5px 0;
          font-size: 16pt;
        }
        .header p {
          color: #666;
          margin: 0;
          font-size: 10pt;
        }
        table {
          width: 100%;
          border-collapse: collapse;
          margin-top: 10px;
          font-size: 8pt;
        }
        th, td {
          border: 1px solid #ccc;
          padding: 5px;
          text-align: left;
          vertical-align: middle;
        }
        th {
          background-color: #E6F4EA !important;
          color: #004D40 !important;
          font-weight: bold;
          text-align: center;
          -webkit-print-color-adjust: exact;
          print-color-adjust: exact;
        }
        tr:nth-child(even) {
          background-color: #f9f9f9 !important;
          -webkit-print-color-adjust: exact;
          print-color-adjust: exact;
        }
        
        @media print {
          body { -webkit-print-color-adjust: exact; }
          .page-break { page-break-after: always; display: block; height: 1px; }
          .no-print { display: none; }
          thead { display: table-header-group; }
          tfoot { display: table-footer-group; }
          tr { page-break-inside: avoid; }
        }
      </style>
    </head>
    <body>
      ${allPagesHtml}
      <script>
        window.onload = function() {
          setTimeout(function() {
            window.print();
          }, 500);
        };
      </script>
    </body>
    </html>
  `;

  const printWindow = window.open('', '_blank');
  
  if (printWindow) {
    printWindow.document.write(htmlContent);
    printWindow.document.close();
    printWindow.focus();
  } else {
    alert("Please allow pop-ups to print the report.");
  }
};
