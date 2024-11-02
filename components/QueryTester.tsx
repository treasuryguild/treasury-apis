// components/QueryTester.tsx
import React, { useState } from 'react';
import type { ApiResponse, QueryConfig } from '../types/recognition';

const API_KEY = process.env.NEXT_PUBLIC_SERVER_API_KEY; 
const PROJECT_ID = '722294ef-c9e4-4b2f-8779-a3f7caf4f28d';

const QueryTester: React.FC = () => {
  const [results, setResults] = useState<ApiResponse | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const fetchData = async (queryParams: string = ''): Promise<void> => {
    setLoading(true);
    setError(null);

    if (!API_KEY) {
      setError('API key is not configured');
      setLoading(false);
      return;
    }

    try {
      const headers: HeadersInit = {
        'x-api-key': API_KEY,
        'x-project-id': PROJECT_ID
      };

      const response = await fetch(`/api/recognitions${queryParams}`, {
        headers
      });
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const data: ApiResponse = await response.json();
      setResults(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setLoading(false);
    }
  };

  const queries: QueryConfig[] = [
    {
      name: 'All Recognitions',
      query: ''
    },
    {
      name: 'Filter by Contributor',
      query: '?contributor_id=jnaxjp'
    },
    {
      name: 'Filter by Date Range',
      query: '?startDate=01.01.23&endDate=31.12.23'
    },
    {
      name: 'Filter by Subgroup',
      query: '?subgroup=treasury guild'
    },
    {
      name: 'Filter by Task Name',
      query: '?task_name=Treasury JSON Generator API'
    },
    {
      name: 'Combined Filters',
      query: '?contributor_id=jnaxjp&startDate=01.01.23&endDate=31.12.23&subgroup=treasury guild'
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
            onClick={() => fetchData(q.query)}
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
          <h2 style={{ marginBottom: '10px' }}>Results</h2>
          
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
                {JSON.stringify(results.recognitions.slice(0, 5), null, 2)}
              </pre>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default QueryTester;