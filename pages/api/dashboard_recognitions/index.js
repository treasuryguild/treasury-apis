// pages/api/recognitions/index.js
import supabase from '../../../lib/supabaseClient';
import { 
  transformTransactionData, 
  filterRecognitions
} from '../../../utils/transformRecognitions';

// Add API key validation middleware
const validateApiKey = (req) => {
  const apiKey = req.headers['api-key'];
  // Replace this with your actual API key validation logic
  const validApiKey = process.env.SERVER_API_KEY;
  
  if (!apiKey || apiKey !== validApiKey) {
    throw new Error('Invalid API key');
  }
};
export const config = {
  api: {
    responseLimit: false,
  },
}

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ message: 'Method not allowed' });
  }

  try {
    // Validate API key
    validateApiKey(req);

    // Get project_id from headers
    const projectId = req.headers['project-id'];
    
    if (!projectId) {
      return res.status(400).json({ 
        error: 'Bad Request',
        message: 'Project ID is required in headers (project-id)'
      });
    }

    const {
      startDate,
      endDate,
      subgroup,
      contributor_id,
      task_name,
    } = req.query

    // Enhanced logging
    console.log('Request Details:', {
      projectId,
      headers: req.headers,
      queryParams: {
        startDate,
        endDate,
        subgroup,
        contributor_id,
        task_name
      }
    });

    let query = supabase
      .from('transactions')
      .select('*')
      .eq('project_id', projectId)

    const { data: rawData, error } = await query.order('transaction_date', { ascending: false })

    if (error) {
      console.error('Supabase Query Error:', error)
      throw error
    }

    // Transform transactions into recognitions
    const transformedData = transformTransactionData(rawData);
    
    // Get all recognitions
    const allRecognitions = transformedData.flatMap(transaction => transaction.recognitions);
    
    // Enhanced logging
    console.log('Total recognitions before filtering:', allRecognitions.length);
    if (contributor_id) {
      const contributorRecognitions = allRecognitions.filter(r => r.contributor_id === contributor_id);
      console.log('Found recognitions for contributor_id before filtering:', {
        contributor_id,
        count: contributorRecognitions.length,
        sample: contributorRecognitions.slice(0, 2)
      });
    }

    // Apply filters
    const filteredRecognitions = filterRecognitions(allRecognitions, {
      startDate,
      endDate,
      subgroup,
      contributor_id,
      task_name
    });

    // Enhanced logging after filtering
    console.log('Filtered recognitions:', {
      total: filteredRecognitions.length,
      sampleData: filteredRecognitions.slice(0, 2)
    });

    // Get the transaction data for the filtered recognitions (Testing purposes)
    //const relevantTransactionIds = new Set(filteredRecognitions.map(r => r.tx_id));
    //const filteredData = transformedData.filter(t => relevantTransactionIds.has(t.tx_id));

    return res.status(200).json({
      //data: filteredData,
      recognitions: filteredRecognitions,
      metadata: {
        total: filteredRecognitions.length,
        projectId,
        appliedFilters: {
          contributor_id: contributor_id || null,
          subgroup: subgroup || null,
          task_name: task_name || null,
          dateRange: startDate || endDate ? { startDate, endDate } : null
        }
      }
    });
  } catch (error) {
    console.error('API Error:', {
      message: error.message,
      code: error.code,
      details: error.details
    });
    
    // Handle specific errors
    if (error.message === 'Invalid API key') {
      return res.status(401).json({ 
        error: 'Unauthorized',
        message: 'Invalid API key'
      });
    }
    
    return res.status(500).json({ 
      error: 'Internal server error',
      details: process.env.NODE_ENV === 'development' ? {
        message: error.message,
        code: error.code
      } : undefined
    });
  }
}