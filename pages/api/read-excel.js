// pages/api/read-excel.js
import ExcelJS from 'exceljs';
import fetch from 'node-fetch';

async function refreshAccessToken(refreshToken) {
  const clientId = process.env.GOOGLE_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET;

  const tokenResponse = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      client_id: clientId,
      client_secret: clientSecret,
      refresh_token: refreshToken,
      grant_type: 'refresh_token',
    }),
  });

  const tokenData = await tokenResponse.json();
  return tokenData.access_token;
}

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  const fileId = process.env.GOOGLE_DOC_ID; 
  let accessToken = process.env.GOOGLE_ACCESS_TOKEN;
  const refreshToken = process.env.GOOGLE_REFRESH_TOKEN;

  try {
    let response = await makeRequest(fileId, accessToken);

    // If token is expired, refresh it
    if (response.status === 401) { // 401 Unauthorized
      accessToken = await refreshAccessToken(refreshToken);
      response = await makeRequest(fileId, accessToken);
    }

    if (!response.ok) {
      throw new Error(`Google Drive API Response Error: ${response.status} ${response.statusText}`);
    }

    const buffer = await response.buffer();
    const workbook = new ExcelJS.Workbook();
    await workbook.xlsx.load(buffer);

    const worksheet = workbook.getWorksheet(1);
    let data = [];
    worksheet.eachRow({ includeEmpty: true }, (row, rowNumber) => {
      data.push({ rowNumber, values: row.values });
    });
    res.setHeader('Access-Control-Allow-Methods', 'GET');
    res.setHeader('Access-Control-Allow-Headers', 'X-Requested-With, Content-Type, Accept, Authorization');
    res.status(200).json({ data });
  } catch (error) {
    console.error('Error:', error);
    res.status(500).json({
      error: 'Failed to read Excel file',
      errorMessage: error.message,
      stack: error.stack
    });
  }
  console.log('Done');
}

async function makeRequest(fileId, accessToken) {
  const url = `https://www.googleapis.com/drive/v3/files/${fileId}?alt=media`;
  return fetch(url, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
}