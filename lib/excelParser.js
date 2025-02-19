import ExcelJS from 'exceljs';

// Parse Excel file from a buffer instead of a file path
export async function parseExcelFile(buffer, limit = null) {
  try {
    console.log(`📖 Reading Excel file from memory...`);

    const workbook = new ExcelJS.Workbook();
    await workbook.xlsx.load(buffer); // Load directly from the buffer

    const worksheet = workbook.worksheets[0]; // First sheet
    console.log(`📊 Found sheet: ${worksheet.name}`);

    const rows = [];
    let skippedRows = 0;

    worksheet.eachRow((row, rowNumber) => {
      if (rowNumber === 1) return; // Skip header row

      const rowData = {
        recognition_id: Number(row.getCell(1).value),
        task_id: Number(row.getCell(2).value),
        date_completed: row.getCell(3).text || '',
        insert_date: row.getCell(4).text || '',
        wallet_owner: row.getCell(5).text,
        group_name: row.getCell(6).text,
        sub_group: row.getCell(7).text,
        task_labels: row.getCell(8).text,
        task_name: row.getCell(9).text,
        status: row.getCell(10).text,
        rewarded: row.getCell(11).value === 'TRUE',
        ada: Number(row.getCell(12).value) || 0,
        mins: Number(row.getCell(13).value) || 0,
        agix: Number(row.getCell(14).value) || 0,
        usd: Number(row.getCell(15).value) || 0,
        wallet_address: row.getCell(16).text,
        proof_link: row.getCell(17).text,
        transaction_id: row.getCell(18).text ? String(row.getCell(18).text) : null,
      };

      if (!rowData.recognition_id || !rowData.task_id || !rowData.insert_date) {
        console.warn(`⚠️ Skipping row ${rowNumber} due to missing required fields`);
        skippedRows++;
        return;
      }

      rows.push(rowData);
    });

    console.log(`✅ Parsed ${rows.length} rows successfully. Skipped ${skippedRows} rows.`);

    // Sort by `insert_date` (assume format is DD.MM.YYYY)
    rows.sort((a, b) => {
      const dateA = new Date(a.insert_date.split('.').reverse().join('-'));
      const dateB = new Date(b.insert_date.split('.').reverse().join('-'));
      return dateB - dateA; // Sort descending (latest first)
    });

    // Return only the most recent `limit` rows if specified
    return limit ? rows.slice(0, limit) : rows;
  } catch (error) {
    console.error('❌ Error parsing Excel file:', error);
    throw error;
  }
}
