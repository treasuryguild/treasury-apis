import supabase from '../../lib/supabaseClient';

const isValidDottedDate = (dateString) => /^\d{2}\.\d{2}\.\d{4}$/.test(dateString);

const formatAsDottedDate = (date) => {
  const day = String(date.getDate()).padStart(2, "0");
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const year = date.getFullYear();
  return `${day}.${month}.${year}`;
};

const convertToDottedDate = (dateString) => {
  const dateObj = new Date(dateString);
  if (isNaN(dateObj.getTime())) return "";
  return formatAsDottedDate(dateObj);
};

export default async function handler(req, res) {
  // Verify API key
  const providedKey = req.headers['api_key'];
  if (!providedKey || providedKey !== process.env.NEXT_PUBLIC_SERVER_API_KEY) {
    return res.status(401).json({ error: "Invalid or missing API key." });
  }

  if (req.method === 'GET') {
    try {
      let query = supabase.from('external_task_data').select('*');

      // Apply filters if query parameters exist
      const { recognition_id, task_id, wallet_owner, start_date, end_date, limit } = req.query;
      if (recognition_id) query = query.eq('recognition_id', recognition_id);
      if (task_id) query = query.eq('task_id', task_id);
      if (wallet_owner) query = query.ilike('wallet_owner', `%${wallet_owner}%`);
      if (start_date) query = query.gte('date_completed', start_date);
      if (end_date) query = query.lte('date_completed', end_date);

      // Limit results (default: 100, max: 1000)
      const fetchLimit = Math.min(parseInt(limit) || 100, 1000);
      query = query.limit(fetchLimit);

      const { data, error } = await query;
      if (error) throw error;

      return res.status(200).json({ success: true, count: data.length, data });
    } catch (error) {
      console.error('❌ Error fetching data:', error);
      return res.status(500).json({ success: false, error: error.message });
    }
  }

  if (req.method === 'POST') {
    try {
      let { records } = req.body;

      // Handle case where body is a string
      if (typeof req.body === 'string') {
        try {
          records = JSON.parse(req.body).records;
        } catch (parseError) {
          return res.status(400).json({
            success: false,
            error: "Invalid JSON string in request body."
          });
        }
      }

      if (!records) {
        return res.status(400).json({ success: false, error: "Missing records in request body." });
      }
      if (!Array.isArray(records)) records = [records];

      console.log("📥 Received records:", records);
      for (const record of records) {
        if (
          typeof record.recognition_id !== "number" ||
          typeof record.task_id !== "number" ||
          typeof record.date_completed !== "string"
        ) {
          console.error("❌ Invalid record found:", record);
          return res.status(400).json({
            success: false,
            error: "Each record must include recognition_id (number), task_id (number), and date_completed (string).",
            invalid_record: record,
          });
        }
        if (!isValidDottedDate(record.date_completed)) {
          console.warn(`⚠️ Invalid date format: ${record.date_completed}. Converting...`);
          record.date_completed = convertToDottedDate(record.date_completed);
        }
        if (record.insert_date && !isValidDottedDate(record.insert_date)) {
          console.warn(`⚠️ Invalid insert_date format: ${record.insert_date}. Converting...`);
          record.insert_date = convertToDottedDate(record.insert_date);
        }
      }

      const { data, error } = await supabase.from('external_task_data').upsert(records, {
        onConflict: ['recognition_id'],
      });
      if (error) throw error;

      return res.status(201).json({ success: true, message: "Records inserted/updated successfully", data });
    } catch (error) {
      console.error('❌ Error inserting/updating data:', error);
      return res.status(500).json({ success: false, error: error.message });
    }
  }

  return res.status(405).json({ success: false, error: "Method Not Allowed" });
}
