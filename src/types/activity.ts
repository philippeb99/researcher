export type ActivityType = "email" | "phone" | "linkedin" | "meeting" | "other";
export type ActivityStatus = "new" | "in_progress" | "complete" | "cancelled" | "scheduled";
export type ContactStatus = string; // Dynamic, loaded from contact_statuses table

export interface ContactStatusDefinition {
  id: string;
  value: string;
  label: string;
  color: string;
  sort_order: number;
  is_system: boolean;
  created_at: string;
  updated_at: string;
}

export interface ContactActivity {
  id: string;
  research_job_id: string;
  activity_type: ActivityType;
  notes: string;
  status: ActivityStatus;
  created_at: string;
  updated_at: string;
  created_by: string;
}
