import { fetchExcelFile } from '../../lib/googleDrive';
import { parseExcelFile } from '../../lib/excelParser';
import supabase from '../../lib/supabaseClient';

const FOLDER_ID = process.env.GOOGLE_DRIVE_FOLDER_ID;

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ message: 'Method Not Allowed' });
  }

  try {
    console.log(`🔄 Syncing recognitions from Google Drive...`);

    const { filename } = req.body || {};
    if (!filename) {
      return res.status(400).json({ error: "Filename is required. Please select a file." });
    }

    console.log(`📂 Fetching file: ${filename}`);

    // Fetch the file as a buffer
    const excelBuffer = await fetchExcelFile(FOLDER_ID, filename);

    // Parse Excel file directly from memory
    console.log(`📊 Parsing Excel file...`);
    const recognitions = await parseExcelFile(excelBuffer);

    console.log(`📥 Inserting/Updating ${recognitions.length} recognitions into Supabase...`);

    // Insert into Supabase
    const { error } = await supabase.from('external_task_data').upsert(recognitions);
    if (error) throw error;

    console.log(`✅ Sync completed successfully!`);
    res.status(200).json({ message: 'Recognitions updated successfully', records: recognitions.length });

  } catch (error) {
    console.error(`❌ Error in syncRecognitions API:`, error);
    res.status(500).json({ error: error.message });
  }
}
