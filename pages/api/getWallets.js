import supabase from "../../lib/supabaseClient";

export default async function handler(req, res) {
  const SERVER_API_KEY = process.env.SERVER_API_KEY;
  const apiKeyHeader = req.headers['api_key'];

  if (!apiKeyHeader || apiKeyHeader !== SERVER_API_KEY) {
    return res.status(403).json({ error: 'Forbidden' });
  }

  try {
    let { data, error } = await supabase
      .from('wallets')
      .select('wallet, username, full_username, project, user_id');
    
    if (error) throw error;

    res.status(200).json({ data });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};
