-- WARNING: This schema is for context only and is not meant to be run.
-- Table order and constraints may not be valid for execution.

CREATE TABLE public.challenges (
  id uuid NOT NULL DEFAULT uuid_generate_v4(),
  created_at timestamp with time zone DEFAULT now(),
  address text,
  challenge text,
  CONSTRAINT challenges_pkey PRIMARY KEY (id)
);
CREATE TABLE public.contributions (
  contribution_id uuid NOT NULL DEFAULT uuid_generate_v4(),
  created_at timestamp with time zone DEFAULT (now() AT TIME ZONE 'utc'::text),
  task_creator text,
  task_name text,
  task_label text,
  task_description text,
  task_type text,
  project_id uuid,
  tx_id uuid,
  task_sub_group text,
  task_date text,
  task_array_map json,
  CONSTRAINT contributions_pkey PRIMARY KEY (contribution_id),
  CONSTRAINT contributions_project_id_fkey FOREIGN KEY (project_id) REFERENCES public.projects(project_id),
  CONSTRAINT contributions_tx_id_fkey FOREIGN KEY (tx_id) REFERENCES public.transactions(tx_id)
);
CREATE TABLE public.contributors (
  contributor_id text NOT NULL,
  created_at timestamp with time zone DEFAULT now(),
  wallet text,
  first_wallet text,
  updated_at timestamp with time zone DEFAULT now(),
  org text,
  CONSTRAINT contributors_pkey PRIMARY KEY (contributor_id)
);
CREATE TABLE public.dashboard_recognitions_cache (
  project_id uuid NOT NULL,
  recognition_id text NOT NULL,
  task_id text,
  contributor_id text,
  task_name text,
  task_date text,
  label text,
  sub_group text,
  task_creator text,
  amounts jsonb,
  tx_id uuid,
  transaction_hash text,
  transaction_timestamp timestamp with time zone,
  tx_type text,
  created_at timestamp with time zone DEFAULT now(),
  exchange_rate text,
  synced_at timestamp with time zone DEFAULT now(),
  CONSTRAINT dashboard_recognitions_cache_pkey PRIMARY KEY (project_id, recognition_id),
  CONSTRAINT dashboard_recognitions_cache_project_id_fkey FOREIGN KEY (project_id) REFERENCES public.projects(project_id),
  CONSTRAINT dashboard_recognitions_cache_tx_id_fkey FOREIGN KEY (tx_id) REFERENCES public.transactions(tx_id)
);
CREATE TABLE public.discord_voice_attendance_logs (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  username text,
  display_name text,
  user_id text,
  channel_name text,
  channel_id text,
  recorded_at timestamp with time zone DEFAULT now(),
  guild_id text,
  guild_name text,
  CONSTRAINT discord_voice_attendance_logs_pkey PRIMARY KEY (id)
);
CREATE TABLE public.distributions (
  dist_id uuid NOT NULL DEFAULT uuid_generate_v4(),
  created_at timestamp with time zone DEFAULT (now() AT TIME ZONE 'utc'::text),
  project_id uuid,
  contribution_id uuid,
  contributor_id text,
  tx_id uuid,
  tokens json,
  amounts json,
  CONSTRAINT distributions_pkey PRIMARY KEY (dist_id),
  CONSTRAINT distributions_project_id_fkey FOREIGN KEY (project_id) REFERENCES public.projects(project_id),
  CONSTRAINT distributions_contribution_id_fkey FOREIGN KEY (contribution_id) REFERENCES public.contributions(contribution_id),
  CONSTRAINT distributions_contributor_id_fkey FOREIGN KEY (contributor_id) REFERENCES public.contributors(contributor_id),
  CONSTRAINT distributions_tx_id_fkey FOREIGN KEY (tx_id) REFERENCES public.transactions(tx_id)
);
CREATE TABLE public.external_labels (
  id integer NOT NULL DEFAULT nextval('external_labels_id_seq'::regclass),
  label text NOT NULL UNIQUE,
  created_at timestamp with time zone DEFAULT now(),
  CONSTRAINT external_labels_pkey PRIMARY KEY (id)
);
CREATE TABLE public.external_task_data (
  recognition_id bigint NOT NULL,
  task_id bigint NOT NULL,
  date_completed text,
  insert_date text DEFAULT ''::text,
  wallet_owner text,
  group_name text,
  sub_group text,
  task_labels text,
  task_name text,
  status text,
  rewarded boolean DEFAULT false,
  ada numeric DEFAULT 0,
  mins numeric DEFAULT 0,
  agix numeric DEFAULT 0,
  usd numeric DEFAULT 0,
  wallet_address text,
  proof_link text,
  transaction_id text,
  created_at timestamp with time zone DEFAULT (now() AT TIME ZONE 'utc'::text),
  CONSTRAINT external_task_data_pkey PRIMARY KEY (recognition_id)
);
CREATE TABLE public.groups (
  group_id uuid NOT NULL DEFAULT uuid_generate_v4(),
  created_at timestamp with time zone DEFAULT (now() AT TIME ZONE 'utc'::text),
  updated_at timestamp with time zone DEFAULT (now() AT TIME ZONE 'utc'::text),
  group_name text,
  group_info text,
  logo_url text,
  archived boolean,
  CONSTRAINT groups_pkey PRIMARY KEY (group_id)
);
CREATE TABLE public.labels (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  created_at timestamp with time zone DEFAULT now(),
  label text,
  CONSTRAINT labels_pkey PRIMARY KEY (id)
);
CREATE TABLE public.profiles (
  id uuid NOT NULL,
  updated_at timestamp with time zone,
  username text UNIQUE CHECK (char_length(username) >= 3),
  full_name text,
  avatar_url text,
  website text,
  role uuid,
  CONSTRAINT profiles_pkey PRIMARY KEY (id),
  CONSTRAINT profiles_id_fkey FOREIGN KEY (id) REFERENCES auth.users(id)
);
CREATE TABLE public.projects (
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  project_name text,
  project_type text,
  budget_items json,
  website text,
  wallet text,
  project_id uuid NOT NULL DEFAULT uuid_generate_v4(),
  group_id uuid,
  archived boolean,
  budgets json,
  core_token text DEFAULT 'ADA'::text,
  discord_msg json DEFAULT '{"extra_fields":"none","footer":"default"}'::json,
  carry_over_amounts json,
  CONSTRAINT projects_pkey PRIMARY KEY (project_id),
  CONSTRAINT projects_group_id_fkey FOREIGN KEY (group_id) REFERENCES public.groups(group_id)
);
CREATE TABLE public.snet_sc_token_allocation (
  month text NOT NULL,
  sc_allocation double precision,
  ambassador_allocation double precision,
  CONSTRAINT snet_sc_token_allocation_pkey PRIMARY KEY (month)
);
CREATE TABLE public.subgroups (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  created_at timestamp with time zone DEFAULT now(),
  sub_group text,
  project_id uuid DEFAULT gen_random_uuid(),
  budgets json,
  updated_at timestamp with time zone DEFAULT (now() AT TIME ZONE 'utc'::text),
  sub_group_data json,
  CONSTRAINT subgroups_pkey PRIMARY KEY (id),
  CONSTRAINT subgroups_project_id_fkey FOREIGN KEY (project_id) REFERENCES public.projects(project_id)
);
CREATE TABLE public.tokens (
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  asset_name text,
  asset_type text,
  fingerprint text,
  ticker text,
  decimals integer DEFAULT 0,
  unit text NOT NULL,
  policy_id text,
  coingecko_name text,
  CONSTRAINT tokens_pkey PRIMARY KEY (unit)
);
CREATE TABLE public.transactioninfo (
  created_at timestamp with time zone DEFAULT now(),
  txinfo json,
  txhash text,
  metadata json,
  txfilepath text,
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  CONSTRAINT transactioninfo_pkey PRIMARY KEY (id)
);
CREATE TABLE public.transactions (
  tx_id uuid NOT NULL DEFAULT uuid_generate_v4(),
  created_at timestamp with time zone DEFAULT (now() AT TIME ZONE 'utc'::text),
  transaction_date text,
  transaction_id text,
  project_id uuid,
  updated_at timestamp with time zone DEFAULT (now() AT TIME ZONE 'utc'::text),
  wallet_balance_after double precision,
  md_version text,
  tx_json_url text,
  exchange_rate text,
  total_ada double precision,
  recipients bigint,
  fee double precision DEFAULT '0'::double precision,
  epoch_no bigint,
  stake_address_id bigint,
  tx_type text,
  tx_json json,
  total_tokens json,
  total_amounts json,
  monthly_budget_balance json,
  CONSTRAINT transactions_pkey PRIMARY KEY (tx_id),
  CONSTRAINT transactions_project_id_fkey FOREIGN KEY (project_id) REFERENCES public.projects(project_id)
);
CREATE TABLE public.tx_json_generator_data (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  raw_data json,
  processed_data json,
  reward_status boolean,
  project_wallet text,
  transaction_id text,
  recognition_ids json,
  errors json,
  CONSTRAINT tx_json_generator_data_pkey PRIMARY KEY (id)
);
CREATE TABLE public.users (
  id text NOT NULL,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  CONSTRAINT users_pkey PRIMARY KEY (id)
);
CREATE TABLE public.wallets (
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  wallet text,
  username text,
  project text NOT NULL,
  full_username text NOT NULL,
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  user_id uuid DEFAULT auth.uid(),
  CONSTRAINT wallets_pkey PRIMARY KEY (id)
);