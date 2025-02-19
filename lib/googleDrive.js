import { google } from 'googleapis';
import stream from 'stream';

const GOOGLE_CREDENTIALS = JSON.parse(process.env.GOOGLE_CREDENTIALS);

// Authenticate with Google
const auth = new google.auth.JWT(
  GOOGLE_CREDENTIALS.client_email,
  null,
  GOOGLE_CREDENTIALS.private_key,
  ['https://www.googleapis.com/auth/drive']
);

const drive = google.drive({ version: 'v3', auth });

// List all Excel files in the folder
export async function listExcelFiles(folderId) {
  try {
    console.log(`📂 Fetching list of available Excel files in folder: ${folderId}`);

    const response = await drive.files.list({
      q: `'${folderId}' in parents and mimeType='application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'`,
      fields: 'files(id, name, createdTime)',
      orderBy: 'createdTime desc',
    });

    if (!response.data.files.length) {
      console.log(`❌ No Excel files found in the folder.`);
      return [];
    }

    // Log available files
    console.log(`📋 Available Excel Files:`);
    response.data.files.forEach(file => {
      console.log(`📄 ${file.name} (Created: ${file.createdTime})`);
    });

    return response.data.files; // Return list of files
  } catch (error) {
    console.error('❌ Error fetching file list:', error);
    throw error;
  }
}

// Fetch a specific Excel file by filename OR the latest file if no filename is provided
export async function fetchExcelFile(folderId, filename) {
  try {
    console.log(`🔍 Searching for file: ${filename}`);

    // Get the list of matching files
    const response = await drive.files.list({
      q: `'${folderId}' in parents and mimeType='application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' and name='${filename}'`,
      fields: 'files(id, name, createdTime)',
      pageSize: 1,
    });

    const files = response.data.files;
    if (!files.length) {
      throw new Error(`❌ File "${filename}" not found in Google Drive folder.`);
    }

    const file = files[0];
    console.log(`📄 File selected: ${file.name} (ID: ${file.id}, Created: ${file.createdTime})`);

    // Stream the file from Google Drive
    const fileStream = await drive.files.get({ fileId: file.id, alt: 'media' }, { responseType: 'stream' });

    // Convert stream to buffer
    const buffer = await new Promise((resolve, reject) => {
      const data = [];
      fileStream.data.on('data', chunk => data.push(chunk));
      fileStream.data.on('end', () => resolve(Buffer.concat(data)));
      fileStream.data.on('error', reject);
    });

    console.log(`✅ File streamed successfully (${buffer.length} bytes).`);
    return buffer; // Return file as a buffer

  } catch (error) {
    console.error('❌ Error fetching Excel file:', error);
    throw error;
  }
}