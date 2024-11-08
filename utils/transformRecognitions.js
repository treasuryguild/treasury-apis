// utils/transformRecognitions.js

/**
 * Transforms raw transaction data into recognition records with faulty transaction filtering
 * @param {Array} rawData - Array of transaction records from the database
 * @returns {Array} Transformed data with recognition records, excluding faulty transactions
 */
export function transformTransactionData(rawData) {
  // Get faulty transaction filters from the raw data
  const faultyTxFilters = rawData.filter(t => 
    t.tx_json?.msg && t.tx_json.msg[0] === "FaultyTx-Filter"
  );

  // First, apply faulty transaction filtering
  const processedData = rawData.map(transaction => {
    const txJson = transaction.tx_json || {};
    const contributions = txJson.contributions || [];
    
    // Find any matching faulty filters for this transaction
    const matchingFilters = faultyTxFilters.filter(filter => 
      filter.tx_json?.faultyTx === transaction.transaction_id
    );

    let processedContributions = [...contributions];

    if (matchingFilters.length > 0) {
      matchingFilters.forEach(filter => {
        const faultyContributions = filter.tx_json?.contributions || [];
        
        // Get global contributors to remove (those without specific task names)
        const globalContributorsToRemove = faultyContributions
          .filter(fc => !fc.name)
          .flatMap(fc => fc.contributors || []);

        // Filter out faulty contributions
        processedContributions = processedContributions.filter(contribution => {
          const matchingFaultyContribution = faultyContributions.find(fc => 
            fc.name && fc.name[0] === contribution.name?.[0]
          );

          // Combine global and specific contributors to remove
          const contributorsToRemove = [
            ...globalContributorsToRemove,
            ...(matchingFaultyContribution?.contributors || [])
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
    const contributions = txJson.contributions || [];
    
    const recognitions = [];
    
    contributions.forEach((contribution, contributionIndex) => {
      const {
        name = [],
        description = [],
        arrayMap = {},
        contributors = {},
        taskCreator = []
      } = contribution;
      
      const contribution_id = `${transaction.tx_id}-${contributionIndex}`;
      const taskCreatorValue = Array.isArray(taskCreator) ? taskCreator[0] : taskCreator;
      const taskName = name.length > 0 ? name.join(' ') : description.join(' ');
      
      Object.entries(contributors).forEach(([contributorId, amounts]) => {
        recognitions.push({
          transaction_hash: transaction.transaction_id,
          transaction_timestamp: transaction.transaction_date,
          tx_type: transaction.tx_type,
          tx_id: transaction.tx_id,
          task_id: contribution_id,
          created_at: transaction.created_at,
          contributor_id: contributorId,
          task_name: taskName,
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