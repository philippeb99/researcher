import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Edit2, Save, X, ArrowUp } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface Top5Item {
  positioning?: string;
  financials?: string;
  key_customers?: string;
  market_share?: string;
  opportunity?: string;
}

interface EditableTop5Props {
  researchJobId: string;
  top5Data: string | null;
  onUpdate: () => void;
}

export const EditableTop5 = ({ researchJobId, top5Data, onUpdate }: EditableTop5Props) => {
  const [isEditing, setIsEditing] = useState(false);
  const [editingData, setEditingData] = useState<Top5Item>({});
  const { toast } = useToast();

  const parseTop5Data = (data: string | null): Top5Item => {
    if (!data) return {};
    
    try {
      const parsed = JSON.parse(data);
      if (Array.isArray(parsed) && parsed.length > 0) {
        return parsed[0];
      }
      return parsed;
    } catch (error) {
      console.error('Error parsing top5 data:', error);
      return {};
    }
  };

  const startEditing = () => {
    setEditingData(parseTop5Data(top5Data));
    setIsEditing(true);
  };

  const cancelEditing = () => {
    setIsEditing(false);
    setEditingData({});
  };

  const saveChanges = async () => {
    try {
      const updatedData = JSON.stringify([editingData]);
      
      const { error } = await supabase
        .from('research_jobs')
        .update({ top_5: updatedData })
        .eq('id', researchJobId);

      if (error) throw error;

      toast({
        title: "Success",
        description: "Top 5 insights updated successfully",
      });

      setIsEditing(false);
      onUpdate();
    } catch (error) {
      console.error('Error updating top5 data:', error);
      toast({
        title: "Error",
        description: "Failed to update Top 5 insights",
        variant: "destructive",
      });
    }
  };

  const handleFieldChange = (field: keyof Top5Item, value: string) => {
    setEditingData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const displayData = parseTop5Data(top5Data);

  const scrollToTop = () => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  return (
    <Card className="mb-6">
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            Top 5 Key Business Insights
            <Button 
              variant="ghost" 
              size="sm" 
              onClick={scrollToTop}
              className="ml-2 h-auto p-1 text-xs text-muted-foreground hover:text-primary"
            >
              <ArrowUp className="h-3 w-3 mr-1" />
              Back to top
            </Button>
          </CardTitle>
          {!isEditing && (
            <Button variant="outline" size="sm" onClick={startEditing}>
              <Edit2 className="h-4 w-4 mr-2" />
              Edit
            </Button>
          )}
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {isEditing ? (
          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium">Positioning</label>
              <Textarea
                value={editingData.positioning || ''}
                onChange={(e) => handleFieldChange('positioning', e.target.value)}
                placeholder="Enter positioning information..."
                className="mt-1"
              />
            </div>
            <div>
              <label className="text-sm font-medium">Financials</label>
              <Textarea
                value={editingData.financials || ''}
                onChange={(e) => handleFieldChange('financials', e.target.value)}
                placeholder="Enter financial information..."
                className="mt-1"
              />
            </div>
            <div>
              <label className="text-sm font-medium">Key Customers</label>
              <Textarea
                value={editingData.key_customers || ''}
                onChange={(e) => handleFieldChange('key_customers', e.target.value)}
                placeholder="Enter key customers information..."
                className="mt-1"
              />
            </div>
            <div>
              <label className="text-sm font-medium">Market Share</label>
              <Textarea
                value={editingData.market_share || ''}
                onChange={(e) => handleFieldChange('market_share', e.target.value)}
                placeholder="Enter market share information..."
                className="mt-1"
              />
            </div>
            <div>
              <label className="text-sm font-medium">Opportunity</label>
              <Textarea
                value={editingData.opportunity || ''}
                onChange={(e) => handleFieldChange('opportunity', e.target.value)}
                placeholder="Enter opportunity information..."
                className="mt-1"
              />
            </div>
            <div className="flex gap-2 pt-4">
              <Button onClick={saveChanges}>
                <Save className="h-4 w-4 mr-2" />
                Save
              </Button>
              <Button variant="outline" onClick={cancelEditing}>
                <X className="h-4 w-4 mr-2" />
                Cancel
              </Button>
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            {displayData.positioning && (
              <div>
                <h4 className="font-semibold capitalize">Positioning:</h4>
                <p className="text-sm text-muted-foreground">{displayData.positioning}</p>
              </div>
            )}
            {displayData.financials && (
              <div>
                <h4 className="font-semibold capitalize">Financials:</h4>
                <p className="text-sm text-muted-foreground">{displayData.financials}</p>
              </div>
            )}
            {displayData.key_customers && (
              <div>
                <h4 className="font-semibold capitalize">Key Customers:</h4>
                <p className="text-sm text-muted-foreground">{displayData.key_customers}</p>
              </div>
            )}
            {displayData.market_share && (
              <div>
                <h4 className="font-semibold capitalize">Market Share:</h4>
                <p className="text-sm text-muted-foreground">{displayData.market_share}</p>
              </div>
            )}
            {displayData.opportunity && (
              <div>
                <h4 className="font-semibold capitalize">Opportunity:</h4>
                <p className="text-sm text-muted-foreground">{displayData.opportunity}</p>
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
};