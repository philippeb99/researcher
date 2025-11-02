import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Wand2, Loader2, Copy, Check } from "lucide-react";
import { useContextScript } from "@/hooks/useContextScript";
import { toast } from "sonner";

interface RAGScriptGeneratorProps {
  researchJobId: string;
}

const scriptTypes = [
  "Initial Outreach",
  "Follow-up Email",
  "LinkedIn Message",
  "Phone Script",
  "Meeting Request",
];

export const RAGScriptGenerator = ({ researchJobId }: RAGScriptGeneratorProps) => {
  const [scriptType, setScriptType] = useState("Initial Outreach");
  const [userContext, setUserContext] = useState("");
  const [includeSimilar, setIncludeSimilar] = useState(true);
  const [copied, setCopied] = useState(false);

  const { mutate: generateScript, data, isPending } = useContextScript();

  const handleGenerate = () => {
    generateScript({
      research_job_id: researchJobId,
      script_type: scriptType,
      user_context: userContext,
      include_similar_companies: includeSimilar,
    });
  };

  const handleCopy = async () => {
    if (data?.script) {
      await navigator.clipboard.writeText(data.script);
      setCopied(true);
      toast.success("Script copied to clipboard");
      setTimeout(() => setCopied(false), 2000);
    }
  };

  return (
    <Card className="p-6">
      <div className="space-y-4">
        <div className="flex items-center gap-2 mb-4">
          <Wand2 className="h-5 w-5 text-primary" />
          <h3 className="text-lg font-semibold">RAG-Powered Script Generator</h3>
        </div>

        <div className="space-y-4">
          <div>
            <Label>Script Type</Label>
            <Select value={scriptType} onValueChange={setScriptType}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {scriptTypes.map((type) => (
                  <SelectItem key={type} value={type}>
                    {type}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label>Additional Context (Optional)</Label>
            <Textarea
              placeholder="Add any specific context or requirements for this script..."
              value={userContext}
              onChange={(e) => setUserContext(e.target.value)}
              rows={3}
            />
          </div>

          <div className="flex items-center justify-between">
            <Label htmlFor="include-similar">Include insights from similar companies</Label>
            <Switch
              id="include-similar"
              checked={includeSimilar}
              onCheckedChange={setIncludeSimilar}
            />
          </div>

          <Button 
            onClick={handleGenerate} 
            disabled={isPending}
            className="w-full"
          >
            {isPending ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
                Generating...
              </>
            ) : (
              <>
                <Wand2 className="h-4 w-4 mr-2" />
                Generate Context-Aware Script
              </>
            )}
          </Button>
        </div>

        {data?.script && (
          <div className="space-y-3 mt-6 pt-6 border-t">
            <div className="flex items-center justify-between">
              <Label>Generated Script</Label>
              <Button
                variant="ghost"
                size="sm"
                onClick={handleCopy}
              >
                {copied ? (
                  <Check className="h-4 w-4 text-green-500" />
                ) : (
                  <Copy className="h-4 w-4" />
                )}
              </Button>
            </div>
            <div className="p-4 bg-muted rounded-lg">
              <p className="whitespace-pre-wrap text-sm">{data.script}</p>
            </div>
            {data.context_used && (
              <div className="flex gap-2 text-xs text-muted-foreground">
                <span>✓ Company data</span>
                {data.context_used.executives_count > 0 && (
                  <span>✓ {data.context_used.executives_count} executives</span>
                )}
                {data.context_used.news_count > 0 && (
                  <span>✓ {data.context_used.news_count} news items</span>
                )}
                {data.context_used.similar_companies && (
                  <span>✓ Similar companies</span>
                )}
              </div>
            )}
          </div>
        )}
      </div>
    </Card>
  );
};
