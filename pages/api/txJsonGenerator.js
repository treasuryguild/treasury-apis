// ../pages/api/txJsonGenerator.js
import { processAndInsertData } from '../../utils/dataProcessor';
import supabase from '../../lib/supabaseClient';

const API_KEY = process.env.SERVER_API_KEY;
const TESTING_MODE = false; // Set this to false to disable testing mode

// Hardcoded array of existing taskIds (for demonstration purposes)
const existingTaskIds = ['50216', '50217', '11994'];

// Helper functions for error checks (to be implemented later)
const isTaskIdUnique = (taskId) => !existingTaskIds.includes(taskId);
const isValidTokenTicker = (ticker) => ['AGIX', 'ADA', 'GMBL', 'MINS', 'GOVWG'].includes(ticker.toUpperCase());
const isValidWalletAddress = (address) => address.startsWith('addr1') && address.length === 103;

function validateData(data) {
  const errors = [];

  // Check if required fields are present
  if (!data.tokenRegistry || !data.tokenFee || !data.tasks) {
    errors.push({ code: 'MISSING_REQUIRED_FIELDS', message: 'Missing required fields: tokenRegistry, tokenFee, or tasks' });
  }

  // Validate tasks
  if (data.tasks) {
    Object.values(data.tasks).forEach((task, index) => {
      if (!task.taskId) {
        errors.push({ code: 'MISSING_TASK_ID', message: `Task at index ${index} is missing taskId` });
      }

      if (!isValidWalletAddress(task.walletAddress)) {
        errors.push({ code: 'INVALID_WALLET_ADDRESS', message: `Invalid wallet address for task ${task.taskId}` });
      }

      // Validate token amounts
      if (task.tokenT) {
        Object.entries(task.tokenT).forEach(([token, amount]) => {
          if (amount && !isValidTokenTicker(token)) {
            errors.push({ code: 'INVALID_TOKEN_TICKER', message: `Invalid token ticker ${token} for task ${task.taskId}` });
          }
        });
      }
    });
  }

  return errors;
}

function checkForDuplicateTaskIds(data) {
  const duplicateTaskIds = [];
  if (data.tasks) {
    Object.values(data.tasks).forEach((task) => {
      if (task.taskId && !isTaskIdUnique(task.taskId)) {
        duplicateTaskIds.push(task.taskId);
      }
    });
  }
  return duplicateTaskIds;
}

export default async function handler(req, res) {
  // Check for API key
  const apiKey = req.headers['api_key'];
  if (!apiKey || apiKey !== API_KEY) {
    return res.status(401).json({ message: 'Unauthorized: Invalid or missing API key' });
  }

  if (req.method !== 'POST') {
    res.setHeader('Allow', ['POST']);
    return res.status(405).json({ message: `Method ${req.method} Not Allowed` });
  }

  try {
    let receivedData = req.body;
    console.log('Received data:', receivedData);

    // Parse string to JSON if necessary
    if (typeof receivedData === 'string') {
      try {
        receivedData = JSON.parse(receivedData);
      } catch (parseError) {
        return res.status(400).json({ message: 'Bad Request: Invalid JSON string', error: parseError.message });
      }
    }

    // Check if receivedData is an object
    if (typeof receivedData !== 'object' || receivedData === null) {
      return res.status(400).json({ message: 'Bad Request: Invalid data format. Expected an object or a valid JSON string.' });
    }

    // Check for duplicate taskIds
    const duplicateTaskIds = checkForDuplicateTaskIds(receivedData);
    if (duplicateTaskIds.length > 0) {
      return res.status(409).json({ 
        message: 'Conflict: Duplicate taskIds detected', 
        duplicateTaskIds: duplicateTaskIds 
      });
    }

    // Validate the data
    const validationErrors = validateData(receivedData);
    if (validationErrors.length > 0) {
      return res.status(422).json({ message: 'Unprocessable Entity: Data validation failed', errors: validationErrors });
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
        processedData: processedData
      });
    }

  } catch (error) {
    console.error('Error processing request:', error);
    res.status(500).json({ message: 'Internal Server Error', error: error.message });
  }
}