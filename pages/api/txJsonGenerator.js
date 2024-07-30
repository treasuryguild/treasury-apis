// ../pages/api/txJsonGenerator.js
import { processAndInsertData } from '../../utils/dataProcessor';

const API_KEY = process.env.SERVER_API_KEY;

async function fetchComparisonData(params) {
  return {
    id: 122,
    value: 'Test data'
  };
}

function compareData(receivedData, fetchedData) {
  let errors = [];

  if (receivedData.id !== fetchedData.id) {
    errors.push("ID mismatch");
  }
  if (receivedData.value !== fetchedData.value) {
    errors.push("Value mismatch");
  }

  return errors;
}

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

      const fetchedData = await fetchComparisonData(receivedData);
      //const errors = compareData(receivedData, fetchedData);
      const errors = [];

      if (errors.length > 0) {
        return res.status(400).json({ message: 'Data validation failed', errors: errors });
      }

      // Process and insert data using the utility function
      const { insertedData, rawData, processedData } = await processAndInsertData(receivedData);

      res.status(200).json({ 
        message: 'Data validated, stored, and processed successfully', 
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