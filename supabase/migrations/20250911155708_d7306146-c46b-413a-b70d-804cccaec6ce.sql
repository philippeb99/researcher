-- Clean up any existing fictional news data
-- This will remove all existing news items to eliminate AI-generated fake news with non-working URLs
-- The new process will only add verified news articles from real sources

-- Clear all existing news items to start fresh with verified data only
DELETE FROM news_items;