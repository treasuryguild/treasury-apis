// pages/api/discord/voice-attendance-logs.ts
import type { NextApiRequest, NextApiResponse } from 'next'
import { supabase } from '../../../lib/supabaseClient'

// Validate API key
function validateApiKey(req: NextApiRequest) {
    const apiKey = req.headers['api_key'];
    const validApiKey = process.env.SERVER_API_KEY;
    if (!apiKey || apiKey !== validApiKey) {
        throw new Error('Invalid API key');
    }
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
    try {
        validateApiKey(req);

        const { user_id, channel_id, limit } = req.query
        let query = supabase
            .from('discord_voice_attendance_logs')
            .select('*')
            .order('recorded_at', { ascending: false })

        if (user_id) {
            query = query.eq('user_id', user_id)
        }
        if (channel_id) {
            query = query.eq('channel_id', channel_id)
        }
        if (limit) {
            const lim = parseInt(limit as string, 10)
            if (!isNaN(lim) && lim > 0) {
                query = query.limit(lim)
            }
        }

        const { data, error } = await query
        if (error) {
            return res.status(500).json({ error: error.message })
        }
        res.status(200).json({ data })
    } catch (err: any) {
        if (err.message === 'Invalid API key') {
            return res.status(401).json({ error: err.message });
        }
        res.status(500).json({ error: err.message || 'Internal Server Error' })
    }
} 