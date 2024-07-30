// pages/api/read-excel.js
import ExcelJS from 'exceljs';
import axios from 'axios';

async function refreshAccessToken(refreshToken) {
  const clientId = process.env.GOOGLE_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET;

  try {
    const response = await axios.post('https://oauth2.googleapis.com/token', {
      client_id: clientId,
      client_secret: clientSecret,
      refresh_token: refreshToken,
      grant_type: 'refresh_token',
    }, {
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' }
    });

    return response.data.access_token;
  } catch (error) {
    throw new Error(`Failed to refresh token: ${error.response?.status} ${error.response?.statusText}`);
  }
}

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  const fileId = process.env.GOOGLE_DOC_ID; 
  let accessToken = process.env.GOOGLE_ACCESS_TOKEN;
  const refreshToken = process.env.GOOGLE_REFRESH_TOKEN;

  try {
    let response;
    try {
      response = await makeRequest(fileId, accessToken);
    } catch (error) {
      if (error.response?.status === 401) {
        try {
          accessToken = await refreshAccessToken(refreshToken);
          response = await makeRequest(fileId, accessToken);
        } catch (refreshError) {
          console.error('Token refresh error:', refreshError);
          return res.status(401).json({
            error: 'Unauthorized - Token refresh failed',
            errorMessage: refreshError.message,
          });
        }
      } else {
        throw error;
      }
    }

    const buffer = Buffer.from(response.data);
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
  return axios.get(url, {
    headers: { Authorization: `Bearer ${accessToken}` },
    responseType: 'arraybuffer'
  });
}