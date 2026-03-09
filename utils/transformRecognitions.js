// utils/transformRecognitions.js

/**
 * Creates a 6-character hash from task name and date
 * @param {string} taskName - The name of the task
 * @param {string} date - The date string
 * @returns {string} A 6-character hash string
 */
function generateShortHash(taskName = '', date = '', labels = '') {
  const input = `${taskName}-${date}-${labels}`.toLowerCase();
  let hash1 = 5381; // First hash seed
  let hash2 = 52711; // Second hash seed
  
  // Generate two different hashes for better distribution
  for (let i = 0; i < input.length; i++) {
    const char = input.charCodeAt(i);
    // DJB2-like algorithm for first hash
    hash1 = ((hash1 << 5) + hash1) + char;
    // Different bit manipulation for second hash
    hash2 = ((hash2 << 7) + hash2) + char;
  }

  // Combine both hashes and ensure positive values
  hash1 = Math.abs(hash1);
  hash2 = Math.abs(hash2);

  // Create two parts of the final hash using different bases
  const part1 = hash1.toString(36).slice(-6); // First 6 chars
  const part2 = hash2.toString(36).slice(-6); // Second 6 chars

  // Combine and ensure exactly 12 characters
  const combined = (part1 + part2).padEnd(12, 'a').slice(0, 12);
  
  return combined;
}

/**
 * Normalizes a value to an array.
 * Supports legacy payloads where array-like data is stored as an object.
 * @param {any} value
 * @returns {Array}
 */
function toArray(value) {
  if (Array.isArray(value)) return value;
  if (!value || typeof value !== 'object') return [];
  return Object.values(value);
}

/**
 * Extracts contributor IDs from array or object payloads.
 * @param {any} contributors
 * @returns {string[]}
 */
function getContributorIds(contributors) {
  if (Array.isArray(contributors)) {
    return contributors.filter(Boolean);
  }

  if (contributors && typeof contributors === 'object') {
    return Object.keys(contributors);
  }

  return [];
}

/**
 * Transforms raw transaction data into recognition records with faulty transaction filtering
 * @param {Array} rawData - Array of transaction records from the database
 * @returns {Array} Transformed data with recognition records, excluding faulty transactions
 */
export function transformTransactionData(rawData) {
  const sourceTransactions = toArray(rawData);

  // Get faulty transaction filters from the raw data
  const faultyTxFilters = sourceTransactions.filter(t => 
    t.tx_json?.msg && t.tx_json.msg[0] === "FaultyTx-Filter"
  );

  // First, apply faulty transaction filtering
  const processedData = sourceTransactions.map(transaction => {
    const txJson = transaction.tx_json || {};
    const contributions = toArray(txJson.contributions);
    
    // Find any matching faulty filters for this transaction
    const matchingFilters = faultyTxFilters.filter(filter => 
      filter.tx_json?.faultyTx === transaction.transaction_id
    );

    let processedContributions = [...contributions];

    if (matchingFilters.length > 0) {
      matchingFilters.forEach(filter => {
        const faultyContributions = toArray(filter.tx_json?.contributions);
        
        // Get global contributors to remove (those without specific task names)
        const globalContributorsToRemove = faultyContributions
          .filter(fc => !fc.name)
          .flatMap(fc => getContributorIds(fc.contributors));

        // Filter out faulty contributions
        processedContributions = processedContributions.filter(contribution => {
          const matchingFaultyContribution = faultyContributions.find(fc => 
            fc.name && fc.name[0] === contribution.name?.[0]
          );

          // Combine global and specific contributors to remove
          const contributorsToRemove = [
            ...globalContributorsToRemove,
            ...getContributorIds(matchingFaultyContribution?.contributors)
          ];

          // Remove faulty contributors from the contribution
          if (contribution.contributors) {
            const filteredContributors = {};
            Object.entries(contribution.contributors).forEach(([contributorId, amounts]) => {
              if (!contributorsToRemove.includes(contributorId)) {
                filteredContributors[contributorId] = amounts;
              }
            });
            contribution.contributors = filteredContributors;
          }

          // Keep contribution only if it still has valid contributors
          return Object.keys(contribution.contributors || {}).length > 0;
        });
      });
    }

    return {
      ...transaction,
      tx_json: {
        ...txJson,
        contributions: processedContributions
      }
    };
  });

  // Filter out the FaultyTx-Filter entries themselves from the processed data
  const filteredData = processedData.filter(t => 
    !(t.tx_json?.msg && t.tx_json.msg[0] === "FaultyTx-Filter")
  );

  // Then proceed with the regular transformation
  return filteredData.map(transaction => {
    const txJson = transaction.tx_json || {};
    const contributions = toArray(txJson.contributions);
    
    const recognitions = [];
    
    contributions.forEach((contribution) => {
      const {
        name = [],
        description = [],
        arrayMap = {},
        contributors = {},
        taskCreator = []
      } = contribution;
      
      const taskName = name.length > 0 ? name.join(' ') : description.join(' ');
      const date = arrayMap.date?.[0] || '';
      const label = Array.isArray(arrayMap.label) ? arrayMap.label.join(' ') : (arrayMap.label || '');
      const rawSubGroup = arrayMap.subGroup?.[0] || '';

      const formattedWorkgroup = rawSubGroup
        .toString()
        .trim()
        .toLowerCase()
        .replace(/\s+/g, '-')
        .replace(/[^a-z0-9-]/g, '');
      
      // Generate short contribution ID
      const task_id = generateShortHash(taskName, date, label);
      const taskCreatorValue = Array.isArray(taskCreator) ? taskCreator[0] : taskCreator;
      
      Object.entries(contributors).forEach(([contributorId, amounts]) => {
        const recognition_id = generateRecognitionId({
          task_id,
          contributor_id: contributorId,
          tx_hash: transaction.transaction_id,
          workgroup: formattedWorkgroup
        });

        recognitions.push({
          recognition_id,
          transaction_hash: transaction.transaction_id,
          transaction_timestamp: transaction.transaction_date,
          tx_type: transaction.tx_type,
          tx_id: transaction.tx_id,
          task_id: task_id,
          created_at: transaction.created_at,
          contributor_id: contributorId,
          task_name: taskName,
          date: arrayMap.date?.[0],
          label: arrayMap.label,
          subGroup: arrayMap.subGroup?.[0],
          taskCreator: taskCreatorValue,
          amounts: amounts,
          exchange_rate: transaction.exchange_rate
        });
      });
    });

    return {
      ...transaction,
      recognitions
    };
  });
}

