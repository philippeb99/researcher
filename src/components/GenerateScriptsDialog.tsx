import { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from './ui/dialog';
import { Button } from './ui/button';
import { Checkbox } from './ui/checkbox';
import { Label } from './ui/label';
import { Loader2 } from 'lucide-react';
import { SCRIPT_TYPE_LABELS, ScriptType } from '@/constants/scriptTemplates';

interface GenerateScriptsDialogProps {
  open: boolean;
  onClose: () => void;
  onGenerate: (scriptTypes: string[] | null) => Promise<void>;
  isGenerating: boolean;
}

export const GenerateScriptsDialog = ({
  open,
  onClose,
  onGenerate,
  isGenerating,
}: GenerateScriptsDialogProps) => {
  const [selectedTypes, setSelectedTypes] = useState<string[]>([]);
  const [generateAll, setGenerateAll] = useState(true);

  const scriptTypes = Object.keys(SCRIPT_TYPE_LABELS) as ScriptType[];

  const handleToggleType = (type: string) => {
    setSelectedTypes(prev =>
      prev.includes(type)
        ? prev.filter(t => t !== type)
        : [...prev, type]
    );
  };

  const handleGenerate = async () => {
    await onGenerate(generateAll ? null : selectedTypes);
    setSelectedTypes([]);
    setGenerateAll(true);
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Generate Introduction Scripts</DialogTitle>
          <DialogDescription>
            Choose which script types to generate. New scripts will be added without deleting existing ones.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="flex items-center space-x-2">
            <Checkbox
              id="generate-all"
              checked={generateAll}
              onCheckedChange={(checked) => setGenerateAll(checked as boolean)}
            />
            <Label htmlFor="generate-all" className="font-medium">
              Generate all script types
            </Label>
          </div>

          {!generateAll && (
            <div className="space-y-3 pl-6 border-l-2 border-muted">
              {scriptTypes.map((type) => (
                <div key={type} className="flex items-center space-x-2">
                  <Checkbox
                    id={`type-${type}`}
                    checked={selectedTypes.includes(type)}
                    onCheckedChange={() => handleToggleType(type)}
                  />
                  <Label htmlFor={`type-${type}`}>
                    {SCRIPT_TYPE_LABELS[type]}
                  </Label>
                </div>
              ))}
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={isGenerating}>
            Cancel
          </Button>
          <Button
            onClick={handleGenerate}
            disabled={isGenerating || (!generateAll && selectedTypes.length === 0)}
          >
            {isGenerating && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Generate Scripts
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
