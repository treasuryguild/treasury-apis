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

      {loading && <p>Loading...</p>}
      {error && <p style={{ color: 'red' }}>Error: {error}</p>}
    </div>
  );
}
