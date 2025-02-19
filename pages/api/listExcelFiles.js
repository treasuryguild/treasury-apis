import { listExcelFiles } from '../../lib/googleDrive';

const FOLDER_ID = process.env.GOOGLE_DRIVE_FOLDER_ID;

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ message: 'Method Not Allowed' });
  }

  try {
    console.log(`📂 Fetching list of available Excel files from folder: ${FOLDER_ID}`);

    const availableFiles = await listExcelFiles(FOLDER_ID);

    if (!availableFiles.length) {
      console.log("⚠️ No Excel files found in the folder.");
      return res.status(404).json({ error: "No Excel files found in Google Drive." });
    }

    console.log(`📋 Available Excel Files:`);
    availableFiles.forEach(file => console.log(`📄 ${file.name} (Created: ${file.createdTime})`));

    res.status(200).json({ files: availableFiles.map(file => file.name) });

  } catch (error) {
    console.error(`❌ Error fetching Excel file list:`, error);
    res.status(500).json({ error: error.message });
  }
}
