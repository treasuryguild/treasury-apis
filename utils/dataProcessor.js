// utils/dataProcessor.js
import supabase from '../lib/supabaseClient';

const AGIX_USD_RATE = 0.4; // Hardcoded exchange rate, can be replaced with API call later

let validTokens = new Map(); // Store valid tokens
let projectWallets = new Map(); // Store project wallets

export async function fetchValidTokens() {
  if (validTokens.size === 0) {
    console.log('Fetching valid tokens from database...');
    const { data, error } = await supabase
      .from('tokens')
      .select('policy_id, ticker, coingecko_name')
      .eq('asset_type', 'fungible');

    if (error) {
      console.error('Error fetching tokens:', error);
      throw error;
    }

    validTokens = new Map(data.map(token => [token.policy_id.toLowerCase(), token.ticker.toUpperCase()]));
    // Add valid ADA policy IDs
    validTokens.set('', 'ADA');
    validTokens.set('ada', 'ADA');
    validTokens.set('lovelace', 'ADA');
    console.log('Fetched valid tokens:', Object.fromEntries(validTokens));
  }
  return validTokens;
}

export function isValidToken(policyId, tokens) {
  const lowercasePolicyId = policyId.toLowerCase();
  const isValid = tokens.has(lowercasePolicyId);
  console.log(`Checking if token with policy ID ${lowercasePolicyId} is valid:`, isValid);
  return isValid;
}

export function getTokenTicker(policyId, tokens) {
  return tokens.get(policyId);
}

export async function getValidTokens() {
  return await fetchValidTokens();
}

async function fetchExistingRecognitionIds() {
  const { data, error } = await supabase
    .from('tx_json_generator_data')
    .select('recognition_ids');

  if (error) {
    console.error('Error fetching existing recognitionIds:', error);
    throw error;
  }

  return data.flatMap(row => row.recognition_ids || []);
}

async function isRecognitionIdUnique(recognitionId, existingRecognitionIds) {
  return !existingRecognitionIds.includes(recognitionId);
}

export async function checkForDuplicateRecognitionIds(data) {
  const existingRecognitionIds = await fetchExistingRecognitionIds();
  const duplicateRecognitionIds = [];
  const newRecognitionIds = new Set();

  if (data.tasks) {
    for (const task of Object.values(data.tasks)) {
      if (task.recognitionId) {
        if (existingRecognitionIds.includes(task.recognitionId) || newRecognitionIds.has(task.recognitionId)) {
          duplicateRecognitionIds.push(task.recognitionId);
        } else {
          newRecognitionIds.add(task.recognitionId);
        }
      }
    }
  }

  return { duplicateRecognitionIds, newRecognitionIds: Array.from(newRecognitionIds) };
}

function initializeTransformedData(rawData) {
  return {
    type: "tx",
    title: "Bundle Transaction",
    description: "Created with Catalyst Swarm Treasury Manager Excel",
    outputs: {},
    metadata: {
      "674": {
        mdVersion: ["1.4"],
        msg: [
          "Swarm Treasury System Transaction",
          `Recipients: ${new Set(Object.values(rawData.tasks).map(task => task.walletAddress)).size + 1}`,
          // The token-specific messages will be added dynamically later
          "Transaction made by Treasury Guild ;-)",
          "https://www.treasuryguild.com/"
        ],
        contributions: []
      }
    }
  };
}

function createTokenRegistry(rawData) {
  return Object.fromEntries(
    Object.values(rawData.tokenRegistry).map(token => [token.tokenTicker, token])
  );
}

function createFeeWallets(rawData) {
  console.log("Raw tokenFee data:", rawData.tokenFee);
  const feeWallets = new Map();

  Object.values(rawData.tokenFee).forEach(fee => {
    if (fee.groupName && fee.tokenTicker && fee.fee && fee.walletAddress) {
      const groupName = fee.groupName.trim().toLowerCase();
      const tokenTicker = fee.tokenTicker.trim().toUpperCase();
      
      if (!feeWallets.has(groupName)) {
        feeWallets.set(groupName, new Map());
      }
      
      feeWallets.get(groupName).set(tokenTicker, {
        ...fee,
        groupName: groupName,
        tokenTicker: tokenTicker,
        totalAmount: 0
      });
    }
  });

  console.log("Processed feeWallets:", feeWallets);
  return feeWallets;
}

