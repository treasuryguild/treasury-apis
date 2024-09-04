// ../pages/api/txJsonGenerator.js
import { processAndInsertData, isValidToken, getValidTokens, checkForDuplicateTaskIds } from '../../utils/dataProcessor';
import supabase from '../../lib/supabaseClient';

const API_KEY = process.env.SERVER_API_KEY;
const TESTING_MODE = false; // Set this to false to disable testing mode

// Helper function for wallet address validation
const isValidWalletAddress = (address) => address.startsWith('addr1') && address.length === 103;

async function validateData(data) {
  const errors = [];
  const validTokens = await getValidTokens();

  console.log('Valid tokens from database:', Object.fromEntries(validTokens));
  console.log('Received tokenRegistry:', data.tokenRegistry);

  // Check if required fields are present
  if (!data.tokenRegistry || !data.tokenFee || !data.tasks) {
    errors.push({ code: 'MISSING_REQUIRED_FIELDS', message: 'Missing required fields: tokenRegistry, tokenFee, or tasks' });
  }

  // Validate tokenRegistry
  for (const [, tokenInfo] of Object.entries(data.tokenRegistry)) {
    const policyId = tokenInfo.policyId.toLowerCase();
    if (tokenInfo.tokenTicker.toUpperCase() === 'ADA') {
      if (policyId !== '' && policyId !== 'ada' && policyId !== 'lovelace') {
        errors.push({ code: 'INVALID_ADA_POLICY_ID', message: `Invalid ADA policy ID: ${policyId}. Should be empty or 'ada'.` });
      }
    } else if (!isValidToken(policyId, validTokens)) {
      errors.push({ code: 'INVALID_TOKEN', message: `Invalid token ${tokenInfo.tokenTicker} (Policy ID: ${policyId}) in tokenRegistry` });
    }
  }

  // Validate tasks
  if (data.tasks) {
    for (const task of Object.values(data.tasks)) {
      if (!task.taskId) {
        errors.push({ code: 'MISSING_TASK_ID', message: `Task is missing taskId` });
      }

      if (!isValidWalletAddress(task.walletAddress)) {
        errors.push({ code: 'INVALID_WALLET_ADDRESS', message: `Invalid wallet address for task ${task.taskId}` });
      }

      // Validate token amounts
      if (task.tokenT) {
        for (const [token, amount] of Object.entries(task.tokenT)) {
          if (amount !== undefined && amount !== "" && token.toLowerCase() !== 'usd') {
            const upperToken = token.toUpperCase();
            const tokenInfo = data.tokenRegistry[Object.keys(data.tokenRegistry).find(key => data.tokenRegistry[key].tokenTicker.toUpperCase() === upperToken)];
            console.log('Token:', token, 'Amount:', amount, 'Token Info:', tokenInfo);
            
            if (!tokenInfo) {
              errors.push({ code: 'MISSING_TOKEN_INFO', message: `Missing token info for ${token} in task ${task.taskId}` });
            } else {
              const policyId = tokenInfo.policyId.toLowerCase();
              console.log(`Checking policy ID: ${policyId} for token ${upperToken}`);
              if (!isValidToken(policyId, validTokens)) {
                errors.push({ code: 'INVALID_TOKEN', message: `Invalid token ${upperToken} (Policy ID: ${policyId}) for task ${task.taskId}` });
              }
            }
          }
        }
      }
    }
  }

  return errors;
}

async function insertRawDataWithErrors(receivedData, errors, newTaskIds = null) {
  const { data: insertedRawData, error: insertError } = await supabase
    .from('tx_json_generator_data')
    .insert({
      raw_data: receivedData,
      reward_status: errors.length === 0 ? false : null,
      task_ids: errors.length === 0 ? newTaskIds : null,
      errors: errors.length > 0 ? errors : null
    })
    .select();

  if (insertError) {
    throw insertError;
  }

  return insertedRawData;
}

