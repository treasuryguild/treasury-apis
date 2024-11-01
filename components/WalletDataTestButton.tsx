// components/WalletDataTestButton.tsx
import React from 'react';
import axios from 'axios';

const WalletDataTestButton: React.FC = () => {
  const testWalletData = async () => {
    try {
      const response = await axios.get('/api/getGWallets', {
        headers: {
          'api_key': process.env.NEXT_PUBLIC_SERVER_API_KEY
        }
      });
      console.log("Wallet Data:", response.data);
      alert("Wallet data fetched successfully. Check the console for details.");
    } catch (error) {
      console.error("Error fetching Wallet Data:", error);
      alert("Error fetching Wallet Data. Check the console for details.");
    }
  };

  return <button onClick={testWalletData}>Test Wallet Data API</button>;
};

export default WalletDataTestButton;