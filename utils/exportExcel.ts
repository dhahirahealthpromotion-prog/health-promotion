
declare const XLSX: any;

interface ExportHeader {
  key: string;
  label: string;
  type?: string;
}

// Re-import renderCell and translationMap from exportWord.ts to ensure consistency
import { renderCell, translationMap } from './exportWord';

export const exportToExcel = (
    headers: ExportHeader[],
    data: any[], // Array of objects matching data structure, now including 'isGuestEvaluation'
    fileName: string,
    reportTitle?: string
) => {
    const headerRow = headers.map(h => h.label);
    
    // Prepare data rows, and keep track of isGuestEvaluation for each original data item
    const dataWithGuestFlag = data.map(item => {
        const rowContent = headers.map(header => {
            const value = item[header.key as keyof typeof item];
            return renderCell(value, header.type);
        });
        return {
            rowContent: rowContent,
            isGuestEvaluation: item.isGuestEvaluation || false // Ensure this property exists
        };
    });

    const dataForExport = [];
    let actualHeaderRowIndex = 0; // Index of the header row in the final sheet
    
    if (reportTitle) {
        // Create a row for the title, spanning all columns. The value is in the first cell.
        const titleRow = [reportTitle, ...Array(headerRow.length - 1).fill(null)];
        dataForExport.push(titleRow);
        dataForExport.push([]); // Add an empty row for spacing
        actualHeaderRowIndex = 2; // Title (0) + Spacer (1) = Header is at index 2 (row 3 in Excel)
    } else {
        actualHeaderRowIndex = 0; // Header is at index 0 (row 1 in Excel)
    }

    dataForExport.push(headerRow);
    dataForExport.push(...dataWithGuestFlag.map(d => d.rowContent)); // Add actual data rows

    const ws = XLSX.utils.aoa_to_sheet(dataForExport);
    ws['!rightToLeft'] = false; // Set to LTR

    // Ensure the sheet has data for autofilter to work correctly
    if (!ws['!ref']) return;

    const endColumnLetter = XLSX.utils.encode_col(headerRow.length - 1);
    ws['!autofilter'] = { ref: `A${actualHeaderRowIndex + 1}:${endColumnLetter}${actualHeaderRowIndex + 1}` };

    // Calculate column widths
    const colWidths = headerRow.map((_, i) => {
        let maxLength = 0;
        dataForExport.forEach(row => {
            if (row[i]) {
                maxLength = Math.max(maxLength, String(row[i]).length);
            }
        });
        return { wch: maxLength + 2 };
    });
    ws['!cols'] = colWidths;

    const range = XLSX.utils.decode_range(ws['!ref']);
    for (let R = range.s.r; R <= range.e.r; ++R) {
        for (let C = range.s.c; C <= range.e.c; ++C) {
            const cell_address = { c: C, r: R };
            const cell_ref = XLSX.utils.encode_cell(cell_address);
            if (!ws[cell_ref]) ws[cell_ref] = { t: 's', v: '' }; // Ensure cell exists
            if (!ws[cell_ref].s) ws[cell_ref].s = {};

            // Don't add borders to the empty spacer row (if title exists)
            if (reportTitle && R === 1) {
                continue;
            }

            // Add borders to all other cells
            ws[cell_ref].s.border = {
                top: { style: "thin" }, bottom: { style: "thin" },
                left: { style: "thin" }, right: { style: "thin" }
            };

            if (reportTitle && R === 0) { // Title Row
                ws[cell_ref].s.font = { sz: 16, bold: true, color: { rgb: "FF004D40" } };
                ws[cell_ref].s.alignment = { horizontal: "center", vertical: "center" };
            } else if (R === actualHeaderRowIndex) { // Header row
                ws[cell_ref].s.font = { bold: true, color: { rgb: "FF004D40" } }; // Dark green text
                ws[cell_ref].s.fill = { fgColor: { rgb: "FFE6F4EA" } }; // Light green background
                ws[cell_ref].s.alignment = { horizontal: "center", vertical: "center" };
            } else if (R > actualHeaderRowIndex) { // Data rows
                // Zebra striping
                const originalDataIndex = R - (actualHeaderRowIndex + 1); // Get index in the original filtered data
                if (originalDataIndex % 2 === 1) { 
                    ws[cell_ref].s.fill = { fgColor: { rgb: "FFF9F9F9" } }; // Very light grey for alternating rows
                }

                // Apply guest evaluation styling if applicable
                if (dataWithGuestFlag[originalDataIndex] && dataWithGuestFlag[originalDataIndex].isGuestEvaluation) {
                    ws[cell_ref].s.font = { ...ws[cell_ref].s.font, color: { rgb: "FFDC2626" }, bold: true }; // Red color
                }
            }
        }
    }

    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Report');
    XLSX.writeFile(wb, `${fileName}.xlsx`);
};
