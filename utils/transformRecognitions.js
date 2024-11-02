// utils/transformRecognitions.js

/**
 * Transforms raw transaction data into recognition records
 * @param {Array} rawData - Array of transaction records from the database
 * @returns {Array} Transformed data with recognition records
 */
export function transformTransactionData(rawData) {
  return rawData.map(transaction => {
    const txJson = transaction.tx_json || {};
    const contributions = txJson.contributions || [];
    
    // Create array to store individual recognitions
    const recognitions = [];
    
    contributions.forEach((contribution, contributionIndex) => {
      const {
        name = [],
        arrayMap = {},
        contributors = {},
        taskCreator = []
      } = contribution;
      
      // Create a unique contribution ID combining transaction ID and contribution index
      const contribution_id = `${transaction.tx_id}-${contributionIndex}`;
      
      // Handle taskCreator that could be string or array
      const taskCreatorValue = Array.isArray(taskCreator) ? taskCreator[0] : taskCreator;
      
      // For each contributor in the contribution
      Object.entries(contributors).forEach(([contributorId, amounts]) => {
        recognitions.push({
          transaction_hash: transaction.transaction_id,
          transaction_timestamp: transaction.transaction_date,
          tx_id: transaction.tx_id,
          contribution_id,
          created_at: transaction.created_at,
          contributor_id: contributorId,
          task_name: name.join(' '),
          date: arrayMap.date?.[0],
          label: arrayMap.label?.[0],
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