function calculateQuantity(amount, multiplier) {
  const multiplierValue = parseInt(multiplier);
  const scaledAmount = parseFloat(amount) * Math.pow(10, multiplierValue);
  return Math.round(scaledAmount).toString();
}

function processToken(token, amount, tokenRegistry, tokenTotals, feeWallets) {
  let upperToken = token.toUpperCase();
  let tokenInfo = tokenRegistry[upperToken];
  let adjustedAmount = parseFloat(amount);
  let quantity = amount;

  if (upperToken !== 'USD') {
    quantity = calculateQuantity(amount, tokenInfo.multiplier);
  }

  if (!(upperToken in tokenTotals)) {
    tokenTotals[upperToken] = 0;
  }
  tokenTotals[upperToken] += adjustedAmount;

  if (upperToken in feeWallets) {
    feeWallets[upperToken].totalAmount += adjustedAmount;
  }

  return { upperToken, tokenInfo, quantity, adjustedAmount };
}

function updateOutputs(outputs, walletAddress, tokenInfo, quantity) {
  console.log('Updating outputs:', outputs, 'Wallet:', walletAddress, 'Token:', tokenInfo, 'Quantity:', quantity);
  if (tokenInfo) {
    if (!(walletAddress in outputs)) {
      outputs[walletAddress] = [];
    }
  
    const existingTokenIndex = outputs[walletAddress].findIndex(
      output => output.policyId === tokenInfo.policyId && output.assetName === tokenInfo.assetName
    );
  
    if (existingTokenIndex !== -1) {
      outputs[walletAddress][existingTokenIndex].quantity = 
        (BigInt(outputs[walletAddress][existingTokenIndex].quantity) + BigInt(quantity)).toString();
    } else {
      outputs[walletAddress].push({
        quantity,
        policyId: tokenInfo.policyId,
        assetName: tokenInfo.assetName
      });
    }
  }
}

function splitStringIntoChunks(text, maxLength) {
  const words = text.split(' ');
  const chunks = [];
  let currentChunk = '';

  for (const word of words) {
    if ((currentChunk + ' ' + word).trim().length <= maxLength) {
      currentChunk = (currentChunk + ' ' + word).trim();
    } else {
      if (currentChunk.length > 0) {
        chunks.push(currentChunk);
      }
      currentChunk = word;
    }
  }

  if (currentChunk.length > 0) {
    chunks.push(currentChunk);
  }

  return chunks;
}

function processTask(task, tokenRegistry, tokenTotals, feeWallets, transformedData) {
  const contribution = {
    taskCreator: task.groupName,
    name: splitStringIntoChunks(task.taskName, 55),
    arrayMap: {
      label: task.taskLabels.split(','),
      subGroup: [task.subGroup],
      date: [task.date]
    },
    contributors: {}
  };

  const walletShortcode = task.walletAddress.slice(-6);
  contribution.contributors[walletShortcode] = {};

  for (const [token, amount] of Object.entries(task.tokenT)) {
    if (amount && amount !== "" && token.toUpperCase() !== "USD") {
      const { upperToken, tokenInfo, quantity, adjustedAmount } = processToken(token, amount, tokenRegistry, tokenTotals, feeWallets);

      updateOutputs(transformedData.outputs, task.walletAddress, tokenInfo, quantity);

      contribution.contributors[walletShortcode][upperToken] = adjustedAmount.toString();
    }
  }

  transformedData.metadata["674"].contributions.push(contribution);
}

