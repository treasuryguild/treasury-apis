import supabase from '../../../lib/supabaseClient';

const getApiKeyFromRequest = (req) => {
  const legacyApiKey = req.headers['api_key'];
  const xApiKey = req.headers['x-api-key'];
  const authHeader = req.headers.authorization || req.headers.Authorization;

  if (legacyApiKey) return legacyApiKey;
  if (xApiKey) return xApiKey;

  if (typeof authHeader === 'string' && authHeader.startsWith('Bearer ')) {
    return authHeader.slice('Bearer '.length).trim();
  }

  return null;
};

const validateApiKey = (req) => {
  const apiKey = getApiKeyFromRequest(req);
  const validApiKey = process.env.SERVER_API_KEY;

  if (!apiKey || apiKey !== validApiKey) {
    const error = new Error('Invalid API key');
    error.statusCode = 401;
    throw error;
  }
};

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ message: 'Method not allowed' });
  }

  try {
    validateApiKey(req);

    const { month } = req.query;

    let query = supabase
      .from('snet_sc_token_allocation')
      .select('*')
      .order('month', { ascending: false });

    if (month) {
      query = query.eq('month', month);
    }

    const { data, error } = await query;

    if (error) {
      throw error;
    }

    return res.status(200).json({
      data: data || [],
      metadata: {
        total: data?.length || 0,
        appliedFilters: {
          month: month || null,
        },
      },
    });
  } catch (error) {
    console.error('SNET SC Token Allocation API Error:', {
      message: error.message,
      code: error.code,
      details: error.details,
    });

    if (error.statusCode === 401 || error.message === 'Invalid API key') {
      return res.status(401).json({
        error: 'Unauthorized',
        message: 'Invalid API key',
      });
    }

    return res.status(500).json({
      error: 'Internal server error',
      details:
        process.env.NODE_ENV === 'development'
          ? {
              message: error.message,
              code: error.code,
            }
          : undefined,
    });
  }
}