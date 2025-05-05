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

const logError = (error, context = {}) => {
  console.error('❌ Error:', {
    message: error.message,
    stack: error.stack,
    context,
    timestamp: new Date().toISOString()
  });
};

const logWarning = (message, context = {}) => {
  console.warn('⚠️ Warning:', {
    message,
    context,
    timestamp: new Date().toISOString()
  });
};

export default async function handler(req, res) {
  const requestId = Math.random().toString(36).substring(2, 15);
  const requestContext = {
    method: req.method,
    path: req.url,
    requestId,
    timestamp: new Date().toISOString()
  };

  // Verify API key
  const providedKey = req.headers['api_key'];
  if (!providedKey || providedKey !== process.env.SERVER_API_KEY) {
    logError(new Error('Invalid or missing API key'), { ...requestContext, providedKey: providedKey ? 'present' : 'missing' });
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
      logError(error, {
        ...requestContext,
        queryParams: req.query
      });
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
          logError(parseError, {
            ...requestContext,
            bodyType: typeof req.body,
            bodyLength: req.body.length
          });
          return res.status(400).json({
            success: false,
            error: "Invalid JSON string in request body."
          });
        }
      }

      if (!records) {
        logError(new Error('Missing records in request body'), requestContext);
        return res.status(400).json({ success: false, error: "Missing records in request body." });
      }
      if (!Array.isArray(records)) records = [records];

      for (const record of records) {
        if (
          typeof record.recognition_id !== "number" ||
          typeof record.task_id !== "number" ||
          typeof record.date_completed !== "string"
        ) {
          logError(new Error('Invalid record structure'), {
            ...requestContext,
            invalidRecord: record
          });
          return res.status(400).json({
            success: false,
            error: "Each record must include recognition_id (number), task_id (number), and date_completed (string).",
            invalid_record: record,
          });
        }
        if (!isValidDottedDate(record.date_completed)) {
          logWarning('Invalid date format', {
            ...requestContext,
            originalDate: record.date_completed,
            recordId: record.recognition_id
          });
          record.date_completed = convertToDottedDate(record.date_completed);
        }
        if (record.insert_date && !isValidDottedDate(record.insert_date)) {
          logWarning('Invalid insert_date format', {
            ...requestContext,
            originalDate: record.insert_date,
            recordId: record.recognition_id
          });
          record.insert_date = convertToDottedDate(record.insert_date);
        }
      }

      const { data, error } = await supabase.from('external_task_data').upsert(records, {
        onConflict: ['recognition_id'],
      });
      if (error) throw error;

      return res.status(201).json({ success: true, message: "Records inserted/updated successfully", data });
    } catch (error) {
      logError(error, {
        ...requestContext,
        recordsCount: records?.length
      });
      return res.status(500).json({ success: false, error: error.message });
    }
  }

  logError(new Error('Method Not Allowed'), requestContext);
  return res.status(405).json({ success: false, error: "Method Not Allowed" });
}
