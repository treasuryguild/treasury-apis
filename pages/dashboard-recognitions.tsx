import { useMemo, useState } from 'react';
import styles from '../styles/DashboardRecognitions.module.css';

type RecognitionRow = {
  recognition_id: string;
  contributor_id: string;
  task_name: string;
  date?: string;
  label?: string | string[];
  subGroup?: string;
  taskCreator?: string;
  amounts: Record<string, number | string>;
  exchange_rate?: string;
  tx_id: string;
  transaction_hash: string;
  transaction_timestamp: string;
};

type ApiMetadata = {
  total: number;
  projectId: string;
  appliedFilters: {
    contributor_id: string | null;
    subgroup: string | null;
    task_name: string | null;
    dateRange: {
      startDate?: string;
      endDate?: string;
    } | null;
  };
  lastSyncedAt?: string | null;
};

type ApiResponse = {
  recognitions: RecognitionRow[];
  metadata?: ApiMetadata;
};

type FilterState = {
  startDate: string;
  endDate: string;
  subgroup: string;
  contributor_id: string;
  task_name: string;
};

const defaultFilters: FilterState = {
  startDate: '',
  endDate: '',
  subgroup: '',
  contributor_id: '',
  task_name: '',
};

function labelToText(label: string | string[] | undefined): string {
  if (!label) return '';
  return Array.isArray(label) ? label.join(', ') : label;
}

function amountsToText(amounts: Record<string, number | string> | undefined): string {
  if (!amounts) return '';
  return Object.entries(amounts)
    .map(([token, value]) => `${token}: ${value}`)
    .join(', ');
}

