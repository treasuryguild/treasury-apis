// components/SnetWorkspacesTestButton.tsx
import React from 'react';
import axios from 'axios';

const SnetWorkspacesTestButton: React.FC = () => {
  const testSnetWorkspaces = async () => {
    try {
      const response = await axios.get('/api/getSnetWorkspaces', {
        headers: {
          'api_key': process.env.NEXT_PUBLIC_SERVER_API_KEY
        }
      });
      console.log("Snet Workspaces:", response.data);
      alert("Snet Workspaces fetched successfully. Check the console for details.");
    } catch (error) {
      console.error("Error fetching Snet Workspaces:", error);
      alert("Error fetching Snet Workspaces. Check the console for details.");
    }
  };

  return <button onClick={testSnetWorkspaces}>Test Snet Workspaces API</button>;
};

export default SnetWorkspacesTestButton;