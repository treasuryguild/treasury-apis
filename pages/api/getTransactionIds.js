// pages/api/getTransactionIds.js
import supabase from '../../lib/supabaseClient';

const API_KEY = process.env.SERVER_API_KEY;

export default async function handler(req, res) {
  // Check for API key
  const apiKey = req.headers['api_key'];
  if (!apiKey || apiKey !== API_KEY) {
    return res.status(401).json({ 
      error: 'Unauthorized: Invalid or missing API key'
    });
  }

  if (req.method !== 'POST') {
    res.setHeader('Allow', ['POST']);
    return res.status(405).json({ error: `Method ${req.method} Not Allowed` });
  }

  try {
    const { recognitionIds } = req.body;

    if (!Array.isArray(recognitionIds) || recognitionIds.length === 0) {
      return res.status(400).json({ error: 'Invalid input: recognitionIds must be a non-empty array' });
    }

    // Convert all recognitionIds to strings
    const normalizedRecognitionIds = recognitionIds.map(id => id.toString());

    // Query the database for the latest 5 entries with transaction_ids
    const { data, error } = await supabase
      .from('tx_json_generator_data')
      .select('recognition_ids, transaction_id')
      .not('transaction_id', 'is', null)
      .order('created_at', { ascending: false })
      .limit(10);

    if (error) {
      throw error;
    }

    // Process the results to match recognitionIds with transaction_ids
    const result = normalizedRecognitionIds.map(recognitionId => {
      const matchingEntry = data.find(entry => 
        Array.isArray(entry.recognition_ids) && entry.recognition_ids.some(id => id.toString() === recognitionId)
      );
      return {
        recognitionId,
        transactionId: matchingEntry ? matchingEntry.transaction_id : null
      };
    });

    res.status(200).json({ result });
  } catch (error) {
    console.error('Error processing request:', error);
    res.status(500).json({ error: 'Internal Server Error', details: error.message });
  }
}