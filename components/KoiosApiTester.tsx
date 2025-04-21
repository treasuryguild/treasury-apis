import React, { useState } from 'react';
import axios from 'axios';

const KoiosApiTester: React.FC = () => {
    const [url, setUrl] = useState<string>('');
    const [voterId, setVoterId] = useState<string>('');
    const [loading, setLoading] = useState<boolean>(false);
    const [error, setError] = useState<string | null>(null);

    const testKoiosApi = async () => {
        if (!url) {
            setError('Please enter a Koios API URL');
            return;
        }

        setLoading(true);
        setError(null);

        try {
            // Construct the base URL
            let apiUrl = url;
            // Add the voter_id filter if provided
            if (voterId) {
                const separator = apiUrl.includes('?') ? '&' : '?';
                apiUrl += `${separator}voter_id=eq.${encodeURIComponent(voterId)}`;
            }

            // Make the request through our proxy
            const response = await axios.get(`/api/koios-proxy?url=${encodeURIComponent(apiUrl)}`);
            console.log('Koios API Response:', response.data);
        } catch (error) {
            if (axios.isAxiosError(error)) {
                const errorMessage = error.response?.data?.error || error.message;
                setError(errorMessage);
                console.error('Koios API Error:', errorMessage);
            } else {
                const errorMessage = 'An unexpected error occurred';
                setError(errorMessage);
                console.error('Koios API Error:', errorMessage);
            }
        } finally {
            setLoading(false);
        }
    };

    return (
        <div style={{ margin: '2rem', padding: '1rem', border: '1px solid #ccc', borderRadius: '4px' }}>
            <h2>Koios API Tester</h2>

            <div style={{ margin: '1rem 0' }}>
                <input
                    type="text"
                    value={url}
                    onChange={(e) => setUrl(e.target.value)}
                    placeholder="Enter Koios API URL"
                    style={{ width: '100%', padding: '0.5rem', marginBottom: '1rem' }}
                />

                <input
                    type="text"
                    value={voterId}
                    onChange={(e) => setVoterId(e.target.value)}
                    placeholder="Enter Voter ID to filter (optional)"
                    style={{ width: '100%', padding: '0.5rem', marginBottom: '1rem' }}
                />

                <button
                    onClick={testKoiosApi}
                    disabled={loading}
                    style={{ padding: '0.5rem 1rem', cursor: loading ? 'not-allowed' : 'pointer' }}
                >
                    {loading ? 'Loading...' : 'Test API'}
                </button>
            </div>

            {error && (
                <div style={{ color: 'red', margin: '1rem 0' }}>
                    Error: {error}
                </div>
            )}
        </div>
    );
};

export default KoiosApiTester; 