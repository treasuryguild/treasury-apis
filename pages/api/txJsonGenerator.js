// pages/api/txJsonGenerator.js

import axios from 'axios';

const API_KEY = process.env.SERVER_API_KEY; 

// This function simulates fetching data from another source
// Replace this with your actual data fetching logic
async function fetchComparisonData(params) {
  // Simulating an API call
  // Replace this with actual data source
  //const response = await axios.get('https://api.example.com/data', { params });
  //return response.data;
  return {
    id: 122,
    value: 'Test data'
  };
}

function compareData(receivedData, fetchedData) {
  let errors = [];

  // Implement your comparison logic here
  // This is a simple example - adjust according to your specific needs
  if (receivedData.id !== fetchedData.id) {
    errors.push("ID mismatch");
  }
  if (receivedData.value !== fetchedData.value) {
    errors.push("Value mismatch");
  }
  // Add more comparisons as needed

  return errors;
}

export default async function handler(req, res) {
  // Check for API key
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ') || authHeader.split(' ')[1] !== API_KEY) {
    return res.status(401).json({ message: 'Unauthorized' });
  }

  if (req.method === 'POST') {
    try {
      // Process the received data
      const receivedData = req.body;
      console.log('Received data:', receivedData);

      // Fetch comparison data
      const fetchedData = await fetchComparisonData(receivedData);

      // Compare the data
      //const errors = compareData(receivedData, fetchedData);
      const errors = [];

      if (errors.length === 0) {
        // No errors, data is correct
        res.status(200).json({ message: 'Data is correct', data: receivedData });
      } else {
        // Errors found
        res.status(400).json({ message: 'Data validation failed', errors: errors });
      }
    } catch (error) {
      console.error('Error processing request:', error);
      res.status(500).json({ message: 'Internal server error', error: error.message });
    }
  } else {
    // Handle any other HTTP method
    res.setHeader('Allow', ['POST']);
    res.status(405).end(`Method ${req.method} Not Allowed`);
  }
}