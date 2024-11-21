// components/QueryTester.tsx
import React, { useState } from 'react';
import type { ApiResponse, QueryConfig } from '../types/recognition';

const API_KEY = process.env.NEXT_PUBLIC_SERVER_API_KEY; 
const PROJECT_ID = '722294ef-c9e4-4b2f-8779-a3f7caf4f28d';

const QueryTester: React.FC = () => {
  const [results, setResults] = useState<ApiResponse | null>(null);
  const [contributorsData, setContributorsData] = useState<any>(null);
  const [walletsData, setWalletsData] = useState<any>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const fetchData = async (queryParams: string = '', endpoint: string = 'recognitions'): Promise<void> => {
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

      // Set up headers and URL based on endpoint
      switch(endpoint) {
        case 'recognitions':
          headers = {
            'api-key': API_KEY,
            'project-id': PROJECT_ID
          };
          url = `/api/recognitions${queryParams}`;
          break;
        case 'contributors':
        case 'gwallets':
          headers = {
            'api_key': API_KEY
          };
          url = endpoint === 'contributors' ? '/api/contributors' : '/api/getGWallets';
          break;
      }

      const response = await fetch(url, { headers });
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const data = await response.json();
      
      // Set data based on endpoint
      switch(endpoint) {
        case 'recognitions':
          setResults(data);
          setContributorsData(null);
          setWalletsData(null);
          break;
        case 'contributors':
          setResults(null);
          setContributorsData(data);
          setWalletsData(null);
          break;
        case 'gwallets':
          setResults(null);
          setContributorsData(null);
          setWalletsData(data);
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
    </div>
  );
};

export default QueryTester;