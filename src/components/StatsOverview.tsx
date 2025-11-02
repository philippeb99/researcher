import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { TrendingUp, Building2, Users } from "lucide-react";
import { useStatsData } from "@/hooks/useStatsData";
import { Skeleton } from "@/components/ui/skeleton";

interface StatCardProps {
  title: string;
  value: string;
  change: string;
  icon: React.ReactNode;
  trend: "up" | "down" | "neutral";
}

const StatCard = ({ title, value, change, icon, trend }: StatCardProps) => {
  const trendColors = {
    up: "text-success",
    down: "text-destructive",
    neutral: "text-muted-foreground",
  };

  return (
    <Card className="shadow-card bg-gradient-card border-border">
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium text-muted-foreground">{title}</CardTitle>
        <div className="text-primary">{icon}</div>
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold text-foreground">{value}</div>
        <p className={`text-xs ${trendColors[trend]} flex items-center gap-1`}>
          <TrendingUp className="w-3 h-3" />
          {change} from last month
        </p>
      </CardContent>
    </Card>
  );
};

const StatsOverview = () => {
  const { data: statsData, isLoading } = useStatsData();

  const stats = [
    {
      title: "Total Research",
      value: statsData?.totalResearch?.toString() || "0",
      change: "tracked in real-time",
      icon: <Building2 className="w-4 h-4" />,
      trend: "neutral" as const,
    },
    {
      title: "Companies Analyzed",
      value: statsData?.companiesAnalyzed?.toString() || "0",
      change: "completed research",
      icon: <TrendingUp className="w-4 h-4" />,
      trend: "neutral" as const,
    },
    {
      title: "Key Contacts",
      value: statsData?.keyContacts?.toString() || "0",
      change: "executives identified",
      icon: <Users className="w-4 h-4" />,
      trend: "neutral" as const,
    },
  ];

  if (isLoading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {[1, 2, 3].map((i) => (
          <Card key={i} className="shadow-card bg-gradient-card border-border">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <Skeleton className="h-4 w-24" />
              <Skeleton className="h-4 w-4" />
            </CardHeader>
            <CardContent>
              <Skeleton className="h-8 w-16 mb-2" />
              <Skeleton className="h-3 w-20" />
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

 
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-3">
      {stats.map((stat, index) => (
        <StatCard key={index} {...stat} />
      ))}
    </div>
  );
};

export default StatsOverview;