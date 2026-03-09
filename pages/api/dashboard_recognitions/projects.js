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

    const { archived, limit } = req.query;

    const parsedLimit = Math.min(Math.max(parseInt(limit || '200', 10), 1), 1000);

    let query = supabase
      .from('projects')
      .select('*')
      .eq('project_id', allowedProjectId)
      .order('updated_at', { ascending: false })
      .limit(parsedLimit);

    if (archived === 'true') {
      query = query.eq('archived', true);
    }

    if (archived === 'false') {
      query = query.or('archived.is.null,archived.eq.false');
    }

    const { data, error } = await query;

    if (error) {
      throw error;
    }

    const sanitizedData = (data || []).map((project) =>
      Object.fromEntries(Object.entries(project).filter(([key]) => key !== 'budget_items')),
    );

    return res.status(200).json({
      data: sanitizedData,
      metadata: {
        total: sanitizedData.length,
        appliedFilters: {
          project_id: allowedProjectId,
          archived: archived ?? null,
          limit: parsedLimit,
        },
      },
    });
  } catch (error) {
    console.error('Projects API Error:', {
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