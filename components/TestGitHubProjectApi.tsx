import React, { useState } from 'react';

export default function TestGitHubProjectApi() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Use the API key from the environment variable
  const apiKey = process.env.NEXT_PUBLIC_SERVER_API_KEY;

  // Fetch organization project data using owner and projectNumber
  const handleFetchOrgProject = async () => {
    try {
      setLoading(true);
      setError(null);

      if (!apiKey) {
        throw new Error('API key is missing');
      }

      const owner = 'SingularityNet-Ambassador-Program';
      const projectNumber = '1';

      const headers = new Headers();
      headers.set('api_key', apiKey);

      const res = await fetch(
        `/api/github/project-details?owner=${owner}&projectNumber=${projectNumber}`,
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

  // Previously "Fetch Repo Project" function now uses the organization endpoint since repo projects are not supported
  const handleFetchBigOrgProject = async () => {
    try {
      setLoading(true);
      setError(null);

      if (!apiKey) {
        throw new Error('API key is missing');
      }

      const owner = 'SingularityNET-Archive';
      const projectNumber = '1';

      const headers = new Headers();
      headers.set('api_key', apiKey);

      // Fetch organization project data (no repo parameter)
      const res = await fetch(
        `/api/github/project-details?owner=${owner}&projectNumber=${projectNumber}`,
        { headers }
      );

      if (!res.ok) {
        throw new Error('Network response was not OK');
      }

      const data = await res.json();
      console.log('Repo (Org) Project Data:', data);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  // Fetch project data with a status filter, using organization-based query parameters only
  const handleFetchWithStatus = async () => {
    try {
      setLoading(true);
      setError(null);

      if (!apiKey) {
        throw new Error('API key is missing');
      }

      const owner = 'SingularityNet-Ambassador-Program';
      const projectNumber = '14';
      const status = 'Audited';

      const headers = new Headers();
      headers.set('api_key', apiKey);

      const res = await fetch(
        `/api/github/project-details?owner=${owner}&projectNumber=${projectNumber}&status=${status}`,
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

  return (
    <div style={{ margin: '2rem' }}>
      <h2>Test GitHub Project API</h2>

      <div style={{ margin: '1rem 0' }}>
        <button onClick={handleFetchOrgProject} disabled={loading}>
          Fetch Org Project
        </button>
        <button onClick={handleFetchBigOrgProject} disabled={loading} style={{ marginLeft: '1rem' }}>
          Fetch Big Org Project
        </button>
        <button onClick={handleFetchWithStatus} disabled={loading} style={{ marginLeft: '1rem' }}>
          Fetch with Status Filter
        </button>
      </div>

      {loading && <p>Loading...</p>}
      {error && <p style={{ color: 'red' }}>Error: {error}</p>}
    </div>
  );
}
