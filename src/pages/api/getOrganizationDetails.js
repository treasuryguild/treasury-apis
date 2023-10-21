import axios from 'axios';

function getPrefix(organizationName) {
  const lowercaseName = organizationName.toLowerCase();
  if (lowercaseName.includes('singularitynet ambassador program')) {
    return 'snet';
  } else if (lowercaseName.includes('swarm')) {
    return 'swarm';
  } else {
    return 'defaultPrefix';
  }
}

function transformWorkspaces(workspaces, organizationName) {
  const prefix = getPrefix(organizationName);
  let result = {};

  workspaces.forEach(workspace => {
    const key = prefix + workspace.name.replace(/[^\w\s]/gi, '').replace(/\s+/g, '');
    result[key] = {
      id: workspace.id,
      name: workspace.name,
      slug: workspace.slug,
      tasks: []
    };
  });

  return result;
}

export default async function handler(req, res) {
  const organizationId = req.query.organizationId || "defaultId"; // You can fetch from req.body if it's a POST
  
  const query = `
    query GetOrganizationDetailsQuery {
      getOrganization(id: "${organizationId}") {
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
    const transformedWorkspaces = transformWorkspaces(organization.workspaces, organization.name);

    res.status(200).json(transformedWorkspaces);
  } catch (error) {
    console.error('Error fetching organization details:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
}
