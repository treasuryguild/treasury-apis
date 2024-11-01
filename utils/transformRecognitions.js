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
 * Filters recognitions based on query parameters
 * @param {Array} recognitions - Array of recognition records
 * @param {Object} filters - Filter criteria
 * @returns {Array} Filtered recognition records
 */
export function filterRecognitions(recognitions, { subgroup, contributor_id, task_name } = {}) {
  return recognitions.filter(recognition => {
    // Filter by subgroup
    if (subgroup && recognition.subGroup?.toLowerCase() !== subgroup.toLowerCase()) {
      return false;
    }

    // Filter by contributor_id
    if (contributor_id && recognition.contributor_id !== contributor_id) {
      return false;
    }

    // Filter by task name
    if (task_name && !recognition.task_name.toLowerCase().includes(task_name.toLowerCase())) {
      return false;
    }

    return true;
  });
}

/**
 * Applies pagination to an array of records
 * @param {Array} data - Array of records to paginate
 * @param {number} page - Page number
 * @param {number} limit - Number of items per page
 * @returns {Array} Paginated records
 */
export function paginateData(data, page = 1, limit = 200) {
  const offset = (page - 1) * limit;
  return data.slice(offset, offset + parseInt(limit));
}