function processFees(feeWallets, tokenRegistry, transformedData, tokenTotals, tasks) {
  console.log("Starting fee processing...");
  console.log("Fee Wallets:", feeWallets);

  const feeAccumulator = new Map();

  // Iterate through the tasks
  for (const task of Object.values(tasks)) {
    const taskGroupName = task.groupName.trim().toLowerCase();
    console.log(`Processing task with group: ${taskGroupName}`);

    // Get all fee configurations for this group
    const groupFeeConfigs = feeWallets.get(taskGroupName);

    if (!groupFeeConfigs) {
      console.log(`No fee configurations found for group: ${taskGroupName}`);
      continue;
    }

    // For each task, iterate over all tokens in the task's tokenT
    for (const [taskToken, taskAmount] of Object.entries(task.tokenT)) {
      const taskTokenTicker = taskToken.trim().toUpperCase();
      const parsedAmount = parseFloat(taskAmount);
      if (!isNaN(parsedAmount) && parsedAmount > 0) {
        console.log(`Checking token ${taskTokenTicker} in task...`);

        // Check if there's a fee configuration for this token
        const feeInfo = groupFeeConfigs.get(taskTokenTicker);

        if (feeInfo) {
          console.log(`Match found for group ${taskGroupName} and token ${taskTokenTicker}`);

          // Calculate the fee based on taskAmount for this token
          const feePercentage = parseFloat(feeInfo.fee.replace(',', '.')) / 100;
          const exactFeeAmount = parsedAmount * feePercentage;

          // Accumulate the fee
          if (!feeAccumulator.has(taskTokenTicker)) {
            feeAccumulator.set(taskTokenTicker, { total: 0, feeInfo });
          }
          feeAccumulator.get(taskTokenTicker).total += exactFeeAmount;

          console.log(`Accumulated fee: ${exactFeeAmount} ${taskTokenTicker} for group: ${taskGroupName}`);
        } else {
          console.log(`No fee configuration found for token ${taskTokenTicker} in group ${taskGroupName}`);
        }
      } else {
        console.log(`Skipping token ${taskTokenTicker} due to invalid amount: ${taskAmount}`);
      }
    }
  }

  // Process accumulated fees
  for (const [tokenTicker, { total, feeInfo }] of feeAccumulator) {
    // Round the total fee amount and ensure minimum of 1
    let roundedFeeAmount = Math.max(1, Math.round(total));

    // Retrieve the corresponding tokenInfo
    const tokenInfoKey = Object.keys(tokenRegistry).find(
      key => tokenRegistry[key].tokenTicker.toUpperCase() === tokenTicker
    );
    const tokenInfo = tokenRegistry[tokenInfoKey];

    if (!tokenInfo) {
      console.error(`Token information for ${tokenTicker} not found in tokenRegistry.`);
      continue;
    }

    const feeQuantity = calculateQuantity(roundedFeeAmount.toString(), tokenInfo.multiplier);

    // Update outputs for the wallet receiving the fee
    updateOutputs(transformedData.outputs, feeInfo.walletAddress, tokenInfo, feeQuantity);

    // Accumulate the fee into tokenTotals
    if (!(tokenTicker in tokenTotals)) {
      tokenTotals[tokenTicker] = 0;
    }
    tokenTotals[tokenTicker] += roundedFeeAmount;

    const currentDate = new Date();
    const formattedDate = `${String(currentDate.getDate()).padStart(2, '0')}.${String(currentDate.getMonth() + 1).padStart(2, '0')}.${currentDate.getFullYear()}`;

    // Add contribution entry for the fee
    const feeContribution = {
      name: [`${feeInfo.groupName} contribution handling fee`],
      arrayMap: {
        date: [formattedDate],
        label: ["Operations"],
        subGroup: ["Treasury Guild"]
      },
      taskCreator: [feeInfo.groupName],
      contributors: {
        [feeInfo.walletAddress.slice(-6)]: {
          [tokenTicker]: roundedFeeAmount.toFixed(2)
        }
      }
    };

    transformedData.metadata["674"].contributions.push(feeContribution);

    // Log success
    console.log(`Total fee added: ${roundedFeeAmount} ${tokenTicker} for group: ${feeInfo.groupName}`);
  }

  console.log("Fee processing complete.");
}

