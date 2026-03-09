import { useMemo, useState } from 'react';

const FIXED_PROJECT_ID = process.env.NEXT_PUBLIC_DASHBOARD_RECOGNITIONS_PROJECT_ID || '';

type EndpointKey = 'cache' | 'projects' | 'subgroups' | 'snetAllocation';

type RequestConfig = {
  label: string;
  endpoint: string;
  requiresProjectHeader?: boolean;
  query?: Record<string, string>;
};

const DashboardCacheTesterPage = () => {
  const [apiKey, setApiKey] = useState(process.env.NEXT_PUBLIC_SERVER_API_KEY || '');
  const [projectId, setProjectId] = useState(FIXED_PROJECT_ID);

  // Cache endpoint filters
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [subgroup, setSubgroup] = useState('');
  const [contributorId, setContributorId] = useState('');
  const [taskName, setTaskName] = useState('');

  // New table endpoint filters
  const [month, setMonth] = useState('');
  const [archived, setArchived] = useState('');
  const [subgroupFilter, setSubgroupFilter] = useState('');
  const [limit, setLimit] = useState('200');

  const [activeRequest, setActiveRequest] = useState<EndpointKey | null>(null);
  const [statusMessage, setStatusMessage] = useState('');
  const [responseStatus, setResponseStatus] = useState<number | null>(null);
  const [responseData, setResponseData] = useState<unknown>(null);

  const sharedHeaders = useMemo(() => {
    return {
      'Content-Type': 'application/json',
      api_key: apiKey,
    };
  }, [apiKey]);

  const createQueryString = (query?: Record<string, string>) => {
    if (!query) return '';

    const searchParams = new URLSearchParams();
    Object.entries(query).forEach(([key, value]) => {
      if (value && value.trim()) {
        searchParams.append(key, value.trim());
      }
    });

    const queryString = searchParams.toString();
    return queryString ? `?${queryString}` : '';
  };

  const runRequest = async (requestKey: EndpointKey, config: RequestConfig) => {
    setActiveRequest(requestKey);
    setStatusMessage(`Fetching ${config.label}...`);
    setResponseStatus(null);

    try {
      const headers: HeadersInit = { ...sharedHeaders };

      if (config.requiresProjectHeader) {
        if (!projectId.trim()) {
          throw new Error('Project ID is required for the cache endpoint.');
        }
        headers['project-id'] = projectId.trim();
      }

      const url = `${config.endpoint}${createQueryString(config.query)}`;
      const response = await fetch(url, {
        method: 'GET',
        headers,
      });

      const json = await response.json();
      setResponseStatus(response.status);
      setResponseData(json);

      if (!response.ok) {
        throw new Error(json?.message || json?.error || 'Request failed');
      }

      setStatusMessage(`Success (${response.status}) - ${config.label}`);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      setStatusMessage(`Error: ${message}`);
    } finally {
      setActiveRequest(null);
    }
  };

  return (
    <div style={{ maxWidth: 1200, margin: '0 auto', padding: '20px' }}>
      <h1 style={{ marginBottom: '8px' }}>Dashboard Cache + Table API Tester</h1>
      <p style={{ marginBottom: '20px' }}>
        Test the dashboard recognitions cache endpoint and the new table routes.
      </p>

      <p style={{ marginBottom: '16px', color: '#334155' }}>
        New table routes are locked to env project ID:{' '}
        <code>{FIXED_PROJECT_ID || 'NEXT_PUBLIC_DASHBOARD_RECOGNITIONS_PROJECT_ID not set'}</code>
      </p>

      <section style={{ border: '1px solid #d0d7de', borderRadius: '8px', padding: '16px', marginBottom: '16px' }}>
        <h2 style={{ marginTop: 0 }}>Shared Headers</h2>

        <label style={{ display: 'block', marginBottom: '8px' }}>
          API Key (`api_key`)
          <input
            type="text"
            value={apiKey}
            onChange={(e) => setApiKey(e.target.value)}
            placeholder="Server API key"
            style={{ width: '100%', marginTop: '4px', padding: '8px' }}
          />
        </label>

        <label style={{ display: 'block' }}>
          Project ID header (`project-id`) for cache endpoint
          <input
            type="text"
            value={projectId}
            onChange={(e) => setProjectId(e.target.value)}
            placeholder="e.g. 722294ef-c9e4-4b2f-8779-a3f7caf4f28d"
            style={{ width: '100%', marginTop: '4px', padding: '8px' }}
          />
        </label>
      </section>

      <section style={{ border: '1px solid #d0d7de', borderRadius: '8px', padding: '16px', marginBottom: '16px' }}>
        <h2 style={{ marginTop: 0 }}>1) Cache Endpoint (`/api/dashboard_recognitions/cache`)</h2>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '10px', marginBottom: '12px' }}>
          <input value={startDate} onChange={(e) => setStartDate(e.target.value)} placeholder="startDate (dd.mm.yy)" style={{ padding: '8px' }} />
          <input value={endDate} onChange={(e) => setEndDate(e.target.value)} placeholder="endDate (dd.mm.yy)" style={{ padding: '8px' }} />
          <input value={subgroup} onChange={(e) => setSubgroup(e.target.value)} placeholder="subgroup" style={{ padding: '8px' }} />
          <input value={contributorId} onChange={(e) => setContributorId(e.target.value)} placeholder="contributor_id" style={{ padding: '8px' }} />
          <input value={taskName} onChange={(e) => setTaskName(e.target.value)} placeholder="task_name" style={{ padding: '8px' }} />
        </div>

        <button
          onClick={() =>
            runRequest('cache', {
              label: 'Dashboard Recognitions Cache',
              endpoint: '/api/dashboard_recognitions/cache',
              requiresProjectHeader: true,
              query: {
                startDate,
                endDate,
                subgroup,
                contributor_id: contributorId,
                task_name: taskName,
              },
            })
          }
          disabled={activeRequest !== null}
          style={{ padding: '10px 14px', cursor: activeRequest ? 'not-allowed' : 'pointer' }}
        >
          Fetch Cache Data
        </button>
      </section>

      <section style={{ border: '1px solid #d0d7de', borderRadius: '8px', padding: '16px', marginBottom: '16px' }}>
        <h2 style={{ marginTop: 0 }}>2) Projects (`/api/dashboard_recognitions/projects`)</h2>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '10px', marginBottom: '12px' }}>
          <input value={limit} onChange={(e) => setLimit(e.target.value)} placeholder="limit (default 200)" style={{ padding: '8px' }} />
          <select value={archived} onChange={(e) => setArchived(e.target.value)} style={{ padding: '8px' }}>
            <option value="">archived: all</option>
            <option value="false">archived=false</option>
            <option value="true">archived=true</option>
          </select>
        </div>

        <button
          onClick={() =>
            runRequest('projects', {
              label: 'Projects',
              endpoint: '/api/dashboard_recognitions/projects',
              query: {
                archived,
                limit,
              },
            })
          }
          disabled={activeRequest !== null}
          style={{ padding: '10px 14px', cursor: activeRequest ? 'not-allowed' : 'pointer' }}
        >
          Fetch Projects
        </button>
      </section>

      <section style={{ border: '1px solid #d0d7de', borderRadius: '8px', padding: '16px', marginBottom: '16px' }}>
        <h2 style={{ marginTop: 0 }}>3) Subgroups (`/api/dashboard_recognitions/subgroups`)</h2>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '10px', marginBottom: '12px' }}>
          <input value={subgroupFilter} onChange={(e) => setSubgroupFilter(e.target.value)} placeholder="sub_group contains (optional)" style={{ padding: '8px' }} />
          <input value={limit} onChange={(e) => setLimit(e.target.value)} placeholder="limit (default 500)" style={{ padding: '8px' }} />
        </div>

        <button
          onClick={() =>
            runRequest('subgroups', {
              label: 'Subgroups',
              endpoint: '/api/dashboard_recognitions/subgroups',
              query: {
                sub_group: subgroupFilter,
                limit,
              },
            })
          }
          disabled={activeRequest !== null}
          style={{ padding: '10px 14px', cursor: activeRequest ? 'not-allowed' : 'pointer' }}
        >
          Fetch Subgroups
        </button>
      </section>

      <section style={{ border: '1px solid #d0d7de', borderRadius: '8px', padding: '16px', marginBottom: '16px' }}>
        <h2 style={{ marginTop: 0 }}>4) SNET SC Token Allocation (`/api/dashboard_recognitions/snet-sc-token-allocation`)</h2>

        <div style={{ marginBottom: '12px' }}>
          <input
            value={month}
            onChange={(e) => setMonth(e.target.value)}
            placeholder="month (optional)"
            style={{ width: '100%', maxWidth: '360px', padding: '8px' }}
          />
        </div>

        <button
          onClick={() =>
            runRequest('snetAllocation', {
              label: 'SNET SC Token Allocation',
              endpoint: '/api/dashboard_recognitions/snet-sc-token-allocation',
              query: {
                month,
              },
            })
          }
          disabled={activeRequest !== null}
          style={{ padding: '10px 14px', cursor: activeRequest ? 'not-allowed' : 'pointer' }}
        >
          Fetch Token Allocation
        </button>
      </section>

      <section style={{ border: '1px solid #d0d7de', borderRadius: '8px', padding: '16px' }}>
        <h2 style={{ marginTop: 0 }}>Response</h2>
        <p style={{ marginBottom: '8px' }}>{statusMessage || 'No requests run yet.'}</p>
        <p style={{ marginBottom: '12px' }}>
          HTTP Status: {responseStatus !== null ? responseStatus : 'N/A'}
        </p>
        <pre
          style={{
            maxHeight: '420px',
            overflow: 'auto',
            padding: '12px',
            backgroundColor: '#0f172a',
            color: '#e2e8f0',
            borderRadius: '8px',
          }}
        >
          {JSON.stringify(responseData, null, 2)}
        </pre>
      </section>
    </div>
  );
};

export default DashboardCacheTesterPage;