import type { NextApiRequest, NextApiResponse } from 'next';
import axios from 'axios';

export default async function handler(
    req: NextApiRequest,
    res: NextApiResponse
) {
    if (req.method !== 'GET') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    const { url } = req.query;

    if (!url || typeof url !== 'string') {
        return res.status(400).json({ error: 'URL parameter is required' });
    }

    try {
        const response = await axios.get(url, {
            headers: {
                'api_key': process.env.NEXT_PUBLIC_KOIOS_API_KEY || ''
            }
        });
        res.status(200).json(response.data);
    } catch (error) {
        if (axios.isAxiosError(error)) {
            res.status(error.response?.status || 500).json({
                error: error.response?.data?.message || error.message
            });
        } else {
            res.status(500).json({ error: 'An unexpected error occurred' });
        }
    }
} 