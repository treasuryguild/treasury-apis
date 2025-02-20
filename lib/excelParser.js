import ExcelJS from 'exceljs';

function formatAsDottedDate(jsDate) {
  const day = String(jsDate.getDate()).padStart(2, '0');
  const month = String(jsDate.getMonth() + 1).padStart(2, '0');
  const year = jsDate.getFullYear();
  return `${day}.${month}.${year}`;
}

function parseCellAsDate(cell) {
  if (!cell || !cell.value) return '';

  // If ExcelJS recognized it as a date object:
  if (cell.type === ExcelJS.ValueType.Date) {
    return formatAsDottedDate(cell.value);
  }

  // If ExcelJS recognized it as a number (Excel date serial):
  if (cell.type === ExcelJS.ValueType.Number) {
    // Excel date serial to JS Date. For example:
    const excelSerialDate = cell.value; 
    // Excel typically starts at 1900-01-01 = 1, but there's an offset. 
    // ExcelJS helps with that:
    const jsDate = new Date(Math.round((excelSerialDate - 25569) * 864e5));
    return formatAsDottedDate(jsDate);
  }

  // Otherwise, if it's a string, attempt to parse it as a date:
  if (typeof cell.value === 'string') {
    const parsed = new Date(cell.value);
    if (!isNaN(parsed.getTime())) {
      return formatAsDottedDate(parsed);
    }
  }

  // If we can’t parse it, just return the cell’s text as-is
  return cell.text || '';
}

export async function parseExcelFile(buffer, limit = null) {
  try {
    console.log(`📖 Reading Excel file from memory...`);

    const workbook = new ExcelJS.Workbook();
    await workbook.xlsx.load(buffer);

    const worksheet = workbook.worksheets[0]; // First sheet
    console.log(`📊 Found sheet: ${worksheet.name}`);

    const rows = [];
    let skippedRows = 0;

    worksheet.eachRow((row, rowNumber) => {
      if (rowNumber === 1) return; // Skip header row

      const rewardedValue = row.getCell(11).value;
      const rowData = {
        recognition_id: Number(row.getCell(1).value),
        task_id: Number(row.getCell(2).value),

        // Use our parser for these two dates:
        date_completed: parseCellAsDate(row.getCell(3)),
        insert_date: parseCellAsDate(row.getCell(4)),

        wallet_owner: row.getCell(5).text,
        group_name: row.getCell(6).text,
        sub_group: row.getCell(7).text,
        task_labels: row.getCell(8).text,
        task_name: row.getCell(9).text,
        status: row.getCell(10).text,
        rewarded: rewardedValue === true || String(rewardedValue).toLowerCase() === 'true',
        ada: Number(row.getCell(12).value) || 0,
        mins: Number(row.getCell(13).value) || 0,
        agix: Number(row.getCell(14).value) || 0,
        usd: Number(row.getCell(15).value) || 0,
        wallet_address: row.getCell(16).text,
        proof_link: row.getCell(17).text,
        transaction_id: row.getCell(18).text ? String(row.getCell(18).text) : null,
      };

      if (!rowData.recognition_id) {
        console.warn(`⚠️ Skipping row ${rowNumber} due to missing required fields`);
        skippedRows++;
        return;
      }

      rows.push(rowData);
    });

    console.log(`✅ Parsed ${rows.length} rows successfully. Skipped ${skippedRows} rows.`);

    // Sort by `insert_date` descending
    rows.sort((a, b) => {
      // Because a.insert_date is now "DD.MM.YYYY", convert it to "YYYY-MM-DD" for correct Date comparison
      const dateA = new Date(a.insert_date.split('.').reverse().join('-'));
      const dateB = new Date(b.insert_date.split('.').reverse().join('-'));
      return dateB - dateA;
    });

    // Return only the most recent `limit` rows if specified
    return limit ? rows.slice(0, limit) : rows;
  } catch (error) {
    console.error('❌ Error parsing Excel file:', error);
    throw error;
  }
}
