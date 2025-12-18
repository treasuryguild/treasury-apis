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

// Parse a date string in dd.mm.yy format into a UTC Date.
// If endOfDay is true, time will be set to 23:59:59.999 UTC, otherwise start of day UTC.
function parseDdMmYyToUtcDate(dateStr: string, endOfDay: boolean): Date | null {
    if (typeof dateStr !== 'string') return null;
    const match = dateStr.match(/^(\d{2})\.(\d{2})\.(\d{2})$/);
    if (!match) return null;

    const day = parseInt(match[1], 10);
    const month = parseInt(match[2], 10); // 1-12
    const yearTwoDigits = parseInt(match[3], 10);
    const year = 2000 + yearTwoDigits; // assume 20xx

    if (month < 1 || month > 12) return null;
    if (day < 1 || day > 31) return null;

    const hours = endOfDay ? 23 : 0;
    const minutes = endOfDay ? 59 : 0;
    const seconds = endOfDay ? 59 : 0;
    const ms = endOfDay ? 999 : 0;

    const d = new Date(Date.UTC(year, month - 1, day, hours, minutes, seconds, ms));
    // Validate that the date components round-trip correctly (handles invalid dates like 31.02.25)
    if (
        d.getUTCFullYear() !== year ||
        d.getUTCMonth() !== month - 1 ||
        d.getUTCDate() !== day
    ) {
        return null;
    }
    return d;
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
    try {
        validateApiKey(req);

        const { user_id, channel_id, guild_id, limit } = req.query
        const startDateParam = typeof req.query.startDate === 'string' ? req.query.startDate : undefined
        const endDateParam = typeof req.query.endDate === 'string' ? req.query.endDate : undefined

        let query = supabase
            .from('discord_voice_attendance_logs')
            .select('username, channel_name, guild_name, recorded_at')
            .order('recorded_at', { ascending: false })

        if (user_id) {
            query = query.eq('user_id', user_id)
        }
        if (channel_id) {
            query = query.eq('channel_id', channel_id)
        }
        if (guild_id) {
            query = query.eq('guild_id', guild_id)
        }
        // Date filtering using recorded_at column
        if (startDateParam) {
            const start = parseDdMmYyToUtcDate(startDateParam, false)
            if (!start) {
                return res.status(400).json({ error: 'Invalid startDate format. Expected dd.mm.yy' })
            }
            query = query.gte('recorded_at', start.toISOString())
        }
        if (endDateParam) {
            const end = parseDdMmYyToUtcDate(endDateParam, true)
            if (!end) {
                return res.status(400).json({ error: 'Invalid endDate format. Expected dd.mm.yy' })
            }
            query = query.lte('recorded_at', end.toISOString())
        }
        if (startDateParam && endDateParam) {
            const start = parseDdMmYyToUtcDate(startDateParam, false)!
            const end = parseDdMmYyToUtcDate(endDateParam, true)!
            if (start.getTime() > end.getTime()) {
                return res.status(400).json({ error: 'startDate must be on or before endDate' })
            }
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

        // Convert recorded_at timestamps to Unix timestamps
        const processedData = data?.map(record => ({
            username: record.username,
            channel_name: record.channel_name,
            guild_name: record.guild_name,
            recorded_at: new Date(record.recorded_at).getTime()
        })) || []

        res.status(200).json({ data: processedData })
    } catch (err: any) {
        if (err.message === 'Invalid API key') {
            return res.status(401).json({ error: err.message });
        }
        res.status(500).json({ error: err.message || 'Internal Server Error' })
    }
} 