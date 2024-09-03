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

async function fetchExistingTaskIds() {
  const { data, error } = await supabase
    .from('tx_json_generator_data')
    .select('task_ids');

  if (error) {
    console.error('Error fetching existing taskIds:', error);
    throw error;
  }

  return data.flatMap(row => row.task_ids || []);
}

async function isTaskIdUnique(taskId, existingTaskIds) {
  return !existingTaskIds.includes(taskId);
}

export async function checkForDuplicateTaskIds(data) {
  const existingTaskIds = await fetchExistingTaskIds();
  const duplicateTaskIds = [];
  const newTaskIds = new Set();

  if (data.tasks) {
    for (const task of Object.values(data.tasks)) {
      if (task.taskId) {
        if (existingTaskIds.includes(task.taskId) || newTaskIds.has(task.taskId)) {
          duplicateTaskIds.push(task.taskId);
        } else {
          newTaskIds.add(task.taskId);
        }
      }
    }
  }

  return { duplicateTaskIds, newTaskIds: Array.from(newTaskIds) };
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
          `Recipients: ${Object.keys(rawData.tasks).length}`,
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
  return Object.fromEntries(
    Object.values(rawData.tokenFee)
      .filter(fee => fee.tokenTicker !== "") // Filter out empty entries
      .map(fee => [fee.tokenTicker, { ...fee, totalAmount: 0 }])
  );
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

function processTask(task, tokenRegistry, tokenTotals, feeWallets, transformedData) {
  const contribution = {
    taskCreator: task.groupName,
    name: [task.taskName],
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

function processFees(feeWallets, tokenRegistry, transformedData) {
  for (const [token, feeInfo] of Object.entries(feeWallets)) {
    if (feeInfo.totalAmount > 0) {
      const feeAmount = feeInfo.totalAmount * (parseFloat(feeInfo.fee.replace(',', '.')) / 100);
      const tokenInfo = tokenRegistry[token];
      const feeQuantity = calculateQuantity(feeAmount.toString(), tokenInfo.multiplier);

      updateOutputs(transformedData.outputs, feeInfo.walletAddress, tokenInfo, feeQuantity);

      const currentDate = new Date();
      const formattedDate = `${String(currentDate.getDate()).padStart(2, '0')}.${String(currentDate.getMonth() + 1).padStart(2, '0')}.${currentDate.getFullYear()}`;

      const feeContribution = {
        name: [`${feeInfo.groupName.toLowerCase()} contribution handling fee`],
        arrayMap: {
          date: [formattedDate],
          label: ["Operations"],
          subGroup: ["Treasury Guild"]
        },
        taskCreator: [feeInfo.groupName],
        contributors: {
          [feeInfo.walletAddress.slice(-6)]: {
            [token]: feeAmount.toFixed(2)
          }
        }
      };

      transformedData.metadata["674"].contributions.push(feeContribution);
    }
  }
}

function updateMetadataMessages(tokenTotals, transformedData, exchangeRates) {
  const tokenMessages = Object.entries(tokenTotals).map(([token, total]) => {
    const rate = exchangeRates[token.toLowerCase()] || 0;
    const usdValue = total * rate;
    
    if (token !== 'USD') {
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

  processFees(feeWallets, tokenRegistry, transformedData);
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
    await fetchValidTokens(); // Ensure valid tokens are fetched before processing
    await fetchProjectWallets(); // Fetch project wallets

    // Check for duplicate taskIds
    const { duplicateTaskIds, newTaskIds } = await checkForDuplicateTaskIds(rawData);
    if (duplicateTaskIds.length > 0) {
      throw new Error(`Duplicate taskIds detected: ${duplicateTaskIds.join(', ')}`);
    }

    // Transform the raw data
    const transformedData = await transformData(rawData);

    // Process the transformed data
    const processedData = await processData(transformedData);

    // Determine the project wallet based on the task creator
    const taskCreator = Object.values(rawData.tasks)[0].groupName; 
    const projectWallet = determineProjectWallet(taskCreator);

    // Insert both raw and processed data into Supabase
    const { data: insertedData, error } = await supabase
      .from('tx_json_generator_data')
      .insert({
        raw_data: rawData,
        processed_data: processedData,
        reward_status: false,
        task_ids: newTaskIds,
        project_wallet: projectWallet // Add the project wallet to the insertion
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