import React, { useState } from 'react';

export default function TestGitHubProjectApi() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // If this might be undefined, let's handle it carefully
  const apiKey = process.env.NEXT_PUBLIC_SERVER_API_KEY;

  const handleFetchOrgProject = async () => {
    try {
      setLoading(true);
      setError(null);

      if (!apiKey) {
        throw new Error('API key is missing');
      }

      const owner = 'SingularityNET-Archive';
      const projectNumber = '1';

      // Construct a Headers object so TypeScript knows exactly what's going on
      const headers = new Headers();
      headers.set('api_key', apiKey);

      const res = await fetch(
        `/api/github/project-details?owner=${owner}&projectNumber=${projectNumber}&isOrg=true`,
        { headers }
      );

      if (!res.ok) {
        throw new Error('Network response was not OK');
      }

      const data = await res.json();
      console.log('Org Project Data:', data);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleFetchRepoProject = async () => {
    try {
      setLoading(true);
      setError(null);

      if (!apiKey) {
        throw new Error('API key is missing');
      }

      const owner = 'SingularityNet-Ambassador-Program';
      const repo = 'GitHub-PBL-WG';
      const projectNumber = '14';

      const headers = new Headers();
      headers.set('api_key', apiKey);

      const res = await fetch(
        `/api/github/project-details?owner=${owner}&repo=${repo}&projectNumber=${projectNumber}&isOrg=false`,
        { headers }
      );

      if (!res.ok) {
        throw new Error('Network response was not OK');
      }

      const data = await res.json();
      console.log('Repo Project Data:', data);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleFetchWithStatusFilter = async () => {
    try {
      setLoading(true);
      setError(null);

      if (!apiKey) {
        throw new Error('API key is missing');
      }

      const owner = 'SingularityNET-Archive';
      const projectNumber = '1';
      const status = 'In Progress'; // Example status to filter by

      const headers = new Headers();
      headers.set('api_key', apiKey);

      const res = await fetch(
        `/api/github/project-details?owner=${owner}&projectNumber=${projectNumber}&isOrg=true&status=${status}`,
        { headers }
      );

      if (!res.ok) {
        throw new Error('Network response was not OK');
      }

      const data = await res.json();
      console.log('Project Data with Status Filter:', data);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleFetchWithDateRange = async () => {
    try {
      setLoading(true);
      setError(null);

      if (!apiKey) {
        throw new Error('API key is missing');
      }

      const owner = 'SingularityNET-Archive';
      const projectNumber = '1';
      const startDate = '2024-01-01';
      const endDate = '2024-12-31';

      const headers = new Headers();
      headers.set('api_key', apiKey);

      const res = await fetch(
        `/api/github/project-details?owner=${owner}&projectNumber=${projectNumber}&isOrg=true&startDate=${startDate}&endDate=${endDate}`,
        { headers }
      );

      if (!res.ok) {
        throw new Error('Network response was not OK');
      }

      const data = await res.json();
      console.log('Project Data with Date Range Filter:', data);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleFetchWithAllFilters = async () => {
    try {
      setLoading(true);
      setError(null);

      if (!apiKey) {
        throw new Error('API key is missing');
      }

      const owner = 'SingularityNET-Archive';
      const projectNumber = '1';
      const status = 'In Progress';
      const startDate = '2024-01-01';
      const endDate = '2024-12-31';

      const headers = new Headers();
      headers.set('api_key', apiKey);

      const res = await fetch(
        `/api/github/project-details?owner=${owner}&projectNumber=${projectNumber}&isOrg=true&status=${status}&startDate=${startDate}&endDate=${endDate}`,
        { headers }
      );

      if (!res.ok) {
        throw new Error('Network response was not OK');
      }

      const data = await res.json();
      console.log('Project Data with All Filters:', data);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ margin: '2rem' }}>
      <h2>Test GitHub Project API</h2>

      <div style={{ margin: '1rem 0' }}>
        <button onClick={handleFetchOrgProject} disabled={loading}>
          Fetch Org Project
        </button>
        <button onClick={handleFetchRepoProject} disabled={loading} style={{ marginLeft: '1rem' }}>
          Fetch Repo Project
        </button>
      </div>

      <div style={{ margin: '1rem 0' }}>
        <h3>Filter Tests</h3>
        <button onClick={handleFetchWithStatusFilter} disabled={loading}>
          Test Status Filter
        </button>
        <button onClick={handleFetchWithDateRange} disabled={loading} style={{ marginLeft: '1rem' }}>
          Test Date Range Filter
        </button>
        <button onClick={handleFetchWithAllFilters} disabled={loading} style={{ marginLeft: '1rem' }}>
          Test All Filters
        </button>
      </div>

      {loading && <p>Loading...</p>}
      {error && <p style={{ color: 'red' }}>Error: {error}</p>}
    </div>
  );
}