export default function DashboardRecognitionsPage() {
  const [apiKey, setApiKey] = useState<string>(process.env.NEXT_PUBLIC_SERVER_API_KEY || '');
  const [projectId, setProjectId] = useState<string>(process.env.NEXT_PUBLIC_PROJECT_ID || '');
  const [refreshKey, setRefreshKey] = useState<string>(process.env.NEXT_PUBLIC_DASHBOARD_REFRESH_KEY || '');
  const [filters, setFilters] = useState<FilterState>(defaultFilters);
  const [rows, setRows] = useState<RecognitionRow[]>([]);
  const [cacheRows, setCacheRows] = useState<RecognitionRow[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [cacheLoading, setCacheLoading] = useState<boolean>(false);
  const [injectLoading, setInjectLoading] = useState<boolean>(false);
  const [error, setError] = useState<string>('');
  const [lastFetchAt, setLastFetchAt] = useState<string>('');
  const [lastCacheFetchAt, setLastCacheFetchAt] = useState<string>('');
  const [metadata, setMetadata] = useState<ApiMetadata>();
  const [cacheMetadata, setCacheMetadata] = useState<ApiMetadata>();

  const queryString = useMemo(() => {
    const params = new URLSearchParams();
    if (filters.startDate) params.set('startDate', filters.startDate);
    if (filters.endDate) params.set('endDate', filters.endDate);
    if (filters.subgroup) params.set('subgroup', filters.subgroup);
    if (filters.contributor_id) params.set('contributor_id', filters.contributor_id);
    if (filters.task_name) params.set('task_name', filters.task_name);

    const query = params.toString();
    return query ? `?${query}` : '';
  }, [filters]);

  const handleFilterChange = (key: keyof FilterState, value: string) => {
    setFilters((prev) => ({ ...prev, [key]: value }));
  };

  const handleFetch = async () => {
    setError('');

    if (!apiKey.trim()) {
      setError('API key is required.');
      return;
    }

    if (!projectId.trim()) {
      setError('Project ID is required.');
      return;
    }

    setLoading(true);

    try {
      const response = await fetch(`/api/dashboard_recognitions${queryString}`, {
        method: 'GET',
        headers: {
          api_key: apiKey.trim(),
          'project-id': projectId.trim(),
        },
      });

      const data: ApiResponse | { message?: string; error?: string } = await response.json();

      if (!response.ok) {
        const message = 'message' in data && data.message ? data.message : 'error' in data && data.error ? data.error : `Request failed with status ${response.status}`;
        throw new Error(message);
      }

      if (!('recognitions' in data) || !Array.isArray(data.recognitions)) {
        throw new Error('Unexpected response shape from API.');
      }

      setRows(data.recognitions);
      setMetadata(data.metadata);
      setLastFetchAt(new Date().toLocaleString());
    } catch (fetchError) {
      const message = fetchError instanceof Error ? fetchError.message : 'Unknown error';
      setError(message);
      setRows([]);
      setMetadata(undefined);
    } finally {
      setLoading(false);
    }
  };

  const handleInjectToCache = async () => {
    setError('');

    if (!projectId.trim()) {
      setError('Project ID is required.');
      return;
    }

    if (!refreshKey.trim()) {
      setError('Refresh key is required to inject into cache.');
      return;
    }

    if (rows.length === 0) {
      setError('No live recognitions loaded to inject.');
      return;
    }

    setInjectLoading(true);

    const projectIdTrimmed = projectId.trim();
    const refreshKeyTrimmed = refreshKey.trim();
    const BATCH_SIZE = 200;

    try {
      let totalAttempted = 0;
      let totalInserted = 0;

      for (let i = 0; i < rows.length; i += BATCH_SIZE) {
        const batch = rows.slice(i, i + BATCH_SIZE);

        const response = await fetch('/api/dashboard_recognitions/inject-cache', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'x-refresh-key': refreshKeyTrimmed,
            'project-id': projectIdTrimmed,
          },
          body: JSON.stringify({
            project_id: projectIdTrimmed,
            recognitions: batch,
          }),
        });

        const data: { error?: string; message?: string; attemptedCount?: number; insertedCount?: number } = await response.json();

        if (!response.ok) {
          const message = data.message || data.error || `Inject request failed for batch starting at index ${i} with status ${response.status}`;
          throw new Error(message);
        }

        totalAttempted += data.attemptedCount ?? batch.length;
        totalInserted += data.insertedCount ?? 0;
      }

      setError('');
      if (totalAttempted > 0) {
        console.log(`Inject-cache completed in batches. Attempted: ${totalAttempted}, Inserted: ${totalInserted}`);
      }
    } catch (injectError) {
      const message = injectError instanceof Error ? injectError.message : 'Unknown error during cache injection';
      setError(message);
    } finally {
      setInjectLoading(false);
    }
  };

  const handleFetchCache = async () => {
    setError('');

    if (!apiKey.trim()) {
      setError('API key is required.');
      return;
    }

    if (!projectId.trim()) {
      setError('Project ID is required.');
      return;
    }

    setCacheLoading(true);

    try {
      const response = await fetch(`/api/dashboard_recognitions/cache${queryString}`, {
        method: 'GET',
        headers: {
          api_key: apiKey.trim(),
          'project-id': projectId.trim(),
        },
      });

      const data: ApiResponse | { message?: string; error?: string } = await response.json();

      if (!response.ok) {
        const message = 'message' in data && data.message ? data.message : 'error' in data && data.error ? data.error : `Request failed with status ${response.status}`;
        throw new Error(message);
      }

      if (!('recognitions' in data) || !Array.isArray(data.recognitions)) {
        throw new Error('Unexpected response shape from cache API.');
      }

      setCacheRows(data.recognitions);
      setCacheMetadata(data.metadata as ApiMetadata | undefined);
      setLastCacheFetchAt(new Date().toLocaleString());
    } catch (fetchError) {
      const message = fetchError instanceof Error ? fetchError.message : 'Unknown error while fetching cache';
      setError(message);
      setCacheRows([]);
      setCacheMetadata(undefined);
    } finally {
      setCacheLoading(false);
    }
  };

  const comparison = useMemo(() => {
    if (rows.length === 0 && cacheRows.length === 0) {
      return { status: 'no-data' as const, missingInCacheCount: 0, extraInCacheCount: 0 };
    }

    const liveIds = new Set(rows.map((r) => r.recognition_id));
    const cacheIds = new Set(cacheRows.map((r) => r.recognition_id));

    let missingInCacheCount = 0;
    liveIds.forEach((id) => {
      if (!cacheIds.has(id)) missingInCacheCount += 1;
    });

    let extraInCacheCount = 0;
    cacheIds.forEach((id) => {
      if (!liveIds.has(id)) extraInCacheCount += 1;
    });

    const status = missingInCacheCount === 0 && extraInCacheCount === 0 ? 'match' : 'mismatch';

    return { status, missingInCacheCount, extraInCacheCount } as const;
  }, [rows, cacheRows]);

  const recognitionIdUniqueness = useMemo(() => {
    if (rows.length === 0) {
      return { total: 0, uniqueCount: 0, duplicateCount: 0, allUnique: true } as const;
    }

    const ids = rows.map((r) => r.recognition_id);
    const uniqueIds = new Set(ids);
    const total = ids.length;
    const uniqueCount = uniqueIds.size;
    const duplicateCount = total - uniqueCount;

    return {
      total,
      uniqueCount,
      duplicateCount,
      allUnique: duplicateCount === 0,
    } as const;
  }, [rows]);

  const duplicateRecognitionGroups = useMemo(() => {
    if (rows.length === 0) return [] as { id: string; count: number; rows: RecognitionRow[] }[];

    const groups = new Map<string, RecognitionRow[]>();

    rows.forEach((row) => {
      const list = groups.get(row.recognition_id) || [];
      list.push(row);
      groups.set(row.recognition_id, list);
    });

    return Array.from(groups.entries())
      .filter(([, list]) => list.length > 1)
      .map(([id, list]) => ({ id, count: list.length, rows: list }));
  }, [rows]);

  return (
    <div className={styles.page}>
      <h1 className={styles.title}>Dashboard Recognitions</h1>

      <div className={styles.panel}>
        <div className={styles.grid}>
          <label className={styles.field}>
            API Key
            <input
              className={styles.input}
              type="password"
              value={apiKey}
              onChange={(event) => setApiKey(event.target.value)}
              placeholder="Required"
            />
          </label>

          <label className={styles.field}>
            Project ID
            <input
              className={styles.input}
              type="text"
              value={projectId}
              onChange={(event) => setProjectId(event.target.value)}
              placeholder="Required"
            />
          </label>

          <label className={styles.field}>
            Refresh Key (inject)
            <input
              className={styles.input}
              type="password"
              value={refreshKey}
              onChange={(event) => setRefreshKey(event.target.value)}
              placeholder="Required for cache injection"
            />
          </label>

          <label className={styles.field}>
            Start Date (dd.mm.yy)
            <input
              className={styles.input}
              type="text"
              value={filters.startDate}
              onChange={(event) => handleFilterChange('startDate', event.target.value)}
              placeholder="01.01.25"
            />
          </label>

          <label className={styles.field}>
            End Date (dd.mm.yy)
            <input
              className={styles.input}
              type="text"
              value={filters.endDate}
              onChange={(event) => handleFilterChange('endDate', event.target.value)}
              placeholder="31.01.25"
            />
          </label>

          <label className={styles.field}>
            Subgroup
            <input
              className={styles.input}
              type="text"
              value={filters.subgroup}
              onChange={(event) => handleFilterChange('subgroup', event.target.value)}
              placeholder="Video WG"
            />
          </label>

          <label className={styles.field}>
            Contributor ID
            <input
              className={styles.input}
              type="text"
              value={filters.contributor_id}
              onChange={(event) => handleFilterChange('contributor_id', event.target.value)}
              placeholder="contributor-123"
            />
          </label>

          <label className={styles.field}>
            Task Name
            <input
              className={styles.input}
              type="text"
              value={filters.task_name}
              onChange={(event) => handleFilterChange('task_name', event.target.value)}
              placeholder="facilitating"
            />
          </label>
        </div>

        <div className={styles.actions}>
          <button className={styles.fetchButton} onClick={handleFetch} disabled={loading}>
            {loading ? 'Fetching...' : 'Fetch Dashboard Recognitions'}
          </button>
          <button
            className={styles.fetchButton}
            onClick={handleInjectToCache}
            disabled={injectLoading || rows.length === 0 || !projectId.trim() || !refreshKey.trim()}
          >
            {injectLoading ? 'Injecting…' : 'Inject live results into cache'}
          </button>
          <button
            className={styles.fetchButton}
            onClick={handleFetchCache}
            disabled={cacheLoading}
          >
            {cacheLoading ? 'Fetching cache…' : 'Fetch cache recognitions'}
          </button>
          {lastFetchAt && <span className={styles.meta}>Last live fetch: {lastFetchAt}</span>}
          {lastCacheFetchAt && <span className={styles.meta}>Last cache fetch: {lastCacheFetchAt}</span>}
        </div>

        {error && <p className={styles.error}>Error: {error}</p>}

        {!error && (
          <p className={styles.meta}>
            Showing {rows.length} row(s)
            {metadata?.total !== undefined ? ` (API total: ${metadata.total})` : ''}
            {cacheRows.length > 0 ? ` | Cache rows: ${cacheRows.length}` : ''}
            {comparison.status !== 'no-data' && (
              <span
                style={{
                  marginLeft: '0.5rem',
                  color: comparison.status === 'match' ? 'green' : 'orange',
                  fontWeight: 500,
                }}
              >
                {comparison.status === 'match'
                  ? 'Live vs cache: MATCH'
                  : `Live vs cache: MISMATCH (missingInCache=${comparison.missingInCacheCount}, extraInCache=${comparison.extraInCacheCount})`}
              </span>
            )}
            {rows.length > 0 && (
              <span
                style={{
                  marginLeft: '0.5rem',
                  color: recognitionIdUniqueness.allUnique ? 'green' : 'red',
                  fontWeight: 500,
                }}
              >
                {recognitionIdUniqueness.allUnique
                  ? 'Recognition IDs: all unique'
                  : `Recognition IDs: ${recognitionIdUniqueness.duplicateCount} duplicate(s) detected`}
              </span>
            )}
          </p>
        )}
      </div>

      {duplicateRecognitionGroups.length > 0 && (
        <div className={styles.panel}>
          <h2 className={styles.subtitle}>Duplicate Recognition IDs</h2>
          <div className={styles.tableWrap}>
            <table className={styles.table}>
              <thead>
                <tr>
                  <th>Recognition ID</th>
                  <th>Count</th>
                  <th>Contributor</th>
                  <th>Task Name</th>
                  <th>Date</th>
                  <th>Tx Hash</th>
                </tr>
              </thead>
              <tbody>
                {duplicateRecognitionGroups.map((group) =>
                  group.rows.map((row, index) => (
                    <tr key={`${group.id}-${row.tx_id}-${index}`}>
                      {index === 0 ? (
                        <>
                          <td rowSpan={group.rows.length}>{group.id}</td>
                          <td rowSpan={group.rows.length}>{group.count}</td>
                        </>
                      ) : null}
                      <td>{row.contributor_id}</td>
                      <td>{row.task_name}</td>
                      <td>{row.date || ''}</td>
                      <td>{row.transaction_hash}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      <div className={styles.tableWrap}>
        <table className={styles.table}>
          <thead>
            <tr>
              <th>Recognition ID</th>
              <th>Contributor</th>
              <th>Task Name</th>
              <th>Subgroup</th>
              <th>Date</th>
              <th>Label</th>
              <th>Task Creator</th>
              <th>Amounts</th>
              <th>Exchange Rate</th>
              <th>Tx ID</th>
              <th>Tx Hash</th>
              <th>Tx Timestamp</th>
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 && !loading ? (
              <tr>
                <td colSpan={12} className={styles.empty}>
                  No data loaded. Enter values and click the fetch button.
                </td>
              </tr>
            ) : (
              rows.map((row, index) => (
                <tr key={`${row.recognition_id}-${row.tx_id}-${index}`}>
                  <td>{row.recognition_id}</td>
                  <td>{row.contributor_id}</td>
                  <td>{row.task_name}</td>
                  <td>{row.subGroup || ''}</td>
                  <td>{row.date || ''}</td>
                  <td>{labelToText(row.label)}</td>
                  <td>{row.taskCreator || ''}</td>
                  <td>{amountsToText(row.amounts)}</td>
                  <td>{row.exchange_rate || ''}</td>
                  <td>{row.tx_id}</td>
                  <td>{row.transaction_hash}</td>
                  <td>{row.transaction_timestamp}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
