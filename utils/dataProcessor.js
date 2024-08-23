// utils/dataProcessor.js
import supabase from '../lib/supabaseClient';

const AGIX_USD_RATE = 0.4; // Hardcoded exchange rate, can be replaced with API call later

let validTokens = new Map(); // Store valid tokens

export async function fetchValidTokens() {
  if (validTokens.size === 0) {
    console.log('Fetching valid tokens from database...');
    const { data, error } = await supabase
      .from('tokens')
      .select('policy_id, ticker')
      .eq('asset_type', 'fungible');

    if (error) {
      console.error('Error fetching tokens:', error);
      throw error;
    }

    validTokens = new Map(data.map(token => [token.policy_id.toLowerCase(), token.ticker.toUpperCase()]));
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
          "Treasury Guild Bulk Transaction",
          `Recipients: ${Object.keys(rawData.tasks).length}`,
          "", "", "", // These will be updated dynamically
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

  if (upperToken === 'USD') {
    const agixAmount = adjustedAmount / AGIX_USD_RATE;
    quantity = calculateQuantity(agixAmount.toString(), tokenRegistry['AGIX'].multiplier);
    upperToken = 'AGIX';
    tokenInfo = tokenRegistry['AGIX'];
    adjustedAmount = agixAmount;
  } else {
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

  let agixTotal = 0;
  let usdTotal = 0;

  for (const [token, amount] of Object.entries(task.tokenT)) {
    if (amount && amount !== "") {
      const { upperToken, tokenInfo, quantity, adjustedAmount } = processToken(token, amount, tokenRegistry, tokenTotals, feeWallets);

      if (upperToken === 'USD') {
        usdTotal += parseFloat(amount);
      } else if (upperToken === 'AGIX') {
        agixTotal += adjustedAmount;
      }

      updateOutputs(transformedData.outputs, task.walletAddress, tokenInfo, quantity);

      if (upperToken === 'AGIX') {
        contribution.contributors[walletShortcode][upperToken] = (agixTotal + (usdTotal / AGIX_USD_RATE)).toFixed(2);
      } else {
        contribution.contributors[walletShortcode][upperToken] = adjustedAmount.toString();
      }
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

function updateMetadataMessages(tokenTotals, transformedData) {
  let msgIndex = 2;
  for (const [token, total] of Object.entries(tokenTotals)) {
    if (token === 'AGIX') {
      transformedData.metadata["674"].msg[msgIndex] = `${(total * AGIX_USD_RATE).toFixed(2)} USD in ${total.toFixed(2)} ${token}`;
    } else if (token === 'ADA') {
      transformedData.metadata["674"].msg[msgIndex] = `${total.toFixed(2)} USD in ${total.toFixed(2)} ${token}`;
    } else {
      transformedData.metadata["674"].msg[msgIndex] = `0 USD in ${total.toFixed(2)} ${token}`;
    }
    msgIndex++;
  }
}

export async function transformData(rawData) {
  await fetchValidTokens(); // Fetch valid tokens before processing

  const transformedData = initializeTransformedData(rawData);
  const tokenRegistry = createTokenRegistry(rawData);
  const feeWallets = createFeeWallets(rawData);
  const tokenTotals = {};

  for (const task of Object.values(rawData.tasks)) {
    processTask(task, tokenRegistry, tokenTotals, feeWallets, transformedData);
  }

  processFees(feeWallets, tokenRegistry, transformedData);
  updateMetadataMessages(tokenTotals, transformedData);

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

    // Transform the raw data
    const transformedData = await transformData(rawData);

    // Process the transformed data
    const processedData = await processData(transformedData);

    // Insert both raw and processed data into Supabase
    const { data: insertedData, error } = await supabase
      .from('tx_json_generator_data')
      .insert({
        raw_data: rawData,
        processed_data: processedData,
        reward_status: false
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