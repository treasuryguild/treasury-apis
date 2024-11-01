// pages/api/recognitions/index.js
import supabase from '../../../lib/supabaseClient';
import { 
  transformTransactionData, 
  filterRecognitions, 
  paginateData 
} from '../../../utils/transformRecognitions';

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ message: 'Method not allowed' })
  }

  try {
    const {
      page = 1,
      limit = 200,
      startDate,
      endDate,
      subgroup,
      contributor_id,
      task_name,
    } = req.query

    let query = supabase
      .from('transactions')
      .select('*')
      .eq('project_id', '722294ef-c9e4-4b2f-8779-a3f7caf4f28d')

    const { data: rawData, error } = await query.order('transaction_date', { ascending: false })

    if (error) {
      console.error('Supabase Query Error:', error)
      throw error
    }

    // Transform transactions into recognitions
    const transformedData = transformTransactionData(rawData);
    
    // Get all recognitions
    const allRecognitions = transformedData.flatMap(transaction => transaction.recognitions);
    
    // Apply filters
    const filteredRecognitions = filterRecognitions(allRecognitions, {
      subgroup,
      contributor_id,
      task_name
    });

    // Apply pagination
    const paginatedRecognitions = paginateData(filteredRecognitions, page, limit);

    // Get the transaction data for the filtered recognitions
    const relevantTransactionIds = new Set(paginatedRecognitions.map(r => r.tx_id));
    const filteredData = transformedData.filter(t => relevantTransactionIds.has(t.tx_id));

    return res.status(200).json({
      data: filteredData,
      recognitions: paginatedRecognitions,
      metadata: {
        page: parseInt(page),
        limit: parseInt(limit),
        total: filteredRecognitions.length
      }
    });
  } catch (error) {
    console.error('API Error:', {
      message: error.message,
      code: error.code,
      details: error.details
    });
    
    return res.status(500).json({ 
      error: 'Internal server error',
      details: process.env.NODE_ENV === 'development' ? {
        message: error.message,
        code: error.code
      } : undefined
    });
  }
}