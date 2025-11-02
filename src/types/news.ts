export interface NewsItem {
  id: string;
  research_job_id: string;
  title: string;
  url: string;
  summary: string;
  keywords?: string[];
  published_date?: string;
  confidence_level?: 'high' | 'medium' | 'low';
  executive_id?: string;
  created_at: string;
  source_domain?: string;
  snippet?: string;
  relevance_score?: number;
  source_credibility_score?: number;
}