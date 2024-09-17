// components/TransactionIdTestButton.tsx
import { FC, useState } from 'react';
import axios from 'axios';

interface TransactionIdResult {
  recognitionId: string;
  transactionId: string | null;
}

const API_KEY = process.env.NEXT_PUBLIC_SERVER_API_KEY;

const TransactionIdTestButton: FC = () => {
  const [results, setResults] = useState<TransactionIdResult[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState<boolean>(false);

  const sendTestRequest = async () => {
    setLoading(true);
    setError(null);

    try {
      // Example with mixed number and string recognitionIds
      const testRecognitionIds = [11000, 11001, 11002, 11003, 11004];
      console.log("Sending request with recognitionIds:", testRecognitionIds);
      const response = await axios.post('/api/getTransactionIds', 
        { recognitionIds: testRecognitionIds },
        {
          headers: {
            'api_key': API_KEY
          }
        }
      );
      
      console.log("Full response from server:", response.data);
      setResults(response.data.result);
      alert("Data retrieved successfully!");
    } catch (error) {
      console.error("Error retrieving data:", error);
      if (axios.isAxiosError(error) && error.response) {
        const errorMessage = error.response.data.error || error.message;
        const errorDetails = error.response.data.details || 'No additional details';
        setError(`Error: ${errorMessage}\nDetails: ${errorDetails}`);
        console.error("Full error response:", error.response.data);
      } else {
        setError("An unexpected error occurred. Check the console for details.");
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      <button onClick={sendTestRequest} disabled={loading}>
        {loading ? 'Loading...' : 'Test Get Transaction IDs'}
      </button>
    </div>
  );
};

export default TransactionIdTestButton;