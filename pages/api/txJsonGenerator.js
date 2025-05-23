// ../pages/api/txJsonGenerator.js
import { processAndInsertData, isValidToken, getValidTokens, checkForDuplicateRecognitionIds } from '../../utils/dataProcessor';
import supabase from '../../lib/supabaseClient';

const API_KEY = process.env.SERVER_API_KEY;
const TESTING_MODE = false; // Set this to false to disable testing mode

// Helper function for wallet address validation
const isValidWalletAddress = (address) => address.startsWith('addr1') && address.length === 103;

// Helper function to convert string numbers to actual numbers
function convertToNumber(value) {
  if (typeof value === 'string') {
    // Handle string values by replacing comma with point and converting to number
    return parseFloat(value.replace(',', '.'));
  } else if (typeof value === 'number') {
    // Numbers are already in the right format
    return value;
  } else if (value === '') {
    // Empty strings should be converted to 0
    return 0;
  } else {
    // Handle any other type by converting to number
    return Number(value);
  }
}

async function validateData(data) {
  const errors = [];
  const validTokens = await getValidTokens();

  console.log('Valid tokens from database:', Object.fromEntries(validTokens));
  console.log('Received tokenRegistry:', data.tokenRegistry);

  // Check if required fields are present
  if (!data.tokenRegistry || !data.tokenFee || !data.tasks) {
    errors.push({
      code: 'MISSING_REQUIRED_FIELDS',
      message: 'Missing required fields: tokenRegistry, tokenFee, or tasks',
      recognitionIds: []
    });
  }

  // Validate tokenRegistry
  for (const [, tokenInfo] of Object.entries(data.tokenRegistry)) {
    const policyId = tokenInfo.policyId.toLowerCase();
    if (tokenInfo.tokenTicker.toUpperCase() === 'ADA') {
      if (policyId !== '' && policyId !== 'ada' && policyId !== 'lovelace') {
        errors.push({
          code: 'INVALID_ADA_POLICY_ID',
          message: `Invalid ADA policy ID: ${policyId}. Should be empty or 'ada'.`,
          recognitionIds: []
        });
      }
    } else if (!isValidToken(policyId, validTokens)) {
      errors.push({
        code: 'INVALID_TOKEN',
        message: `Invalid token ${tokenInfo.tokenTicker} (Policy ID: ${policyId}) in tokenRegistry`,
        recognitionIds: []
      });
    }
  }

  // Convert exchange rates to numbers
  if (data.exchangeRates) {
    Object.keys(data.exchangeRates).forEach(key => {
      data.exchangeRates[key] = convertToNumber(data.exchangeRates[key]);
    });
  }

  // Convert fee values to numbers
  if (data.tokenFee) {
    Object.values(data.tokenFee).forEach(fee => {
      if (fee) {
        fee.fee = convertToNumber(fee.fee);
      }
    });
  }

  // Convert token registry numeric values
  if (data.tokenRegistry) {
    Object.values(data.tokenRegistry).forEach(token => {
      if (token) {
        token.multiplier = convertToNumber(token.multiplier);
      }
    });
  }

  // Convert task token values
  if (data.tasks) {
    Object.values(data.tasks).forEach(task => {
      if (task && task.tokenT) {
        Object.keys(task.tokenT).forEach(token => {
          task.tokenT[token] = convertToNumber(task.tokenT[token]);
        });
      }
    });
  }

  // Validate tasks
  if (data.tasks) {
    const taskSet = new Map();
    for (const task of Object.values(data.tasks)) {
      if (!task.recognitionId) {
        errors.push({
          code: 'MISSING_RECOGNITION_ID',
          message: `Task is missing recognitionId`,
          recognitionIds: []
        });
      }

      if (!isValidWalletAddress(task.walletAddress)) {
        errors.push({
          code: 'INVALID_WALLET_ADDRESS',
          message: `Invalid wallet address for task ${task.recognitionId}`,
          recognitionIds: [task.recognitionId]
        });
      }

      // Check for duplicate tasks
      const taskKey = `${task.taskName}|${task.date}|${task.proofLink}|${task.walletOwner}`;
      if (taskSet.has(taskKey)) {
        const duplicateTask = taskSet.get(taskKey);
        errors.push({
          code: 'DUPLICATE_RECOGNITION',
          message: `Recognitions have the same name, date, walletOwner and prooflink`,
          recognitionIds: [duplicateTask.recognitionId, task.recognitionId]
        });
      } else {
        taskSet.set(taskKey, task);
      }

      // Validate token amounts
      if (task.tokenT) {
        for (const [token, amount] of Object.entries(task.tokenT)) {
          if (amount !== undefined && amount !== "" && token.toLowerCase() !== 'usd') {
            const upperToken = token.toUpperCase();
            const tokenInfo = data.tokenRegistry[Object.keys(data.tokenRegistry).find(key => data.tokenRegistry[key].tokenTicker.toUpperCase() === upperToken)];
            console.log('Token:', token, 'Amount:', amount, 'Token Info:', tokenInfo);

            if (!tokenInfo) {
              errors.push({
                code: 'MISSING_TOKEN_INFO',
                message: `Missing token info for ${token} in task ${task.recognitionId}`,
                recognitionIds: [task.recognitionId]
              });
            } else {
              const policyId = tokenInfo.policyId.toLowerCase();
              console.log(`Checking policy ID: ${policyId} for token ${upperToken}`);
              if (!isValidToken(policyId, validTokens)) {
                errors.push({
                  code: 'INVALID_TOKEN',
                  message: `Invalid token ${upperToken} (Policy ID: ${policyId}) for task ${task.recognitionId}`,
                  recognitionIds: [task.recognitionId]
                });
              }
            }
          }
        }
      }
    }
  }

  return errors;
}

