// ../pages/api/txJsonGenerator.js
import { processAndInsertData } from '../../utils/dataProcessor';
import supabase from '../../lib/supabaseClient';

const API_KEY = process.env.SERVER_API_KEY;
const TESTING_MODE = true; // Set this to false to disable testing mode

export default async function handler(req, res) {
  // Check for API key
  const apiKey = req.headers['api_key'];
  if (!apiKey || apiKey !== API_KEY) {
    return res.status(401).json({ message: 'Unauthorized' });
  }

  if (req.method === 'POST') {
    try {
      let receivedData = req.body;
      console.log('Received data:', receivedData);

      // Check if receivedData is a string, and if so, parse it into an object
      if (typeof receivedData === 'string') {
        try {
          receivedData = JSON.parse(receivedData);
        } catch (parseError) {
          return res.status(400).json({ message: 'Invalid JSON string', error: parseError.message });
        }
      }

      // Check if receivedData is now an object
      if (typeof receivedData !== 'object' || receivedData === null) {
        return res.status(400).json({ message: 'Invalid data format. Expected an object or a valid JSON string.' });
      }

      const errors = [];

      if (errors.length > 0) {
        return res.status(400).json({ message: 'Data validation failed', errors: errors });
      }

      if (TESTING_MODE) {
        // Insert only the raw data for testing purposes
        const { data: insertedRawData, error: insertError } = await supabase
          .from('tx_json_generator_data')
          .insert({
            raw_data: receivedData,
            reward_status: false
          })
          .select();

        if (insertError) {
          throw insertError;
        }

        return res.status(200).json({
          message: 'Raw data inserted successfully (Testing Mode)',
          rawData: insertedRawData[0].raw_data
        });
      } else {
        // Process and insert data using the utility function
        const { insertedData, rawData, processedData } = await processAndInsertData(receivedData);

        res.status(200).json({ 
          message: 'Data validated, transformed, stored, and processed successfully', 
          rawData: rawData,
          processedData: processedData
        });
      }

    } catch (error) {
      console.error('Error processing request:', error);
      res.status(500).json({ message: 'Internal server error', error: error.message });
    }
  } else {
    res.setHeader('Allow', ['POST']);
    res.status(405).end(`Method ${req.method} Not Allowed`);
  }
}