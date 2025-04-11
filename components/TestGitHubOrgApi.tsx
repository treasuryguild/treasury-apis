import React, { useState } from 'react';

export default function TestGitHubOrgApi() {
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const handleTestApi = async () => {
        try {
            setLoading(true);
            setError(null);

            const apiKey = process.env.NEXT_PUBLIC_SERVER_API_KEY;
            if (!apiKey) {
                throw new Error('API key is missing');
            }

            const headers = new Headers();
            headers.set('api_key', apiKey);

            const res = await fetch('/api/github/org-details?orgName=SingularityNet-Ambassador-Program', {
                headers
            });

            if (!res.ok) {
                throw new Error('Network response was not OK');
            }

            const data = await res.json();
            console.log('Organization Details Response:', data);
        } catch (err: any) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div style={{ margin: '2rem' }}>
            <h2>Test GitHub Organization API</h2>

            <div style={{ margin: '1rem 0' }}>
                <button onClick={handleTestApi} disabled={loading}>
                    {loading ? 'Loading...' : 'Test Organization API'}
                </button>
            </div>

            {error && <p style={{ color: 'red' }}>Error: {error}</p>}
        </div>
    );
} 