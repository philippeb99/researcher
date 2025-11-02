import { Card } from "@/components/ui/card";
import { Loader2, TrendingUp, Users, Briefcase, Target } from "lucide-react";
import { useHistoricalInsights } from "@/hooks/useHistoricalInsights";

interface HistoricalInsightsProps {
  researchJobId: string;
}

export const HistoricalInsights = ({ researchJobId }: HistoricalInsightsProps) => {
  const { data, isLoading, error } = useHistoricalInsights(researchJobId);

  if (isLoading) {
    return (
      <Card className="p-6">
        <div className="flex items-center justify-center">
          <Loader2 className="h-6 w-6 animate-spin" />
          <span className="ml-2">Loading historical insights...</span>
        </div>
      </Card>
    );
  }

  if (error) {
    return (
      <Card className="p-6">
        <p className="text-destructive">Failed to load insights</p>
      </Card>
    );
  }

  if (!data?.insights) return null;

  const insights = data.insights;

  return (
    <div className="space-y-4">
      <Card className="p-6">
        <div className="flex items-center gap-2 mb-4">
          <TrendingUp className="h-5 w-5 text-primary" />
          <h3 className="text-lg font-semibold">AI Insights & Recommendations</h3>
        </div>
        <div className="prose prose-sm max-w-none">
          <p className="whitespace-pre-wrap text-muted-foreground">{insights.ai_summary}</p>
        </div>
        {insights.success_rate && (
          <div className="mt-4 p-3 bg-muted rounded-lg">
            <p className="text-sm">
              <strong>Success Rate from Similar Companies:</strong> {insights.success_rate}%
            </p>
          </div>
        )}
      </Card>

      {insights.similar_companies?.length > 0 && (
        <Card className="p-6">
          <div className="flex items-center gap-2 mb-4">
            <Briefcase className="h-5 w-5 text-primary" />
            <h3 className="text-lg font-semibold">Similar Companies ({insights.similar_companies.length})</h3>
          </div>
          <div className="space-y-3">
            {insights.similar_companies.map((company: any, idx: number) => (
              <div key={idx} className="p-3 border rounded-lg">
                <div className="flex justify-between items-start">
                  <div>
                    <p className="font-medium">{company.company_name}</p>
                    <p className="text-sm text-muted-foreground">{company.location}</p>
                  </div>
                  {company.contact_status && (
                    <span className="text-xs px-2 py-1 bg-muted rounded">
                      {company.contact_status}
                    </span>
                  )}
                </div>
                {company.market_position && (
                  <p className="text-sm mt-2 text-muted-foreground line-clamp-2">
                    {company.market_position}
                  </p>
                )}
              </div>
            ))}
          </div>
        </Card>
      )}

      {insights.executive_patterns?.length > 0 && (
        <Card className="p-6">
          <div className="flex items-center gap-2 mb-4">
            <Users className="h-5 w-5 text-primary" />
            <h3 className="text-lg font-semibold">Executive Patterns ({insights.executive_patterns.length})</h3>
          </div>
          <div className="space-y-2">
            {insights.executive_patterns.map((exec: any, idx: number) => (
              <div key={idx} className="p-2 border-l-2 border-primary/30 pl-3">
                <p className="text-sm font-medium">{exec.name} - {exec.position}</p>
                {exec.interests && (
                  <p className="text-xs text-muted-foreground">{exec.interests}</p>
                )}
              </div>
            ))}
          </div>
        </Card>
      )}

      {insights.industry_trends?.length > 0 && (
        <Card className="p-6">
          <div className="flex items-center gap-2 mb-4">
            <Target className="h-5 w-5 text-primary" />
            <h3 className="text-lg font-semibold">Industry Trends ({insights.industry_trends.length})</h3>
          </div>
          <div className="space-y-2">
            {insights.industry_trends.map((trend: any, idx: number) => (
              <div key={idx} className="p-2 bg-muted/50 rounded">
                <p className="text-sm font-medium">{trend.company_name}</p>
                {trend.recent_developments && (
                  <p className="text-xs text-muted-foreground line-clamp-2">
                    {trend.recent_developments}
                  </p>
                )}
              </div>
            ))}
          </div>
        </Card>
      )}
    </div>
  );
};
