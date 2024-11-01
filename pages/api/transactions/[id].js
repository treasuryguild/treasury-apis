// pages/api/transactions/[id].js
import supabase from '../../../lib/supabaseClient';

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ message: 'Method not allowed' })
  }

  const { id } = req.query

  try {
    const { data, error } = await supabase
      .from('transactions')
      .select(`
        transaction_date,
        recipients,
        tx_json
      `)
      .eq('transaction_id', id)
      .single()

    if (error) throw error

    if (!data) {
      return res.status(404).json({ message: 'Transaction not found' })
    }

    // Format the timestamp
    const date = new Date(parseInt(data.transaction_date));
    const formattedDate = date.toLocaleDateString('en-GB', {
      day: '2-digit',
      month: '2-digit',
      year: '2-digit'
    }).replace(/\//g, '.');

    // Return both timestamp and formatted date
    return res.status(200).json({
      ...data,
      transaction_timestamp: data.transaction_date,
      transaction_date: formattedDate,
      recipients: data.recipients,
      tx_json: data.tx_json
    })
  } catch (error) {
    console.error('API Error:', error)
    return res.status(500).json({ error: 'Internal server error' })
  }
}