// components/TestDataButton.tsx
import { FC } from 'react';
import axios from 'axios';

interface TokenRegistry {
  assetName: string;
  tokenTicker: string;
  multiplier: string;
  policyId: string;
  exhangeRateNeeded: string;
}

interface TokenFee {
  groupName: string;
  tokenTicker: string;
  fee: string;
  walletAddress: string;
  walletName: string;
}

interface Task {
  taskId: string;
  groupName: string;
  subGroup: string;
  taskLabels: string;
  taskName: string;
  walletAddress: string;
  proofLink: string;
  date: string;
  tokenT: Array<{
    [key: string]: string;
  }>;
}

interface TestData {
  tokenRegistry: TokenRegistry[];
  tokenFee: TokenFee[];
  tasks: Task[];
}

interface TestDataButtonProps {
  testData: TestData;
}

const API_KEY = process.env.NEXT_PUBLIC_SERVER_API_KEY;

const TestDataButton: FC<TestDataButtonProps> = ({ testData }) => {
  const sendTestData = async () => {
    try {
      const response = await axios.post('/api/txJsonGenerator', testData, {
        headers: {
          'api_key': API_KEY
        }
      });
      console.log("Response from server:", response.data);
      alert("Data sent successfully!");
    } catch (error) {
      console.error("Error sending data:", error);
      if (axios.isAxiosError(error) && error.response) {
        alert(`Error sending data: ${error.response.data.message || error.message}`);
      } else {
        alert("Error sending data. Check the console for details.");
      }
    }
  };

  return <button onClick={sendTestData}>Send Test Data</button>;
};

export default TestDataButton;