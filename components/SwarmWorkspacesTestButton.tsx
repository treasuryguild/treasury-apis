// components/SwarmWorkspacesTestButton.tsx
import React from 'react';
import axios from 'axios';

const SwarmWorkspacesTestButton: React.FC = () => {
  const testSwarmWorkspaces = async () => {
    try {
      const response = await axios.get('/api/getSwarmWorkspaces', {
        headers: {
          'api_key': process.env.NEXT_PUBLIC_SERVER_API_KEY
        }
      });
      console.log("Swarm Workspaces:", response.data);
      alert("Swarm Workspaces fetched successfully. Check the console for details.");
    } catch (error) {
      console.error("Error fetching Swarm Workspaces:", error);
      alert("Error fetching Swarm Workspaces. Check the console for details.");
    }
  };

  return <button onClick={testSwarmWorkspaces}>Test Swarm Workspaces API</button>;
};

export default SwarmWorkspacesTestButton;