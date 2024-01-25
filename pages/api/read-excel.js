// pages/api/read-excel.js
import ExcelJS from 'exceljs';
import fetch from 'node-fetch';

export default async function handler(req, res) {
  const fileId = process.env.GOOGLE_DOC_ID; 
  const accessToken = process.env.GOOGLE_ACCESS_TOKEN 

  const url = `https://www.googleapis.com/drive/v3/files/${fileId}?alt=media`;

  try {
    const response = await fetch(url, {
      headers: { Authorization: `Bearer ${accessToken}` },
    });
    if (!response.ok) {
      throw new Error('Network response was not ok');
    }
    const buffer = await response.buffer();

    const workbook = new ExcelJS.Workbook();
    await workbook.xlsx.load(buffer);

    const worksheet = workbook.getWorksheet(1); // Or use the worksheet name
    let data = [];
    worksheet.eachRow({ includeEmpty: true }, function (row, rowNumber) {
      data.push({ rowNumber, values: row.values });
    });

    res.status(200).json({ data });
  } catch (error) {
    console.error('Error:', error);
    res.status(500).json({ error: 'Failed to read Excel file' });
  }
  console.log('Done');
}
