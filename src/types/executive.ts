export interface Executive {
  id: string;
  name: string;
  position: string;
  linkedin_url?: string;
  summary?: string;
  history?: string;
  interests?: string;
  keywords?: string[];
  confidence_level?: 'high' | 'medium' | 'low';
  awards_recognition?: string;
  key_interests?: string;
  research_job_id?: string;
  created_at?: string;
  updated_at?: string;
}