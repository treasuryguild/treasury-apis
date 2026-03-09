import supabase from '../../../lib/supabaseClient';

const getAllowedProjectId = () => {
  return process.env.DASHBOARD_RECOGNITIONS_PROJECT_ID;
};

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

export const config = {
  api: {
    responseLimit: false,
  },
};

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ message: 'Method not allowed' });
  }

  try {
    validateApiKey(req);

    const allowedProjectId = getAllowedProjectId();
    if (!allowedProjectId) {
      return res.status(500).json({
        error: 'Server configuration error',
        message: 'DASHBOARD_RECOGNITIONS_PROJECT_ID is not set',
      });
    }

    const { sub_group, limit } = req.query;

    const parsedLimit = Math.min(Math.max(parseInt(limit || '500', 10), 1), 2000);

    let query = supabase
      .from('subgroups')
      .select('*')
      .eq('project_id', allowedProjectId)
      .order('updated_at', { ascending: false })
      .limit(parsedLimit);

    if (sub_group) {
      query = query.ilike('sub_group', `%${sub_group}%`);
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
          project_id: allowedProjectId,
          sub_group: sub_group || null,
          limit: parsedLimit,
        },
      },
    });
  } catch (error) {
    console.error('Subgroups API Error:', {
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