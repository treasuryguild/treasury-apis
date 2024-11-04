// pages/api/contributors/index.js
import supabase from '../../../lib/supabaseClient';

export default async function handler(req, res) {
    // Check request method
    if (req.method !== 'GET') {
        return res.status(405).json({ message: 'Method not allowed' });
    }

    // API key validation
    const SERVER_API_KEY = process.env.SERVER_API_KEY;
    const apiKeyHeader = req.headers['api_key'];

    if (!apiKeyHeader || apiKeyHeader !== SERVER_API_KEY) {
        return res.status(403).json({ error: 'Forbidden' });
    }

    try {
        const { data, error } = await supabase
            .from('contributors')
            .select(`
                contributor_id,
                wallet
            `)
            .ilike('wallet', 'addr%');  // Filter wallets starting with 'addr'

        if (error) throw error;

        return res.status(200).json(data);
    } catch (error) {
        console.error('API Error:', error);
        return res.status(500).json({ error: 'Internal server error' });
    }
}