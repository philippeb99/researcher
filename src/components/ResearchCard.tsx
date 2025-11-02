import { Button } from "@/components/ui/button";
import { Card, CardContent, CardFooter, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Building2, Users, TrendingUp, Clock, MoreVertical } from "lucide-react";

interface ResearchCardProps {
  title: string;
  company: string;
  status: "completed" | "processing" | "pending";
  createdAt: string;
  insights: number;
  contacts: number;
}

const ResearchCard = ({ title, company, status, createdAt, insights, contacts }: ResearchCardProps) => {
  const statusColors = {
    completed: "bg-success text-success-foreground",
    processing: "bg-warning text-warning-foreground",
    pending: "bg-muted text-muted-foreground",
  };

  return (
    <Card className="shadow-card hover:shadow-elevated transition-smooth border-border bg-gradient-card">
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <div className="space-y-1">
            <h3 className="font-semibold text-foreground line-clamp-1">{title}</h3>
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Building2 className="w-4 h-4" />
              {company}
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Badge className={statusColors[status]} variant="secondary">
              {status}
            </Badge>
            <Button variant="ghost" size="icon" className="h-8 w-8">
              <MoreVertical className="w-4 h-4" />
            </Button>
          </div>
        </div>
      </CardHeader>
      
      <CardContent className="pb-3">
        <div className="grid grid-cols-2 gap-4">
          <div className="flex items-center gap-2 text-sm">
            <TrendingUp className="w-4 h-4 text-primary" />
            <span className="text-muted-foreground">Insights:</span>
            <span className="font-medium text-foreground">{insights}</span>
          </div>
          <div className="flex items-center gap-2 text-sm">
            <Users className="w-4 h-4 text-secondary" />
            <span className="text-muted-foreground">Contacts:</span>
            <span className="font-medium text-foreground">{contacts}</span>
          </div>
        </div>
        
        <div className="flex items-center gap-2 text-xs text-muted-foreground mt-3">
          <Clock className="w-3 h-3" />
          Created {createdAt}
        </div>
      </CardContent>
      
      <CardFooter className="pt-3">
        <Button variant="outline" className="w-full">
          View Research
        </Button>
      </CardFooter>
    </Card>
  );
};

export default ResearchCard;