import React from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { ChevronDown, ChevronRight, Database } from "lucide-react";
import { formatDistanceToNow } from "date-fns";

interface DebugPanelProps {
  researchJobId: string;
}

export function DebugPanel({ researchJobId }: DebugPanelProps) {
  const [expandedResponses, setExpandedResponses] = React.useState<Set<string>>(new Set());

  const { data: apiResponses, isLoading } = useQuery({
    queryKey: ['api-responses', researchJobId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('api_responses')
        .select('*')
        .eq('research_job_id', researchJobId)
        .order('created_at', { ascending: false })
        .limit(50);

      if (error) throw error;
      return data;
    },
    enabled: !!researchJobId
  });

  const toggleResponse = (id: string) => {
    const newExpanded = new Set(expandedResponses);
    if (newExpanded.has(id)) {
      newExpanded.delete(id);
    } else {
      newExpanded.add(id);
    }
    setExpandedResponses(newExpanded);
  };

  if (isLoading) {
    return (
      <Card>
        <CardContent className="p-6">
          <p className="text-muted-foreground">Loading debug data...</p>
        </CardContent>
      </Card>
    );
  }

  if (!apiResponses || apiResponses.length === 0) {
    return (
      <Card>
        <CardContent className="p-6">
          <p className="text-muted-foreground">No API responses recorded yet. Run enrichment to see debug data.</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2 mb-4">
        <Database className="h-5 w-5 text-primary" />
        <h3 className="text-lg font-semibold">API Debug Logs</h3>
        <Badge variant="outline">{apiResponses.length} calls</Badge>
      </div>

      <ScrollArea className="h-[600px]">
        <div className="space-y-3">
          {apiResponses.map((response) => {
            const isExpanded = expandedResponses.has(response.id);
            const statusColor = response.status_code === 200 ? 'bg-green-500' : 'bg-red-500';

            return (
              <Card key={response.id} className="overflow-hidden">
                <Collapsible open={isExpanded} onOpenChange={() => toggleResponse(response.id)}>
                  <CollapsibleTrigger className="w-full">
                    <div className="flex items-start justify-between p-4 hover:bg-muted/50 cursor-pointer">
                      <div className="flex items-start gap-3 flex-1">
                        {isExpanded ? (
                          <ChevronDown className="h-5 w-5 mt-0.5 flex-shrink-0" />
                        ) : (
                          <ChevronRight className="h-5 w-5 mt-0.5 flex-shrink-0" />
                        )}
                        <div className="text-left flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <Badge variant="outline" className="font-mono text-xs">
                              {response.api_name}
                            </Badge>
                            <span className="text-sm font-medium">{response.endpoint}</span>
                            <div className={`w-2 h-2 rounded-full ${statusColor}`} />
                            <span className="text-xs text-muted-foreground">{response.status_code}</span>
                          </div>
                          <p className="text-xs text-muted-foreground">
                            {formatDistanceToNow(new Date(response.created_at), { addSuffix: true })}
                          </p>
                          {response.error_message && (
                            <p className="text-xs text-red-600 mt-1">Error: {response.error_message}</p>
                          )}
                        </div>
                      </div>
                    </div>
                  </CollapsibleTrigger>

                  <CollapsibleContent>
                    <div className="border-t p-4 space-y-4 bg-muted/20">
                      {/* Request Payload */}
                      {response.request_payload && (
                        <div>
                          <h4 className="text-sm font-semibold mb-2">Request Payload</h4>
                          <pre className="bg-background p-3 rounded-md text-xs overflow-x-auto border">
                            {JSON.stringify(response.request_payload, null, 2)}
                          </pre>
                        </div>
                      )}

                      {/* Response Payload */}
                      {response.response_payload && (
                        <div>
                          <h4 className="text-sm font-semibold mb-2">Response Summary</h4>
                          <pre className="bg-background p-3 rounded-md text-xs overflow-x-auto border">
                            {JSON.stringify(response.response_payload, null, 2)}
                          </pre>
                        </div>
                      )}

                      {/* Full Response */}
                      {response.response_text && (
                        <div>
                          <h4 className="text-sm font-semibold mb-2">Full Response (Raw)</h4>
                          <ScrollArea className="h-[300px]">
                            <pre className="bg-background p-3 rounded-md text-xs border">
                              {response.response_text}
                            </pre>
                          </ScrollArea>
                        </div>
                      )}
                    </div>
                  </CollapsibleContent>
                </Collapsible>
              </Card>
            );
          })}
        </div>
      </ScrollArea>
    </div>
  );
}
