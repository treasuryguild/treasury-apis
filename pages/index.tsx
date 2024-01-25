import { useState, useEffect } from "react";
import type { NextPage } from "next";
import { useMyVariable } from '../context/MyVariableContext';
import styles from '../styles/OrgCard.module.css';
import { getIssues } from '../utils/getIssues';
import axios from 'axios';

interface Task {
  id: string;
  status: string;
  // add other properties here
}

interface Workspace {
  id: string;
  name: string;
  slug: string;
  tasks: Task[];
  // add other properties here
}

interface TasksResponse {
  data: {
    getWorkspace: {
      tasks: any; // Replace with the actual task type
    };
  };
}

const Home: NextPage = () => {
  const { myVariable, setMyVariable } = useMyVariable();
  const orgSNET = '5c29434c-e830-442b-b9f5-d2fb00ee7b34'
  const orgSwarm = '67bd2c66-8ee8-4e2e-a22b-6cdc5d805a85'

  async function testIssues() {
    const issues = await getIssues();
    console.log("issues", issues)
  }

  async function getSNETDework(id: string): Promise<TasksResponse> {
    try {
      const response = await axios.get(`/api/getDework?workspace=${id}`); // Assuming you pass the id as a query parameter
      console.log("Data received:", response.data);
      return response.data; // Assuming response.data is of type TasksResponse
    } catch (error) {
      console.error("Error:", error);
      throw error; // You can throw the error or return a default value
    }
  }  

  async function fetchOrganizationDetails(): Promise<Workspace[]> {
    const organizationId = '5c29434c-e830-442b-b9f5-d2fb00ee7b34'; // SNET
    try {
      const response = await axios.get(`/api/getOrganizationDetails?organizationId=${organizationId}`);
      console.log("Organization Details:", response.data);
      return response.data; // Assuming response.data is of type Workspace[]
    } catch (error) {
      console.error("Error:", error);
      return []; // Return an empty array as a fallback
    }
  }
  

  async function getsnetWorkspaces() {
    let snet: Workspace[] = await fetchOrganizationDetails();
    
    for (const key in snet) {
      const workspace = snet[key];
      
      if (!workspace) continue;
  
      // Now, tasksResponse should be of type TasksResponse, not void.
      const tasksResponse = await getSNETDework(workspace.id);
    
      if (tasksResponse && tasksResponse.data && tasksResponse.data.getWorkspace) {
        workspace.tasks = tasksResponse.data.getWorkspace.tasks;
      }
    }
  }

  const SERVER_API_KEY = process.env.SERVER_API_KEY; // Make sure to securely store your API key in environment variables

async function fetchSnetWorkspaces() {
  try {
    const response = await axios.get('/api/getSnetWorkspaces', {
      headers: {
        'api_key': SERVER_API_KEY
      }
    });
    console.log("Snet Workspaces:", response.data);
    return response.data;
  } catch (error) {
    console.error("Error:", error);
    return [];
  }
}


  async function fetchSwarmWorkspaces() {
    try {
      const response = await axios.get('/api/getSwarmWorkspaces');
      console.log("Swarm Workspaces:", response.data);
      return response.data;
    } catch (error) {
      console.error("Error:", error);
      return [];
    }
  }
  
  const fetchExcelData = async () => {
    try {
      const response = await axios.get('/api/read-excel');
      console.log(response.data); // Process your data here
    } catch (error) {
      console.error('Error fetching data:', error);
    }
  };

  useEffect(() => {
    //testIssues();
    //fetchSwarmWorkspaces();
    //fetchSnetWorkspaces()
    //getSNETDework("e155ee05-6d6e-49be-ae6c-93d6a36d4d41")
    //getsnetWorkspaces();
    //fetchExcelData();
  }, []);

  return (
    <div>
      <div className={styles.orgscontainer}>
      test
      </div>
    </div>
  );
};

export default Home;