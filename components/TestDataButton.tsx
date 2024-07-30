// components/TestDataButton.tsx
import { FC } from 'react';
import axios from 'axios';

interface TestDataButtonProps {
  testData: {
    id: number;
    value: string;
  };
}

const API_KEY = process.env.NEXT_PUBLIC_SERVER_API_KEY;

const TestDataButton: FC<TestDataButtonProps> = ({ testData }) => {
  const sendTestData = async () => {
    try {
      const response = await axios.post('/api/txJsonGenerator', testData, {
        headers: {
          'Authorization': `Bearer ${API_KEY}`
        }
      });
      console.log("Response from server:", response.data);
      alert("Data sent successfully!");
    } catch (error) {
      console.error("Error sending data:", error);
      alert("Error sending data. Check the console for details.");
    }
  };

  return <button onClick={sendTestData}>Send Test Data</button>;
};

export default TestDataButton;
