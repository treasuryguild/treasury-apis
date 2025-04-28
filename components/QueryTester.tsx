// components/QueryTester.tsx
import React, { useState } from 'react';
import type { ApiResponse, QueryConfig } from '../types/recognition';

const API_KEY = process.env.NEXT_PUBLIC_SERVER_API_KEY;
const PROJECT_ID = '722294ef-c9e4-4b2f-8779-a3f7caf4f28d';

// Helper function to format date as dd.mm.yy
const formatDate = (date: Date): string => {
  const day = date.getDate().toString().padStart(2, '0');
  const month = (date.getMonth() + 1).toString().padStart(2, '0');
  const year = date.getFullYear().toString().slice(-2);
  return `${day}.${month}.${year}`;
};

const QueryTester: React.FC = () => {
  const [results, setResults] = useState<ApiResponse | null>(null);
  const [contributorsData, setContributorsData] = useState<any>(null);
  const [walletsData, setWalletsData] = useState<any>(null);
  const [zoomMeetingsData, setZoomMeetingsData] = useState<any>(null);
  const [getWalletsData, setGetWalletsData] = useState<any>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const fetchData = async (queryParams: string | (() => string), endpoint: string = 'recognitions'): Promise<void> => {
    setLoading(true);
    setError(null);

    if (!API_KEY) {
      setError('API key is not configured');
      setLoading(false);
      return;
    }

    try {
      let headers: HeadersInit = {};
      let url = '';
      const actualQuery = typeof queryParams === 'function' ? queryParams() : queryParams;

      // Set up headers and URL based on endpoint
      switch (endpoint) {
        case 'recognitions':
          headers = {
            'Content-Type': 'application/json',
            'api_key': API_KEY,
            'project-id': PROJECT_ID
          };
          url = `/api/recognitions${actualQuery}`;
          break;
        case 'contributors':
        case 'gwallets':
          headers = {
            'Content-Type': 'application/json',
            'api_key': API_KEY
          };
          url = endpoint === 'contributors' ? '/api/contributors' : '/api/getGWallets';
          break;
        case 'zoom-meetings':
          headers = {
            'Content-Type': 'application/json',
            'api_key': API_KEY
          };
          url = `/api/zoom-meetings${actualQuery}`;
          break;
        case 'getWallets':
          headers = {
            'Content-Type': 'application/json',
            'api_key': API_KEY
          };
          url = '/api/getWallets';
          break;
      }

      const response = await fetch(url, { headers });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();

      // Set data based on endpoint
      switch (endpoint) {
        case 'recognitions':
          setResults(data);
          setContributorsData(null);
          setWalletsData(null);
          setZoomMeetingsData(null);
          setGetWalletsData(null);
          break;
        case 'contributors':
          setResults(null);
          setContributorsData(data);
          setWalletsData(null);
          setZoomMeetingsData(null);
          setGetWalletsData(null);
          break;
        case 'gwallets':
          setResults(null);
          setContributorsData(null);
          setWalletsData(data);
          setZoomMeetingsData(null);
          setGetWalletsData(null);
          break;
        case 'zoom-meetings':
          setResults(null);
          setContributorsData(null);
          setWalletsData(null);
          setZoomMeetingsData(data);
          setGetWalletsData(null);
          break;
        case 'getWallets':
          setResults(null);
          setContributorsData(null);
          setWalletsData(null);
          setZoomMeetingsData(null);
          setGetWalletsData(data);
          break;
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setLoading(false);
    }
  };

  const queries: QueryConfig[] = [
    {
      name: 'All Recognitions',
      query: '',
      endpoint: 'recognitions'
    },
    {
      name: 'Filter by Contributor',
      query: '?contributor_id=jnaxjp',
      endpoint: 'recognitions'
    },
    {
      name: 'Filter by Date Range',
      query: '?startDate=01.01.23&endDate=31.12.23',
      endpoint: 'recognitions'
    },
    {
      name: 'Filter by Subgroup',
      query: '?subgroup=treasury guild',
      endpoint: 'recognitions'
    },
    {
      name: 'Filter by Task Name',
      query: '?task_name=Treasury JSON Generator API',
      endpoint: 'recognitions'
    },
    {
      name: 'Combined Filters',
      query: '?contributor_id=jnaxjp&startDate=01.01.23&endDate=31.12.23&subgroup=treasury guild',
      endpoint: 'recognitions'
    },
    {
      name: 'Get All Contributors',
      query: '',
      endpoint: 'contributors'
    },
    {
      name: 'Get All Wallet Addresses',
      query: '',
      endpoint: 'gwallets'
    },
    {
      name: 'Get Wallets (System Registered Users)',
      query: '',
      endpoint: 'getWallets'
    },
    {
      name: 'All Zoom Meetings (Last 10 Months)',
      query: () => {
        const endDate = new Date();
        const startDate = new Date();
        startDate.setMonth(startDate.getMonth() - 10);
        return `?startDate=${formatDate(startDate)}&endDate=${formatDate(endDate)}`;
      },
      endpoint: 'zoom-meetings'
    },
    {
      name: 'Zoom: Last 3 Months',
      query: () => {
        const endDate = new Date();
        const startDate = new Date();
        startDate.setMonth(startDate.getMonth() - 3);
        return `?startDate=${formatDate(startDate)}&endDate=${formatDate(endDate)}`;
      },
      endpoint: 'zoom-meetings'
    },
    {
      name: 'Zoom: Last Week',
      query: () => {
        const endDate = new Date();
        const startDate = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
        return `?startDate=${formatDate(startDate)}&endDate=${formatDate(endDate)}`;
      },
      endpoint: 'zoom-meetings'
    }
  ];

  return (
    <div style={{ padding: '20px', maxWidth: '1200px', margin: '0 auto' }}>
      <h1 style={{ marginBottom: '20px', color: 'white' }}>API Query Tester</h1>

      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))',
        gap: '10px',
        marginBottom: '20px'
      }}>
        {queries.map((q, index) => (
          <button
            key={index}
            onClick={() => fetchData(q.query, q.endpoint)}
            disabled={loading}
            style={{
              padding: '10px',
              border: '1px solid #ccc',
              borderRadius: '4px',
              backgroundColor: 'black',
              color: 'white',
              cursor: loading ? 'not-allowed' : 'pointer',
              opacity: loading ? 0.7 : 1
            }}
          >
            {q.name}
          </button>
        ))}
      </div>

      {loading && (
        <div style={{ textAlign: 'center', padding: '20px', color: 'white' }}>
          Loading...
        </div>
      )}

      {error && (
        <div style={{
          color: 'red',
          padding: '10px',
          border: '1px solid red',
          borderRadius: '4px',
          marginBottom: '20px'
        }}>
          Error: {error}
        </div>
      )}

      {results && (
        <div style={{
          border: '1px solid #ccc',
          borderRadius: '4px',
          padding: '20px',
          backgroundColor: 'black',
          color: 'white'
        }}>
          <h2 style={{ marginBottom: '10px' }}>Recognition Results</h2>

          <div style={{ marginBottom: '20px' }}>
            <h3>Metadata:</h3>
            <pre style={{
              backgroundColor: 'black',
              padding: '10px',
              borderRadius: '4px',
              overflow: 'auto',
              color: 'white'
            }}>
              {JSON.stringify(results.metadata, null, 2)}
            </pre>
          </div>

          <div>
            <h3>Total Recognitions: {results.recognitions.length}</h3>
            <div style={{
              maxHeight: '400px',
              overflow: 'auto',
              backgroundColor: 'black',
              padding: '10px',
              borderRadius: '4px',
              color: 'white'
            }}>
              <pre>
                {JSON.stringify(results.recognitions.slice(0, 50), null, 2)}
              </pre>
            </div>
          </div>
        </div>
      )}

      {contributorsData && (
        <div style={{
          border: '1px solid #ccc',
          borderRadius: '4px',
          padding: '20px',
          backgroundColor: 'black',
          color: 'white',
          marginTop: '20px'
        }}>
          <h2 style={{ marginBottom: '10px' }}>Contributors Results</h2>
          <h3>Total Contributors: {contributorsData.length}</h3>
          <div style={{
            maxHeight: '400px',
            overflow: 'auto',
            backgroundColor: 'black',
            padding: '10px',
            borderRadius: '4px',
            color: 'white'
          }}>
            <pre>
              {JSON.stringify(contributorsData.slice(0, 5), null, 2)}
            </pre>
          </div>
        </div>
      )}

      {walletsData && (
        <div style={{
          border: '1px solid #ccc',
          borderRadius: '4px',
          padding: '20px',
          backgroundColor: 'black',
          color: 'white',
          marginTop: '20px'
        }}>
          <h2 style={{ marginBottom: '10px' }}>Wallet Addresses Results</h2>
          <h3>Total Wallets: {walletsData.length}</h3>
          <div style={{
            maxHeight: '400px',
            overflow: 'auto',
            backgroundColor: 'black',
            padding: '10px',
            borderRadius: '4px',
            color: 'white'
          }}>
            <pre>
              {JSON.stringify(walletsData.slice(0, 5), null, 2)}
            </pre>
          </div>
        </div>
      )}

      {getWalletsData && (
        <div style={{
          border: '1px solid #ccc',
          borderRadius: '4px',
          padding: '20px',
          backgroundColor: 'black',
          color: 'white',
          marginTop: '20px'
        }}>
          <h2 style={{ marginBottom: '10px' }}>Get Wallets Results</h2>
          <h3>Total Wallets: {getWalletsData.data.length}</h3>
          <div style={{
            maxHeight: '400px',
            overflow: 'auto',
            backgroundColor: 'black',
            padding: '10px',
            borderRadius: '4px',
            color: 'white'
          }}>
            <pre>
              {JSON.stringify(getWalletsData.data.slice(0, 5), null, 2)}
            </pre>
          </div>
        </div>
      )}

      {zoomMeetingsData && (
        <div style={{
          border: '1px solid #ccc',
          borderRadius: '4px',
          padding: '20px',
          backgroundColor: 'black',
          color: 'white',
          marginTop: '20px'
        }}>
          <h2 style={{ marginBottom: '10px' }}>Zoom Meetings Results</h2>
          <h3>Total Meetings: {zoomMeetingsData.meetings.length}</h3>
          <div style={{
            maxHeight: '400px',
            overflow: 'auto',
            backgroundColor: 'black',
            padding: '10px',
            borderRadius: '4px',
            color: 'white'
          }}>
            <pre>
              {JSON.stringify(zoomMeetingsData, null, 2)}
            </pre>
          </div>
        </div>
      )}
    </div>
  );
};

export default QueryTester;