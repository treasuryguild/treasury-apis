// types/recognition.ts
export interface Recognition {
  transaction_hash: string;
  transaction_timestamp: string;
  tx_id: string;
  contribution_id: string;
  created_at: string;
  contributor_id: string;
  task_name: string;
  date?: string;
  label?: string;
  subGroup?: string;
  taskCreator?: string;
  amounts: Record<string, number>;
  exchange_rate: number;
}

export interface ApiResponse {
  data: any[];
  recognitions: Recognition[];
  metadata: {
    total: number;
    appliedFilters: {
      contributor_id: string | null;
      subgroup: string | null;
      task_name: string | null;
      dateRange: {
        startDate: string;
        endDate: string;
      } | null;
    };
  };
}

export interface QueryConfig {
  name: string;
  query: string;
  endpoint: string;
}