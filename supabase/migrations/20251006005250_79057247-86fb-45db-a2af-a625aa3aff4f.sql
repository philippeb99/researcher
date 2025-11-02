-- Phase 1a: Add 'processed' to research_status enum
ALTER TYPE research_status ADD VALUE IF NOT EXISTS 'processed';