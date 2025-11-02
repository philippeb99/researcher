-- Clean up any existing fictional executive data
-- This will remove all existing executives to eliminate AI hallucinations
-- The new process will only add verified executives (CEO and real web-searched executives)

-- Clear all existing executives to start fresh with verified data only
DELETE FROM executives;