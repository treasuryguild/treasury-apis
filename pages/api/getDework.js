import axios from 'axios';

export default async function handler(req, res) {
  const workspace = req.query.workspace;  // d88291a1-7741-4177-aac4-87813f72cade
  
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

    res.status(200).json(response.data);
  } catch (error) {
    console.error('Error fetching data:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
}
