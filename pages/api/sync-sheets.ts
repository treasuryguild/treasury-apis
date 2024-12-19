// pages/api/sync-sheets.ts
import { createClient } from '@supabase/supabase-js';
import type { NextApiRequest, NextApiResponse } from 'next';
import axios, { AxiosError } from 'axios';

// Initialize Supabase client
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL2!;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY2!;
const supabase = createClient(supabaseUrl, supabaseKey);

// Define interfaces for the data structures
interface SOMReview {
  outputs_approves: boolean;
  success_criteria_approves: boolean;
  evidence_approves: boolean;
  current: boolean;
}

interface POAReview {
  content_approved: boolean;
  current: boolean;
}

interface Signoff {
  created_at: string;
}

interface POA {
  poas_reviews: POAReview[];
  signoffs: Signoff[];
}

interface MilestoneData {
  month: string;
  cost: number;
  completion: number;
  som_reviews: SOMReview[];
  poas: POA[];
}

interface SnapshotData {
  title: string;
  project_id: number;
  milestone: number;
  month: string;
  cost: number;
  completion: number;
  budget: number;
  funds_distributed: number;
  som_signoff_count: number;
  poa_signoff_count: number;
}

interface FormattedData {
  title: string;
  project_id: number;
  milestone: number;
  month: string;
  cost: number;
  completion: number;
  budget: number;
  funds_distributed: number;
  som_signoff_count: number;
  poa_signoff_count: number;
  outputs_approved: boolean;
  success_criteria_approved: boolean;
  evidence_approved: boolean;
  poa_content_approved: boolean;
}

interface SheetsResponse {
  status: string;
  message: string;
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  console.log('API route called');
  
  if (req.method !== 'POST') {
    console.log('Method not allowed:', req.method);
    return res.status(405).json({ message: 'Method not allowed' });
  }

  try {
    console.log('Supabase URL available:', !!process.env.NEXT_PUBLIC_SUPABASE_URL2);
    console.log('Supabase key available:', !!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY2);

    console.log('Fetching milestone data...');
    const { data: milestoneData, error: milestoneError } = await supabase
      .from('soms')
      .select(`
        month,
        cost,
        completion,
        som_reviews(outputs_approves,success_criteria_approves,evidence_approves,current),
        poas(poas_reviews(content_approved,current),signoffs(created_at))
      `)
      .eq('proposal_id', 173)
      .eq('milestone', 5)
      .eq('som_reviews.current', true)
      .eq('poas.poas_reviews.current', true)
      .order('created_at', { ascending: false })
      .limit(1);

    if (milestoneError) {
      console.error('Milestone error:', milestoneError);
      throw milestoneError;
    }

    console.log('Milestone data received:', !!milestoneData);

    console.log('Fetching snapshot data...');
    const snapshotResponse = await axios({
      method: 'POST',
      url: `${supabaseUrl}/rest/v1/rpc/getproposalsnapshot`,
      headers: {
        'apikey': supabaseKey,
        'Authorization': `Bearer ${supabaseKey}`,
        'Content-Type': 'application/json',
        'Content-Profile': 'public',
        'x-client-info': 'supabase-js/2.2.3'
      },
      data: { _project_id: "1000107" }
    });

    const snapshotData = snapshotResponse.data as SnapshotData[];
    console.log('Snapshot data received:', !!snapshotData);

    const formattedData: FormattedData[] = snapshotData.map(snapshot => ({
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

    console.log('Google Script URL available:', !!process.env.NEXT_PUBLIC_GOOGLE_SCRIPT_URL);

    console.log('Sending to Google Sheets...');
    try {
      console.log('Data being sent to sheets:', formattedData);
      
      const sheetsResponse = await axios.post<SheetsResponse>(
        process.env.NEXT_PUBLIC_GOOGLE_SCRIPT_URL!,
        formattedData,
        {
          headers: {
            'Content-Type': 'application/json',
          }
        }
      );
      
      console.log('Google Sheets response:', sheetsResponse.data);
      
      if (sheetsResponse.data.status === 'error') {
        throw new Error(`Google Sheets error: ${sheetsResponse.data.message}`);
      }
      
      return res.status(200).json({ 
        success: true, 
        message: 'Sheet updated successfully',
        data: formattedData,
        sheetsResponse: sheetsResponse.data
      });
    } catch (error) {
      const sheetsError = error as Error | AxiosError;
      console.error('Google Sheets error:', 
        axios.isAxiosError(sheetsError) 
          ? sheetsError.response?.data || sheetsError.message
          : sheetsError.message
      );
      throw sheetsError;
    }
  } catch (error) {
    console.error('Error in API route:', error);
    return res.status(500).json({ 
      success: false, 
      message: 'Failed to sync data',
      error: String(error)
    });
  }
}