// ../pages/api/txJsonGenerator.js
import { processAndInsertData } from '../../utils/dataProcessor';

const API_KEY = process.env.SERVER_API_KEY;

export default async function handler(req, res) {
  // Check for API key
  const apiKey = req.headers['api_key'];
  if (!apiKey || apiKey !== API_KEY) {
    return res.status(401).json({ message: 'Unauthorized' });
  }

  if (req.method === 'POST') {
    try {
      const receivedData = req.body;
      console.log('Received data:', receivedData);

      const errors = [];

      if (errors.length > 0) {
        return res.status(400).json({ message: 'Data validation failed', errors: errors });
      }

      // Process and insert data using the utility function
      const { insertedData, rawData, processedData } = await processAndInsertData(receivedData);

      res.status(200).json({ 
        message: 'Data validated, transformed, stored, and processed successfully', 
        rawData: rawData,
        processedData: processedData
      });

    } catch (error) {
      console.error('Error processing request:', error);
      res.status(500).json({ message: 'Internal server error', error: error.message });
    }
  } else {
    res.setHeader('Allow', ['POST']);
    res.status(405).end(`Method ${req.method} Not Allowed`);
  }
}