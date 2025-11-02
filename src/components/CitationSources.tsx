import { Button } from "@/components/ui/button";
import { ExternalLink, Link } from "lucide-react";

interface SourceLinksProps {
  citations: any[];
  title: string;
}

export const SourceLinks = ({ citations, title }: SourceLinksProps) => {
  if (!citations || citations.length === 0) return null;

  return (
    <div className="mt-3 pt-3 border-t border-border/50">
      <div className="flex items-center gap-2 mb-2">
        <Link className="h-4 w-4 text-muted-foreground" />
        <span className="text-sm font-medium text-muted-foreground">Sources for {title}</span>
      </div>
      <div className="flex flex-wrap gap-2">
        {citations.slice(0, 5).map((citation, index) => (
          <Button
            key={index}
            variant="outline"
            size="sm"
            className="h-7 px-2 text-xs"
            onClick={() => window.open(citation, '_blank')}
          >
            <ExternalLink className="h-3 w-3 mr-1" />
            Source {index + 1}
          </Button>
        ))}
      </div>
    </div>
  );
};

interface CompetitorSourcesProps {
  items: any[];
  title: string;
}

export const CompetitorSources = ({ items, title }: CompetitorSourcesProps) => {
  if (!items || items.length === 0) return null;

  return (
    <div className="mt-3 pt-3 border-t border-border/50">
      <div className="flex items-center gap-2 mb-2">
        <Link className="h-4 w-4 text-muted-foreground" />
        <span className="text-sm font-medium text-muted-foreground">Sources for {title}</span>
      </div>
      <div className="space-y-2">
        {items.map((item, index) => (
          <div key={index} className="text-sm">
            <span className="font-medium">{item.name}:</span>
            <div className="flex flex-wrap gap-1 mt-1">
              {item.sources?.map((source: string, srcIndex: number) => (
                <Button
                  key={srcIndex}
                  variant="outline"
                  size="sm"
                  className="h-6 px-2 text-xs"
                  onClick={() => window.open(source, '_blank')}
                >
                  <ExternalLink className="h-3 w-3 mr-1" />
                  {srcIndex + 1}
                </Button>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};