// pages/api/getTransactionIds.js
import supabase from '../../lib/supabaseClient';

const API_KEY = process.env.SERVER_API_KEY;

export default async function handler(req, res) {
  // Check for API key
  const apiKey = req.headers['api_key'];
  if (!apiKey) {
    return res.status(401).json({ error: 'Unauthorized: Missing API key' });
  }
  if (apiKey !== API_KEY) {
    return res.status(401).json({ error: 'Unauthorized: Invalid API key' });
  }

  if (req.method !== 'POST') {
    res.setHeader('Allow', ['POST']);
    return res.status(405).json({ error: `Method ${req.method} Not Allowed` });
  }

  try {
    let body = req.body;

    // Parse the body if it's a string
    if (typeof body === 'string') {
      try {
        body = JSON.parse(body);
      } catch (e) {
        return res.status(400).json({ 
          error: 'Invalid input: Body must be valid JSON',
          details: e.message
        });
      }
    }

    if (typeof body !== 'object' || body === null) {
      return res.status(400).json({ 
        error: 'Invalid input: Body must be a JSON object',
        details: `Received: ${typeof body}`
      });
    }

    const { recognitionIds } = body;

    if (!recognitionIds) {
      return res.status(400).json({ 
        error: 'Missing input: recognitionIds is required',
        details: 'The request body must include a recognitionIds field'
      });
    }

    if (!Array.isArray(recognitionIds)) {
      return res.status(400).json({ 
        error: 'Invalid input: recognitionIds must be an array',
        details: `Received: ${typeof recognitionIds}`
      });
    }

    if (recognitionIds.length === 0) {
      return res.status(400).json({ 
        error: 'Invalid input: recognitionIds must be a non-empty array',
        details: 'The recognitionIds array must contain at least one element'
      });
    }

    // Convert all recognitionIds to strings
    const normalizedRecognitionIds = recognitionIds.map(id => {
      if (id === null || id === undefined) {
        throw new Error('Invalid recognitionId: null or undefined values are not allowed');
      }
      return id.toString();
    });

    // Query the database for the latest 10 entries with transaction_ids
    const { data, error } = await supabase
      .from('tx_json_generator_data')
      .select('recognition_ids, transaction_id')
      .not('transaction_id', 'is', null)
      .order('created_at', { ascending: false })
      .limit(10);

    if (error) {
      console.error('Supabase query error:', error);
      return res.status(500).json({ 
        error: 'Database query failed',
        details: error.message
      });
    }

    if (!data || data.length === 0) {
      return res.status(404).json({ 
        error: 'No matching data found',
        details: 'The query returned no results'
      });
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

    // Check if any transactionIds were found
    const anyTransactionFound = result.some(item => item.transactionId !== null);
    if (!anyTransactionFound) {
      return res.status(404).json({ 
        error: 'No matching transactions found',
        details: 'None of the provided recognitionIds matched any transactions'
      });
    }

    res.status(200).json({ result });
  } catch (error) {
    console.error('Error processing request:', error);
    res.status(500).json({ 
      error: 'Internal Server Error', 
      details: error.message 
    });
  }
}