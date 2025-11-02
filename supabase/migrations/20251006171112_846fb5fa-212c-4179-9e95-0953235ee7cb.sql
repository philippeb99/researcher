-- Migrate contact_status column from ENUM to TEXT to support dynamic statuses
-- Step 1: Add a temporary TEXT column
ALTER TABLE research_jobs ADD COLUMN contact_status_new TEXT;

-- Step 2: Copy data from the ENUM column to the new TEXT column
UPDATE research_jobs SET contact_status_new = contact_status::TEXT;

-- Step 3: Drop the old ENUM column
ALTER TABLE research_jobs DROP COLUMN contact_status;

-- Step 4: Rename the new column to contact_status
ALTER TABLE research_jobs RENAME COLUMN contact_status_new TO contact_status;

-- Step 5: Add foreign key constraint to ensure only valid statuses from contact_statuses table
ALTER TABLE research_jobs 
  ADD CONSTRAINT fk_contact_status 
  FOREIGN KEY (contact_status) 
  REFERENCES contact_statuses(value) 
  ON DELETE RESTRICT 
  ON UPDATE CASCADE;

-- Step 6: Add index for performance
CREATE INDEX idx_research_jobs_contact_status ON research_jobs(contact_status);