// pages/api/transactions/index.js
import supabase from '../../../lib/supabaseClient';

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ message: 'Method not allowed' })
  }

  try {
    const {
      page = 1,
      limit = 10,
      startDate,
      endDate,
      subgroup,
      contributor_id,
      task_name,
    } = req.query

    const offset = (page - 1) * limit

    // Log the request parameters for debugging
    console.log('Request parameters:', {
      page,
      limit,
      startDate,
      endDate,
      subgroup,
      contributor_id,
      task_name
    })

    // Start with base query
    let query = supabase
      .from('transactions')
      .select(`
        *,
        contributions!inner (
          task_name,
          task_label,
          task_date,
          task_sub_group
        ),
        distributions (
          contributor_id,
          tokens,
          amounts
        )
      `)

    // Add filters if provided
    if (startDate && endDate) {
      query = query.gte('transaction_date', startDate).lte('transaction_date', endDate)
    }

    // Modified subgroup filter
    if (subgroup) {
      query = query.eq('contributions.task_sub_group', subgroup)
      console.log('Filtering by subgroup:', subgroup)
    }

    if (contributor_id) {
      query = query.eq('distributions.contributor_id', contributor_id)
    }

    if (task_name) {
      query = query.ilike('contributions.task_name', `%${task_name}%`)
    }

    // Add order by
    query = query.order('transaction_date', { ascending: false })

    // Add pagination
    query = query.range(offset, offset + limit - 1)

    const { data, error, count } = await query
    
    if (error) {
      console.error('Supabase Query Error:', error)
      throw error
    }

    // Log the response data for debugging
    console.log('Query response stats:', {
      resultsCount: data?.length || 0,
      totalCount: count || 0,
      hasError: !!error
    })

    return res.status(200).json({
      data,
      metadata: {
        page: parseInt(page),
        limit: parseInt(limit),
        total: count || 0
      }
    })
  } catch (error) {
    console.error('API Error:', {
      message: error.message,
      code: error.code,
      details: error.details
    })
    
    return res.status(500).json({ 
      error: 'Internal server error',
      details: process.env.NODE_ENV === 'development' ? {
        message: error.message,
        code: error.code
      } : undefined
    })
  }
}