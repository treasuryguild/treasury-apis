import supabase from '../../../lib/supabaseClient';
import { filterRecognitions } from '../../../utils/transformRecognitions';

const validateApiKey = (req) => {
  const apiKey = req.headers['api_key'];
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

    const projectId = req.headers['project-id'];

    if (!projectId) {
      return res.status(400).json({
        error: 'Bad Request',
        message: 'Project ID is required in headers (project-id)',
      });
    }

    const { startDate, endDate, subgroup, contributor_id, task_name } = req.query;

    // Fetch all cache rows for this project in batches to avoid Supabase row limits
    const PAGE_SIZE = 1000;
    const allCacheRows = [];
    let offset = 0;

    // eslint-disable-next-line no-constant-condition
    while (true) {
      const { data: pageRows, error: pageError } = await supabase
        .from('dashboard_recognitions_cache')
        .select('*')
        .eq('project_id', projectId)
        .order('task_date', { ascending: false })
        .range(offset, offset + PAGE_SIZE - 1);

      if (pageError) {
        console.error('Supabase Query Error (cache read page):', pageError);
        throw pageError;
      }

      const rows = pageRows || [];
      allCacheRows.push(...rows);

      if (rows.length < PAGE_SIZE) {
        break;
      }

      offset += PAGE_SIZE;
    }

    const recognitionsFromCache = allCacheRows.map((row) => ({
      recognition_id: row.recognition_id,
      transaction_hash: row.transaction_hash,
      transaction_timestamp: row.transaction_timestamp,
      tx_type: row.tx_type,
      tx_id: row.tx_id,
      task_id: row.task_id,
      created_at: row.created_at,
      contributor_id: row.contributor_id,
      task_name: row.task_name,
      date: row.task_date,
      label: row.label,
      subGroup: row.sub_group,
      taskCreator: row.task_creator,
      amounts: row.amounts,
      exchange_rate: row.exchange_rate,
    }));

    const filteredRecognitions = filterRecognitions(recognitionsFromCache, {
      startDate,
      endDate,
      subgroup,
      contributor_id,
      task_name,
    });

    const lastSyncedAt = allCacheRows.reduce((latest, row) => {
      if (!row.synced_at) return latest;
      const ts = new Date(row.synced_at).getTime();
      return ts > latest ? ts : latest;
    }, 0);

    return res.status(200).json({
      recognitions: filteredRecognitions,
      metadata: {
        total: filteredRecognitions.length,
        projectId,
        appliedFilters: {
          contributor_id: contributor_id || null,
          subgroup: subgroup || null,
          task_name: task_name || null,
          dateRange: startDate || endDate ? { startDate, endDate } : null,
        },
        lastSyncedAt: lastSyncedAt ? new Date(lastSyncedAt).toISOString() : null,
      },
    });
  } catch (error) {
    console.error('Cache Read API Error:', {
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
