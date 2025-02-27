import supabase from '../../lib/supabaseClient';

export default async function handler(req, res) {
  // Verify API key
  const providedKey = req.headers['api_key'];
  if (!providedKey || providedKey !== process.env.NEXT_PUBLIC_SERVER_API_KEY) {
    return res.status(401).json({ error: "Invalid or missing API key." });
  }

  if (req.method === 'GET') {
    try {
      let query = supabase.from('external_labels').select('*');

      // Optional filtering by label (supports partial match)
      const { label, limit } = req.query;
      if (label) query = query.ilike('label', `%${label}%`);

      // Limit results (default: 100, max: 1000)
      const fetchLimit = Math.min(parseInt(limit) || 100, 1000);
      query = query.limit(fetchLimit);

      const { data, error } = await query;
      if (error) throw error;

      return res.status(200).json({ success: true, count: data.length, data });
    } catch (error) {
      console.error('❌ Error fetching labels:', error);
      return res.status(500).json({ success: false, error: error.message });
    }
  }

  if (req.method === 'POST') {
    try {
      let { labels } = req.body;
      if (!labels) {
        return res.status(400).json({ success: false, error: "Missing labels in request body." });
      }

      // Support both comma-separated string or an array of strings.
      if (typeof labels === "string") {
        labels = labels.split(',').map(label => label.trim()).filter(label => label);
      } else if (Array.isArray(labels)) {
        labels = labels.map(label => typeof label === "string" ? label.trim() : "").filter(label => label);
      } else {
        return res.status(400).json({
          success: false,
          error: "Labels must be provided as a comma separated string or an array of strings."
        });
      }

      if (labels.length === 0) {
        return res.status(400).json({ success: false, error: "No valid labels provided." });
      }

      console.log("📥 Received labels:", labels);

      // Check for any labels that already exist in the table
      const { data: existingLabels, error: selectError } = await supabase
        .from('external_labels')
        .select('label')
        .in('label', labels);

      if (selectError) throw selectError;

      if (existingLabels && existingLabels.length > 0) {
        const duplicateLabels = existingLabels.map(item => item.label);
        console.error("❌ Some labels already exist:", duplicateLabels);
        return res.status(409).json({
          success: false,
          error: "Some labels already exist.",
          existingLabels: duplicateLabels,
        });
      }

      // Prepare records for insertion
      const records = labels.map(label => ({ label }));

      const { data, error: insertError } = await supabase
        .from('external_labels')
        .insert(records);

      if (insertError) throw insertError;

      return res.status(201).json({
        success: true,
        message: "Labels inserted successfully.",
        data,
      });
    } catch (error) {
      console.error('❌ Error inserting labels:', error);
      return res.status(500).json({ success: false, error: error.message });
    }
  }

  return res.status(405).json({ success: false, error: "Method Not Allowed" });
}
