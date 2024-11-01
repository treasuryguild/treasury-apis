// pages/api/contributors/index.js
import supabase from '../../../lib/supabaseClient';

export default async function handler(req, res) {
    if (req.method !== 'GET') {
      return res.status(405).json({ message: 'Method not allowed' })
    }
  
    try {
      const { data, error } = await supabase
        .from('contributors')
        .select(`
          contributor_id,
          wallet
        `)
        .ilike('wallet', 'addr%')  // Filter wallets starting with 'addr'
  
      if (error) throw error
  
      return res.status(200).json(data)
    } catch (error) {
      console.error('API Error:', error)
      return res.status(500).json({ error: 'Internal server error' })
    }
  }