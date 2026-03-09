import supabase from '../../../lib/supabaseClient';

const validateRefreshKey = (req) => {
  const refreshKeyHeader = req.headers['x-refresh-key'];
  const validKey = process.env.DASHBOARD_REFRESH_KEY;

  if (!validKey) {
    const error = new Error('Refresh key not configured');
    error.statusCode = 500;
    throw error;
  }

  if (!refreshKeyHeader || refreshKeyHeader !== validKey) {
    const error = new Error('Invalid refresh key');
    error.statusCode = 401;
    throw error;
  }
};

// Normalize various timestamp representations into an ISO 8601 string
// Returns null if the value cannot be safely converted.
const normalizeTimestamp = (value) => {
  if (!value) return null;

  // If it's already a Date instance
  if (value instanceof Date) {
    return value.toISOString();
  }

  // If it's a number, assume milliseconds since epoch
  if (typeof value === 'number') {
    try {
      return new Date(value).toISOString();
    } catch {
      return null;
    }
  }

  if (typeof value === 'string') {
    const trimmed = value.trim();

    // Numeric string (e.g. "1772717714617") -> treat as ms since epoch
    if (/^\d{10,}$/.test(trimmed)) {
      const ms = Number(trimmed);
      if (!Number.isNaN(ms)) {
        try {
          return new Date(ms).toISOString();
        } catch {
          return null;
        }
      }
      return null;
    }

    // Otherwise, assume it's already a parseable date string
    return trimmed;
  }

  return null;
};

export const config = {
  api: {
    responseLimit: false,
  },
};

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ message: 'Method not allowed' });
  }

  try {
    console.log('[inject-cache] Incoming request', {
      method: req.method,
      headers: {
        // log presence but not actual secrets
        hasRefreshKey: !!req.headers['x-refresh-key'],
        hasProjectId: !!req.headers['project-id'],
      },
    });

    validateRefreshKey(req);

    const headerProjectId = req.headers['project-id'];
    const { project_id: bodyProjectId, recognitions } = req.body || {};
    const projectId = headerProjectId || bodyProjectId;

    if (!projectId) {
      return res.status(400).json({
        error: 'Bad Request',
        message: 'Project ID is required (project-id header or project_id in body)',
      });
    }

    if (!Array.isArray(recognitions)) {
      return res.status(400).json({
        error: 'Bad Request',
        message: 'Body must include a recognitions array',
      });
    }

    console.log('[inject-cache] Parsed payload', {
      projectId,
      recognitionsCount: recognitions.length,
      sampleRecognition: recognitions[0]
        ? {
            recognition_id: recognitions[0].recognition_id,
            contributor_id: recognitions[0].contributor_id,
            task_id: recognitions[0].task_id,
            tx_id: recognitions[0].tx_id,
          }
        : null,
    });

    if (recognitions.length === 0) {
      return res.status(200).json({
        project_id: projectId,
        attemptedCount: 0,
        insertedCount: 0,
        synced_at: null,
      });
    }

    const syncedAt = new Date().toISOString();

    const rows = recognitions.map((r) => ({
      project_id: projectId,
      recognition_id: r.recognition_id,
      task_id: r.task_id,
      contributor_id: r.contributor_id,
      task_name: r.task_name,
      task_date: r.date,
      label: Array.isArray(r.label) ? r.label.join(' ') : r.label,
      sub_group: r.subGroup,
      task_creator: r.taskCreator,
      amounts: r.amounts,
      tx_id: r.tx_id,
      transaction_hash: r.transaction_hash,
      transaction_timestamp: normalizeTimestamp(r.transaction_timestamp),
      tx_type: r.tx_type,
      created_at: normalizeTimestamp(r.created_at),
      exchange_rate: r.exchange_rate,
      synced_at: syncedAt,
    }));

    console.log('[inject-cache] Mapped rows for upsert', {
      projectId,
      rowCount: rows.length,
    });

    const { data, error } = await supabase
      .from('dashboard_recognitions_cache')
      .upsert(rows, {
        onConflict: 'project_id,recognition_id',
        ignoreDuplicates: true,
      });

    if (error) {
      console.error('Supabase Upsert Error (inject-cache):', error);
      throw error;
    }

    console.log('[inject-cache] Upsert completed', {
      projectId,
      attemptedCount: rows.length,
      returnedCount: Array.isArray(data) ? data.length : null,
    });

    // data may be undefined depending on Supabase settings; fall back to attempted count
    const insertedCount = Array.isArray(data) ? data.length : undefined;

    return res.status(200).json({
      project_id: projectId,
      attemptedCount: rows.length,
      insertedCount,
      synced_at: syncedAt,
    });
  } catch (error) {
    console.error('Inject Cache API Error:', {
      message: error.message,
      code: error.code,
      details: error.details,
    });

    if (error.statusCode === 500 && error.message === 'Refresh key not configured') {
      return res.status(500).json({
        error: 'Server configuration error',
        message: 'DASHBOARD_REFRESH_KEY is not set on the server',
      });
    }

    if (error.statusCode === 401 || error.message === 'Invalid refresh key') {
      return res.status(401).json({
        error: 'Unauthorized',
        message: 'Invalid refresh key',
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
