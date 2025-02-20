import { fetchExcelFile } from '../../lib/googleDrive';
import { parseExcelFile } from '../../lib/excelParser';
import supabase from '../../lib/supabaseClient';

const FOLDER_ID = process.env.GOOGLE_DRIVE_FOLDER_ID;
const RECORD_LIMIT = 1000; // Fetch only the last 1000 records

export default async function handler(req, res) {
  // Verify API key
  const providedKey = req.headers['api_key'];
  if (!providedKey || providedKey !== process.env.NEXT_PUBLIC_SERVER_API_KEY) {
    return res.status(401).json({ error: "Invalid or missing API key." });
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ message: 'Method Not Allowed' });
  }

  try {
    console.log(`🔄 Updating the last ${RECORD_LIMIT} recognitions from Google Drive...`);

    const { filename } = req.body || {};
    if (!filename) {
      return res.status(400).json({ error: "Filename is required. Please select a file." });
    }

    console.log(`📂 Fetching file: ${filename}`);

    // Fetch the file as a buffer
    const excelBuffer = await fetchExcelFile(FOLDER_ID, filename);

    // Parse only the last 1000 records
    console.log(`📊 Parsing the latest ${RECORD_LIMIT} recognitions from Excel...`);
    const recentRecognitions = await parseExcelFile(excelBuffer, RECORD_LIMIT);

    console.log(`📥 Upserting ${recentRecognitions.length} recognitions into Supabase...`);

    // Insert or update the records in Supabase
    const { error } = await supabase
      .from('external_task_data')
      .upsert(recentRecognitions, { onConflict: 'recognition_id' });
    if (error) throw error;

    console.log(`✅ Recent sync completed successfully!`);
    res.status(200).json({ message: 'Recent recognitions updated successfully', records: recentRecognitions.length });
  } catch (error) {
    console.error(`❌ Error in updateRecentRecognitions API:`, error);
    res.status(500).json({ error: error.message });
  }
}
