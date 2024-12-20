// scripts/sync-projects.js
const { createClient } = require('@supabase/supabase-js');
const axios = require('axios');

// Initialize Supabase client
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL2;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY2;
const supabase = createClient(supabaseUrl, supabaseKey);

async function fetchMilestoneData(projectId) {
  const { data, error } = await supabase
    .from('soms')
    .select(`
      month,
      cost,
      completion,
      som_reviews(outputs_approves,success_criteria_approves,evidence_approves,current),
      poas(poas_reviews(content_approved,current),signoffs(created_at))
    `)
    .eq('proposal_id', projectId)
    .eq('som_reviews.current', true)
    .eq('poas.poas_reviews.current', true)
    .order('created_at', { ascending: false })
    .limit(1);

  if (error) throw error;
  return data;
}

async function fetchSnapshotData(projectId) {
  const response = await axios({
    method: 'POST',
    url: `${supabaseUrl}/rest/v1/rpc/getproposalsnapshot`,
    headers: {
      'apikey': supabaseKey,
      'Authorization': `Bearer ${supabaseKey}`,
      'Content-Type': 'application/json',
      'Content-Profile': 'public',
      'x-client-info': 'supabase-js/2.2.3'
    },
    data: { _project_id: projectId }
  });
  return response.data;
}

async function updateGoogleSheets(formattedData) {
  const response = await axios.post(
    process.env.NEXT_PUBLIC_GOOGLE_SCRIPT_URL,
    formattedData,
    {
      headers: {
        'Content-Type': 'application/json',
      }
    }
  );
  return response.data;
}

async function processProject(projectId) {
  console.log(`Processing project ${projectId}...`);
  
  try {
    const [milestoneData, snapshotData] = await Promise.all([
      fetchMilestoneData(projectId),
      fetchSnapshotData(projectId)
    ]);

    return snapshotData.map(snapshot => ({
      title: snapshot.title,
      project_id: snapshot.project_id,
      milestone: snapshot.milestone,
      month: snapshot.month,
      cost: snapshot.cost,
      completion: snapshot.completion,
      budget: snapshot.budget,
      funds_distributed: snapshot.funds_distributed,
      som_signoff_count: snapshot.som_signoff_count,
      poa_signoff_count: snapshot.poa_signoff_count,
      outputs_approved: milestoneData?.[0]?.som_reviews?.[0]?.outputs_approves || false,
      success_criteria_approved: milestoneData?.[0]?.som_reviews?.[0]?.success_criteria_approves || false,
      evidence_approved: milestoneData?.[0]?.som_reviews?.[0]?.evidence_approves || false,
      poa_content_approved: milestoneData?.[0]?.poas?.[0]?.poas_reviews?.[0]?.content_approved || false
    }));
  } catch (error) {
    console.error(`Error processing project ${projectId}:`, error);
    throw error;
  }
}

async function main() {
  const projectIds = (process.env.PROJECT_IDS || '1000107').split(',');
  let allFormattedData = [];

  for (const projectId of projectIds) {
    try {
      const projectData = await processProject(projectId.trim());
      allFormattedData = [...allFormattedData, ...projectData];
    } catch (error) {
      console.error(`Failed to process project ${projectId}:`, error);
      // Continue with other projects even if one fails
    }
  }

  if (allFormattedData.length > 0) {
    try {
      const result = await updateGoogleSheets(allFormattedData);
      console.log('Sheets update result:', result);
    } catch (error) {
      console.error('Failed to update Google Sheets:', error);
      process.exit(1);
    }
  }
}

main().catch(error => {
  console.error('Script failed:', error);
  process.exit(1);
});