async function insertRawDataWithErrors(receivedData, errors, newRecognitionIds = null) {
  const { data: insertedRawData, error: insertError } = await supabase
    .from('tx_json_generator_data')
    .insert({
      raw_data: receivedData,
      reward_status: errors.length === 0 ? false : null,
      recognition_ids: errors.length === 0 ? newRecognitionIds : null,
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
      errors: [{
        code: 'UNAUTHORIZED',
        message: 'Invalid or missing API key',
        recognitionIds: []
      }],
      message: 'Unauthorized: Invalid or missing API key'
    });
  }

  if (req.method !== 'POST') {
    res.setHeader('Allow', ['POST']);
    return res.status(405).json({
      errors: [{
        code: 'METHOD_NOT_ALLOWED',
        message: `Method ${req.method} Not Allowed`,
        recognitionIds: []
      }],
      message: `Method ${req.method} Not Allowed`
    });
  }

  try {
    let receivedData = req.body;
    console.log('Received data:', receivedData);

    // Parse string to JSON if necessary
    if (typeof receivedData === 'string') {
      try {
        // First unescape any escaped quotes
        const unescapedData = receivedData.replace(/\\"/g, '"');
        receivedData = JSON.parse(unescapedData);
      } catch (parseError) {
        await insertRawDataWithErrors(req.body, [{
          code: 'INVALID_JSON',
          message: 'Invalid JSON string',
          recognitionIds: []
        }]);
        return res.status(400).json({
          errors: [{
            code: 'INVALID_JSON',
            message: 'Invalid JSON string',
            recognitionIds: []
          }],
          message: 'Bad Request: Invalid JSON string'
        });
      }
    }

    // Check if receivedData is an object
    if (typeof receivedData !== 'object' || receivedData === null) {
      await insertRawDataWithErrors(receivedData, [{
        code: 'INVALID_DATA_FORMAT',
        message: 'Invalid data format. Expected an object or a valid JSON string.',
        recognitionIds: []
      }]);
      return res.status(400).json({
        errors: [{
          code: 'INVALID_DATA_FORMAT',
          message: 'Invalid data format. Expected an object or a valid JSON string.',
          recognitionIds: []
        }],
        message: 'Bad Request: Invalid data format. Expected an object or a valid JSON string.'
      });
    }

    // Check for duplicate recognitionIds
    const { duplicateRecognitionIds, newRecognitionIds } = await checkForDuplicateRecognitionIds(receivedData);
    if (duplicateRecognitionIds.length > 0) {
      const errors = [{
        code: 'DUPLICATE_RECOGNITION_ID',
        message: `Recognition IDs were already used in previous transactions`,
        recognitionIds: duplicateRecognitionIds
      }];
      await insertRawDataWithErrors(receivedData, errors);
      return res.status(409).json({
        errors: errors,
        message: 'Conflict: Duplicate recognitionIds detected'
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
      const insertedRawData = await insertRawDataWithErrors(receivedData, [], newRecognitionIds);
      return res.status(200).json({
        message: 'Raw data inserted successfully (Testing Mode)',
        rawData: insertedRawData[0].raw_data,
        newRecognitionIds: newRecognitionIds
      });
    } else {
      // Process and insert data using the utility function
      const { insertedData, rawData, processedData } = await processAndInsertData(receivedData);
      console.log('Processed data:', processedData);
      res.status(200).json({
        message: 'Data validated, transformed, stored, and processed successfully'
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