/**
 * Generates a consistent recognition ID based on unique recognition attributes
 * @param {Object} params - Parameters used to generate the recognition ID
 * @returns {string} A consistent, unique recognition ID
 */
function generateRecognitionId({
  task_id,
  contributor_id,
  tx_hash,
  workgroup
}) {
  const hashSuffix = typeof tx_hash === 'string' ? tx_hash.slice(-6) : '';
  return [task_id, contributor_id, workgroup, hashSuffix].filter(Boolean).join('-');
}

/**
 * Parses a date string in dd.mm.yy format to a Date object
 * @param {string} dateStr - Date string in dd.mm.yy format
 * @returns {Date} Parsed date object
 */
function parseDateString(dateStr) {
  if (!dateStr) return null;
  const [day, month, year] = dateStr.split('.');
  // Assuming 20xx for year
  return new Date(`20${year}-${month}-${day}`);
}

/**
 * Filters recognitions based on query parameters
 * @param {Array} recognitions - Array of recognition records
 * @param {Object} filters - Filter criteria
 * @returns {Array} Filtered recognition records
 */
export function filterRecognitions(recognitions, { startDate, endDate, subgroup, contributor_id, task_name } = {}) {
  // Add debug logging to see what's happening with contributor IDs
  if (contributor_id) {
    console.log('Filtering for contributor_id:', contributor_id);
    const uniqueContributorIds = new Set(recognitions.map(r => r.contributor_id));
    console.log('Available contributor_ids:', Array.from(uniqueContributorIds));
  }

  return recognitions.filter(recognition => {
    // Log individual recognition for debugging if contributor_id is provided
    if (contributor_id) {
      console.log('Checking recognition:', {
        contributor_id: recognition.contributor_id,
        matches: recognition.contributor_id === contributor_id
      });
    }

    // Filter by date range
    if (startDate || endDate) {
      const recognitionDate = parseDateString(recognition.date);
      if (!recognitionDate) return false;

      if (startDate) {
        const startDateObj = parseDateString(startDate);
        if (startDateObj && recognitionDate < startDateObj) return false;
      }

      if (endDate) {
        const endDateObj = parseDateString(endDate);
        if (endDateObj && recognitionDate > endDateObj) return false;
      }
    }

    // Filter by subgroup (case-insensitive)
    if (subgroup && recognition.subGroup?.toLowerCase() !== subgroup.toLowerCase()) {
      return false;
    }

    // Filter by contributor_id (simpler exact matching)
    if (contributor_id && recognition.contributor_id !== contributor_id) {
      return false;
    }

    // Filter by task name (case-insensitive partial match)
    if (task_name && !recognition.task_name.toLowerCase().includes(task_name.toLowerCase())) {
      return false;
    }

    return true;
  });
}