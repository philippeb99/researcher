-- Add 'research only' value to contact_status enum
ALTER TYPE contact_status ADD VALUE IF NOT EXISTS 'research only';