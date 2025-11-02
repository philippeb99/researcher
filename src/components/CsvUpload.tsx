import React, { useState, useRef } from "react";
import Papa from "papaparse";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Upload, FileText, CheckCircle, XCircle, AlertCircle } from "lucide-react";
import { useQueryClient } from "@tanstack/react-query";

interface CsvRow {
  Contact?: string;
  Company: string;
  Phone?: string;
  URL: string;
  Linkedin?: string;
  Count?: string;
  LastName: string;
  FirstName: string;
  Fullname: string;
  "Country Code"?: string;
  Country: string;
}

interface ValidationResult {
  isValid: boolean;
  errors: string[];
  rowCount: number;
  validRows: CsvRow[];
}

export const CsvUpload = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isOpen, setIsOpen] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [isValidating, setIsValidating] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [validationResult, setValidationResult] = useState<ValidationResult | null>(null);
  const [uploadProgress, setUploadProgress] = useState(0);

  const requiredColumns = [
    "Company", "URL", "LastName", "FirstName", "Fullname", "Country"
  ];

  const validateCsvFormat = (data: any[]): ValidationResult => {
    const errors: string[] = [];
    
    if (data.length === 0) {
      return { isValid: false, errors: ["CSV file is empty"], rowCount: 0, validRows: [] };
    }

    // Check if headers match required columns
    const headers = Object.keys(data[0]);
    const missingColumns = requiredColumns.filter(col => !headers.includes(col));
    
    if (missingColumns.length > 0) {
      errors.push(`Missing required columns: ${missingColumns.join(", ")}`);
    }

    // Validate each row
    const validRows: CsvRow[] = [];
    const requiredFields = ["Company", "URL", "LastName", "FirstName", "Fullname", "Country"];
    
    data.forEach((row, index) => {
      const rowErrors: string[] = [];
      
      // Check required fields for mapping
      requiredFields.forEach(field => {
        if (!row[field] || row[field].trim() === "") {
          rowErrors.push(`Row ${index + 1}: Missing ${field}`);
        }
      });

      // Validate URL format
      if (row.URL && !isValidUrl(row.URL)) {
        rowErrors.push(`Row ${index + 1}: Invalid URL format`);
      }

      // LinkedIn URL is imported as-is without validation

      if (rowErrors.length === 0) {
        validRows.push(row as CsvRow);
      } else {
        errors.push(...rowErrors);
      }
    });

    return {
      isValid: errors.length === 0,
      errors,
      rowCount: data.length,
      validRows
    };
  };

  const isValidUrl = (url: string): boolean => {
    try {
      new URL(url.startsWith('http') ? url : `https://${url}`);
      return true;
    } catch {
      return false;
    }
  };

  const isValidLinkedInUrl = (url: string): boolean => {
    return url.includes('linkedin.com/in/') || url.includes('linkedin.com/company/');
  };

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = event.target.files?.[0];
    if (selectedFile) {
      if (selectedFile.type !== 'text/csv' && !selectedFile.name.endsWith('.csv')) {
        toast({
          title: "Invalid File Type",
          description: "Please select a CSV file.",
          variant: "destructive",
        });
        return;
      }
      setFile(selectedFile);
      setValidationResult(null);
    }
  };

  const validateFile = () => {
    if (!file) return;

    setIsValidating(true);
    
    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      complete: (results) => {
        const validation = validateCsvFormat(results.data);
        setValidationResult(validation);
        setIsValidating(false);
        
        if (validation.isValid) {
          toast({
            title: "Validation Successful",
            description: `Found ${validation.validRows.length} valid research jobs ready to import.`,
          });
        } else {
          toast({
            title: "Validation Failed",
            description: `Found ${validation.errors.length} errors. Please fix them before importing.`,
            variant: "destructive",
          });
        }
      },
      error: (error) => {
        setIsValidating(false);
        toast({
          title: "File Parse Error",
          description: "Failed to parse CSV file. Please check the file format.",
          variant: "destructive",
        });
      }
    });
  };

  const formatUrl = (url: string): string => {
    if (!url.startsWith('http://') && !url.startsWith('https://')) {
      return `https://${url}`;
    }
    return url;
  };

  const importData = async () => {
    if (!validationResult?.validRows || !user) return;

    setIsUploading(true);

    try {
      const batchSize = 10;
      let processedJobs: any[] = [];
      let newJobsCount = 0;
      let updatedJobsCount = 0;
      const jobsToInsert: any[] = [];
      const jobsToUpdate: Array<{ id: string; data: any; notes: string | null }> = [];

      // Check for duplicates
      for (let i = 0; i < validationResult.validRows.length; i++) {
        const row = validationResult.validRows[i];
        const companyName = row.Company.trim();

        // Check if job exists for this company
        const { data: existingJobs, error: checkError } = await supabase
          .from('research_jobs')
          .select('id')
          .ilike('company_name', companyName)
          .eq('user_id', user.id)
          .limit(1);

        if (checkError) {
          console.error('Error checking for duplicates:', checkError);
          continue;
        }

        if (existingJobs && existingJobs.length > 0) {
          // Duplicate found - prepare for update
          jobsToUpdate.push({
            id: existingJobs[0].id,
            data: {
              ceo_name: row.Fullname.trim(),
              ceo_linkedin_url: row.Linkedin ? formatUrl(row.Linkedin.trim()) : ''
            },
            notes: row.Count?.trim() || null
          });
        } else {
          // No duplicate - prepare for insert
          jobsToInsert.push({
            user_id: user.id,
            company_name: companyName,
            city: null,
            state: null,
            country: row.Country.trim(),
            location: row.Country.trim(),
            website_url: formatUrl(row.URL.trim()),
            ceo_name: row.Fullname.trim(),
            ceo_linkedin_url: row.Linkedin ? formatUrl(row.Linkedin.trim()) : '',
            status: 'new' as const,
            notes: row.Count?.trim() || null
          });
        }
      }

      // Update existing jobs
      for (const job of jobsToUpdate) {
        const { error: updateError } = await supabase
          .from('research_jobs')
          .update(job.data)
          .eq('id', job.id);

        if (updateError) {
          console.error('Error updating job:', updateError);
        } else {
          updatedJobsCount++;

          // Update or insert notes for existing job
          if (job.notes) {
            const { data: existingNotes } = await supabase
              .from('research_notes')
              .select('id')
              .eq('research_job_id', job.id)
              .maybeSingle();

            if (existingNotes) {
              await supabase
                .from('research_notes')
                .update({ corum_activity: job.notes })
                .eq('id', existingNotes.id);
            } else {
              await supabase
                .from('research_notes')
                .insert({
                  research_job_id: job.id,
                  corum_activity: job.notes
                });
            }
          }
        }
      }

      // Insert new jobs in batches
      for (let i = 0; i < jobsToInsert.length; i += batchSize) {
        const batch = jobsToInsert.slice(i, i + batchSize);
        const batchWithoutNotes = batch.map(({ notes, ...job }) => job);

        const { data, error } = await supabase
          .from('research_jobs')
          .insert(batchWithoutNotes)
          .select();

        if (error) {
          console.error('Failed to insert batch:', error);
          throw error;
        }

        if (data) {
          processedJobs.push(...data);
          newJobsCount += data.length;

          // Create notes for new jobs
          const notesToCreate = batch
            .map((job, index) => ({
              research_job_id: data[index]?.id,
              corum_activity: job.notes
            }))
            .filter(note => note.research_job_id && note.corum_activity);

          if (notesToCreate.length > 0) {
            await supabase
              .from('research_notes')
              .insert(notesToCreate);
          }
        }
      }

      toast({
        title: "Import complete",
        description: `Created ${newJobsCount} new job(s) with status "New", updated ${updatedJobsCount} existing job(s). Use the "Process" button to process individual jobs.`,
      });

      // Refresh the research jobs list
      queryClient.invalidateQueries({ queryKey: ['research-jobs'] });
      queryClient.invalidateQueries({ queryKey: ['stats-data'] });

      // Reset form and close immediately
      setFile(null);
      setValidationResult(null);
      setUploadProgress(0);
      setIsOpen(false);
      
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }

    } catch (error) {
      console.error('Import error:', error);
      toast({
        title: "Import Failed",
        description: "Failed to import research jobs. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsUploading(false);
    }
  };


  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button variant="outline">
          <Upload className="h-4 w-4 mr-2 min-h-[44px]" />
          Upload Job List
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Upload Research Jobs from CSV</DialogTitle>
        </DialogHeader>
        
        <div className="space-y-6">
          {/* File Upload Section */}
          <div className="space-y-4">
            <div>
              <Input
                ref={fileInputRef}
                type="file"
                accept=".csv"
                onChange={handleFileChange}
                className="cursor-pointer"
              />
              <p className="text-sm text-muted-foreground mt-2">
                Required columns: Company, URL, LastName, FirstName, Fullname, Country. Optional columns: Contact, Phone, Linkedin, Count, Country Code. Column 6 (Count) will be imported as notes.
              </p>
            </div>

            {file && (
              <div className="flex items-center gap-2 p-3 bg-muted rounded-lg">
                <FileText className="h-4 w-4" />
                <span className="text-sm">{file.name}</span>
                <Button
                  size="sm"
                  onClick={validateFile}
                  disabled={isValidating}
                  className="ml-auto"
                >
                  {isValidating ? "Validating..." : "Validate"}
                </Button>
              </div>
            )}
          </div>

          {/* Validation Results */}
          {validationResult && (
            <div className="space-y-3">
              {validationResult.isValid ? (
                <Alert>
                  <CheckCircle className="h-4 w-4" />
                  <AlertDescription>
                    Validation successful! Found {validationResult.validRows.length} valid research jobs ready to import.
                  </AlertDescription>
                </Alert>
              ) : (
                <Alert variant="destructive">
                  <XCircle className="h-4 w-4" />
                  <AlertDescription>
                    Validation failed with {validationResult.errors.length} errors:
                    <ul className="mt-2 list-disc list-inside text-sm">
                      {validationResult.errors.slice(0, 5).map((error, index) => (
                        <li key={index}>{error}</li>
                      ))}
                      {validationResult.errors.length > 5 && (
                        <li>... and {validationResult.errors.length - 5} more errors</li>
                      )}
                    </ul>
                  </AlertDescription>
                </Alert>
              )}
            </div>
          )}

          {/* Upload Progress */}
          {isUploading && (
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <AlertCircle className="h-4 w-4" />
                <span className="text-sm">Importing jobs...</span>
              </div>
              <Progress value={uploadProgress} className="w-full" />
              <p className="text-xs text-muted-foreground">
                Creating research jobs in database...
              </p>
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex gap-2 justify-end">
            <Button variant="outline" onClick={() => setIsOpen(false)}>
              Cancel
            </Button>
            {validationResult?.isValid && (
              <Button 
                onClick={importData}
                disabled={isUploading}
              >
                {isUploading ? "Importing..." : `Import ${validationResult.validRows.length} Jobs`}
              </Button>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};