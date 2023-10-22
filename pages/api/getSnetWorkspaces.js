// pages/api/getSnetWorkspaces.js
import axios from 'axios';

export default async function handler(req, res) {
    const SERVER_API_KEY = process.env.SERVER_API_KEY;
    const apiKeyHeader = req.headers['api_key'];
  
    if (!apiKeyHeader || apiKeyHeader !== SERVER_API_KEY) {
      return res.status(403).json({ error: 'Forbidden' });
    }

    async function getDework(id, orgSlug, workspaceSlug) {
    const workspace = id;  // d88291a1-7741-4177-aac4-87813f72cade
    
    // Your existing GraphQL query
    const query = `
      query GetWorkspaceTasksQuery {
        getWorkspace(id: "${workspace}") {
          id
          tasks(filter: { statuses: [IN_REVIEW] }) {
            id
            name
            assignees {
              id
              username
            }
            auditLog {
              createdAt
              diff
            }
            createdAt
            creator {
              id
              username
            }
            deletedAt
            doneAt
            dueDate
            owners {
              id
              username
            }
            status
            storyPoints
            tags {
              label
            }
            subtasks {
              id
              name
              status
              storyPoints
            }
          }
        }
      }
    `;
  
    // Your existing headers
    const headers = {
      'Content-Type': 'application/json',
      'Authorization': process.env.DEWORK_AUTH,
    };
  
    try {
      const response = await axios.post('https://api.deworkxyz.com/graphql?op=GetWorkspaceTasksQuery', {
        query,
      }, {
        headers,
      });
  
     // Add task_url to each task
     if (response.data.data.getWorkspace && Array.isArray(response.data.data.getWorkspace.tasks)) {
        response.data.data.getWorkspace.tasks.forEach(task => {
          task.task_url = `https://app.dework.xyz/${orgSlug}/${workspaceSlug}?taskId=${task.id}`;
        });
      }
  
      return response.data;  
    } catch (error) {
      console.error('Error fetching data:', error);
      return null;
    }
  }
  
  function transformWorkspaces(workspaces, organizationName, orgSlug) {
    let result = {};
  
    workspaces.forEach(workspace => {
      const key = workspace.name.replace(/[^\w\s]/gi, '').replace(/\s+/g, '');
      result[key] = {
        id: workspace.id,
        name: workspace.name,
        workspace_slug: workspace.slug,
        org_slug: orgSlug,
        tasks: []
      };
    });
  
    return result;
  }

  async function fetchOrganizationDetails() {
    const organizationId = '5c29434c-e830-442b-b9f5-d2fb00ee7b34'; // You can fetch from req.body if it's a POST
    
    const query = `
      query GetOrganizationDetailsQuery {
        getOrganization(id: "${organizationId}") {
          slug
          name
          workspaces {
            id
            name
            slug
          }
        }
      }
    `;
    
    const headers = {
      'Content-Type': 'application/json',
      'Authorization': process.env.DEWORK_AUTH,
    };
  
    try {
      const response = await axios.post('https://api.deworkxyz.com/graphql?op=GetOrganizationDetailsQuery', {
        query,
      }, {
        headers,
      });
      
      const organization = response.data.data.getOrganization;
      return transformWorkspaces(organization.workspaces, organization.name, organization.slug);  // Return transformed workspaces
    } catch (error) {
      console.error('Error fetching organization details:', error);
      return null;
    }
  }

  let snet = await fetchOrganizationDetails();
  
  const fetchAllTasks = Object.keys(snet).map(async (key) => {
    const workspace = snet[key];
    if (!workspace) return;

    const tasksResponse = await getDework(workspace.id, workspace.org_slug, workspace.workspace_slug);
    
    if (tasksResponse && tasksResponse.data && tasksResponse.data.getWorkspace) {
      workspace.tasks = tasksResponse.data.getWorkspace.tasks.filter(task => {
        if (!task.tags || task.tags.length === 0) {
          return false;
        }
  
        return task.tags.some(tag => {
          const labelLower = tag.label.toLowerCase();
          return labelLower.includes('audited') || labelLower.includes('fund request');
        });
      });
    }
  });
  
  // Wait for all tasks to be fetched
  await Promise.all(fetchAllTasks);
  
  const filteredSnet = Object.fromEntries(
    Object.entries(snet).filter(([key, workspace]) => workspace.tasks && workspace.tasks.length > 0)
  );
  
  res.status(200).json(filteredSnet);
}