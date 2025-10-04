-- Migration script to add multi-guild support to Discord voice attendance logs
-- Run this script in your Supabase SQL editor

-- Add guild_id and guild_name columns to the discord_voice_attendance_logs table
ALTER TABLE discord_voice_attendance_logs 
ADD COLUMN IF NOT EXISTS guild_id TEXT,
ADD COLUMN IF NOT EXISTS guild_name TEXT;

-- Create an index on guild_id for better query performance
CREATE INDEX IF NOT EXISTS idx_discord_voice_attendance_logs_guild_id 
ON discord_voice_attendance_logs(guild_id);

-- Create a composite index for common query patterns
CREATE INDEX IF NOT EXISTS idx_discord_voice_attendance_logs_guild_channel 
ON discord_voice_attendance_logs(guild_id, channel_id);

-- Add a comment to document the new columns
COMMENT ON COLUMN discord_voice_attendance_logs.guild_id IS 'Discord Guild (Server) ID where the voice activity occurred';
COMMENT ON COLUMN discord_voice_attendance_logs.guild_name IS 'Discord Guild (Server) name for easier identification';

-- Optional: Update existing records if you have any
-- This will set guild_id and guild_name to NULL for existing records
-- You may want to manually update these if you know which guild they belong to
UPDATE discord_voice_attendance_logs 
SET guild_id = NULL, guild_name = NULL 
WHERE guild_id IS NULL;