function updateMetadataMessages(tokenTotals, transformedData, exchangeRates) {
  const tokenMessages = Object.entries(tokenTotals).map(([token, total]) => {
    const rate = exchangeRates[token.toLowerCase()];
    if (rate && token !== 'USD') {
      const usdValue = total * rate;
      return `${usdValue.toFixed(2)} USD in ${total.toFixed(2)} ${token}`;
    }
  }).filter(Boolean); // Remove any undefined entries

  // Insert the token messages after the "Recipients" message
  transformedData.metadata["674"].msg.splice(2, 0, ...tokenMessages);
}

async function fetchProjectWallets() {
  if (projectWallets.size === 0) {
    console.log('Fetching project wallets from database...');
    const { data, error } = await supabase
      .from('projects')
      .select('project_name, wallet');

    if (error) {
      console.error('Error fetching project wallets:', error);
      throw error;
    }

    projectWallets = new Map(data.map(project => [project.project_name.toLowerCase(), project.wallet]));
    console.log('Fetched project wallets:', Object.fromEntries(projectWallets));
  }
  return projectWallets;
}

function determineProjectWallet(taskCreator) {
  const lowerTaskCreator = taskCreator.toLowerCase();
  
  // CASE statement to match taskCreator with project_name
  const projectName = (() => {
    switch (lowerTaskCreator) {
      case 'singularitynet':
        return 'singularity net ambassador wallet';
      case 'singularitynet,governance guild':
        return 'singularity net ambassador wallet';
      case 'treasury guild':
        return 'test wallet';
      case 'intersect':
        return 'swarm treasury wallet';
      case 'catalyst swarm':
        return 'swarm treasury wallet';
      case 'governance guild':
        return 'gg treasury wallet'
      // Add more cases as needed
      default:
        return lowerTaskCreator; // Use the taskCreator as is if no match
    }
  })();

  return projectWallets.get(projectName) || null;
}

export async function transformData(rawData) {
  await fetchValidTokens();

  const transformedData = initializeTransformedData(rawData);
  const tokenRegistry = createTokenRegistry(rawData);
  const feeWallets = createFeeWallets(rawData);
  const tokenTotals = {};

  for (const task of Object.values(rawData.tasks)) {
    processTask(task, tokenRegistry, tokenTotals, feeWallets, transformedData);
  }

  processFees(feeWallets, tokenRegistry, transformedData, tokenTotals, rawData.tasks); // Pass tokenTotals to accumulate fees
  updateMetadataMessages(tokenTotals, transformedData, rawData.exchangeRates);

  return transformedData;
}

async function processData(transformedData) {
  // Add any additional processing logic here if needed
  return {
    ...transformedData,
    processed: true,
    processingTimestamp: new Date().toISOString()
  };
}

export async function processAndInsertData(rawData) {
  try {
    await fetchValidTokens();
    await fetchProjectWallets();

    const { duplicateRecognitionIds, newRecognitionIds } = await checkForDuplicateRecognitionIds(rawData);
    if (duplicateRecognitionIds.length > 0) {
      throw new Error(`Duplicate recognitionIds detected: ${duplicateRecognitionIds.join(', ')}`);
    }

    const transformedData = await transformData(rawData);
    const processedData = await processData(transformedData);
    const taskCreator = Object.values(rawData.tasks)[0].groupName; 
    const projectWallet = determineProjectWallet(taskCreator);

    const { data: insertedData, error } = await supabase
      .from('tx_json_generator_data')
      .insert({
        raw_data: rawData,
        processed_data: processedData,
        reward_status: false,
        recognition_ids: newRecognitionIds,
        project_wallet: projectWallet
      })
      .select();

    if (error) throw error;

    return {
      insertedData: insertedData[0],
      rawData,
      processedData
    };
  } catch (error) {
    console.error('Error processing and inserting data:', error);
    throw error;
  }
}