export default async function handler(req, res) {
  // Check for API key
  const apiKey = req.headers['api_key'];
  if (!apiKey || apiKey !== API_KEY) {
    return res.status(401).json({ 
      errors: [{ code: 'UNAUTHORIZED', message: 'Invalid or missing API key' }],
      message: 'Unauthorized: Invalid or missing API key'
    });
  }

  if (req.method !== 'POST') {
    res.setHeader('Allow', ['POST']);
    return res.status(405).json({ 
      errors: [{ code: 'METHOD_NOT_ALLOWED', message: `Method ${req.method} Not Allowed` }],
      message: `Method ${req.method} Not Allowed`
    });
  }

  try {
    let receivedData = req.body;
    console.log('Received data:', receivedData);

    // Parse string to JSON if necessary
    function safeJsonParse(input) {
      try {
        return JSON.parse(input);
      } catch (error) {
        // Attempt to handle some common errors, like misformatted numbers or commas
        console.error("JSON parsing error:", error);
        return null; // Return null if parsing fails
      }
    }
    
    if (typeof receivedData === 'string') {
      receivedData = safeJsonParse(receivedData);
      
      if (!receivedData) {
        await insertRawDataWithErrors(req.body, [{ code: 'INVALID_JSON', message: 'Invalid JSON string' }]);
        return res.status(400).json({
          errors: [{ code: 'INVALID_JSON', message: 'Invalid JSON string' }],
          message: 'Bad Request: Invalid JSON string'
        });
      }
    }
    

    // Check if receivedData is an object
    if (typeof receivedData !== 'object' || receivedData === null) {
      await insertRawDataWithErrors(receivedData, [{ code: 'INVALID_DATA_FORMAT', message: 'Invalid data format. Expected an object or a valid JSON string.' }]);
      return res.status(400).json({ 
        errors: [{ code: 'INVALID_DATA_FORMAT', message: 'Invalid data format. Expected an object or a valid JSON string.' }],
        message: 'Bad Request: Invalid data format. Expected an object or a valid JSON string.'
      });
    }

    // Check for duplicate taskIds
    const { duplicateTaskIds, newTaskIds } = await checkForDuplicateTaskIds(receivedData);
    if (duplicateTaskIds.length > 0) {
      const errors = duplicateTaskIds.map(taskId => ({ 
        code: 'DUPLICATE_TASK_ID', 
        message: `Duplicate taskId detected: ${taskId}` 
      }));
      await insertRawDataWithErrors(receivedData, errors);
      return res.status(409).json({ 
        errors: errors,
        message: 'Conflict: Duplicate taskIds detected'
      });
    }

    // Validate the data
    const validationErrors = await validateData(receivedData);
    if (validationErrors.length > 0) {
      await insertRawDataWithErrors(receivedData, validationErrors);
      return res.status(422).json({ 
        errors: validationErrors,
        message: 'Unprocessable Entity: Data validation failed'
      });
    }

    if (TESTING_MODE) {
      // Insert only the raw data for testing purposes
      const insertedRawData = await insertRawDataWithErrors(receivedData, [], newTaskIds);
      return res.status(200).json({
        message: 'Raw data inserted successfully (Testing Mode)',
        rawData: insertedRawData[0].raw_data,
        newTaskIds: newTaskIds
      });
    } else {
      // Process and insert data using the utility function
      const { insertedData, rawData, processedData } = await processAndInsertData(receivedData);

      res.status(200).json({ 
        message: 'Data validated, transformed, stored, and processed successfully',
        processedData: processedData,
        newTaskIds: newTaskIds
      });
    }

  } catch (error) {
    console.error('Error processing request:', error);
    
    // Attempt to insert raw data with error information
    try {
      await insertRawDataWithErrors(req.body, [{ code: 'INTERNAL_SERVER_ERROR', message: error.message }]);
      res.status(500).json({
        errors: [{ code: 'INTERNAL_SERVER_ERROR', message: error.message }],
        message: 'Internal Server Error: Raw data stored with error information'
      });
    } catch (insertError) {
      console.error('Error storing raw data with error information:', insertError);
      res.status(500).json({
        errors: [{ code: 'INTERNAL_SERVER_ERROR', message: 'Failed to process and store data' }],
        message: 'Internal Server Error: Failed to process and store data'
      });
    }
  }
}