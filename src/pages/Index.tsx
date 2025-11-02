import React, { useState, useMemo } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Plus, Search } from "lucide-react";
import Header from "@/components/Header";
import { ResearchJobForm } from "@/components/ResearchJobForm";
import { ResearchJobList } from "@/components/ResearchJobList";
import StatsOverview from "@/components/StatsOverview";
import { CsvUpload } from "@/components/CsvUpload";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useQueryClient } from "@tanstack/react-query";

const Index = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [searchParams, setSearchParams] = useSearchParams();
  const [activeTab, setActiveTab] = useState("list");
  const [editingJob, setEditingJob] = useState<any>(null);
  const [processingJobs, setProcessingJobs] = useState<Set<string>>(new Set());
  const [refiningData, setRefiningData] = useState(false);
  
  // Get search term from URL params
  const searchTerm = searchParams.get('search') || '';

  const handleSearchChange = (value: string) => {
    const newParams = new URLSearchParams(searchParams);
    if (value) {
      newParams.set('search', value);
    } else {
      newParams.delete('search');
    }
    setSearchParams(newParams, { replace: true });
  };

  const handleJobSuccess = () => {
    setActiveTab("list");
    setEditingJob(null);
  };

  const handleEdit = (job: any) => {
    setEditingJob(job);
    setActiveTab("form");
  };

  const handleViewDetails = (job: any) => {
    navigate(`/research/${job.id}`, {
      state: { fromFilteredList: true }
    });
  };

  const handleProcess = async (job: any) => {
    try {
      setProcessingJobs(prev => new Set([...prev, job.id]));
      
      const { error } = await supabase.functions.invoke('process-research', {
        body: { research_job_id: job.id }
      });

      if (error) {
        console.error('Processing error:', error);
        toast({
          title: "Processing Failed",
          description: "Failed to start research processing. Please try again.",
          variant: "destructive",
        });
      } else {
        toast({
          title: "Processing Started",
          description: "AI research processing has begun. This may take a few minutes.",
        });
        
        // Refetch jobs to update status
        queryClient.invalidateQueries({ queryKey: ['research-jobs'] });
      }
    } catch (error) {
      console.error('Processing error:', error);
      toast({
        title: "Processing Failed",
        description: "Failed to start research processing. Please try again.",
        variant: "destructive",
      });
    } finally {
      setProcessingJobs(prev => {
        const newSet = new Set(prev);
        newSet.delete(job.id);
        return newSet;
      });
    }
  };

  const handleRefineData = async (job: any) => {
    try {
      setRefiningData(true);
      
      const { error } = await supabase.functions.invoke('refine-data', {
        body: { research_job_id: job.id }
      });

      if (error) {
        console.error('Data refinement error:', error);
        toast({
          title: "Data Refinement Failed",
          description: "Failed to refine research data. Please try again.",
          variant: "destructive",
        });
      } else {
        toast({
          title: "Data Refinement Completed",
          description: "Research data has been verified and refined with real-time information.",
        });
        
        // Refetch jobs to update refined data
        queryClient.invalidateQueries({ queryKey: ['research-jobs'] });
        queryClient.invalidateQueries({ queryKey: ['stats-data'] });
      }
    } catch (error) {
      console.error('Data refinement error:', error);
      toast({
        title: "Data Refinement Failed",
        description: "Failed to refine research data. Please try again.",
        variant: "destructive",
      });
    } finally {
      setRefiningData(false);
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <Header />
      
      <main className="container mx-auto px-4 py-6 sm:py-8">
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-foreground mb-2">
            Red23 Company Research
          </h1>
          <p className="text-xl text-muted-foreground">
            AI-powered insights for business research
          </p>
       
        </div>
        
        

        <StatsOverview />

        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <TabsList className="grid grid-cols-2 w-full sm:max-w-md">
              <TabsTrigger value="list" className="min-h-[44px]">Research Jobs</TabsTrigger>
              <TabsTrigger value="form" className="min-h-[44px]">
                {editingJob ? "Edit Job" : "New Job"}
              </TabsTrigger>
            </TabsList>
            
            {activeTab === "list" && (
              <div className="flex flex-col sm:flex-row gap-2 w-full sm:w-auto">
                <CsvUpload />
                <Button 
                  onClick={() => {
                    setEditingJob(null);
                    setActiveTab("form");
                  }}
                  className=""
                >
                  <Plus className="h-4 w-4 mr-2" />
                  New Research Job
                </Button>
              </div>
            )}
          </div>

          <TabsContent value="list" className="space-y-6">
            <ResearchJobList
              onEdit={handleEdit}
              onViewDetails={handleViewDetails}
              onProcess={handleProcess}
              onRefineData={handleRefineData}
              searchTerm={searchTerm}
              onSearchChange={handleSearchChange}
              onClearSearch={() => handleSearchChange('')}
              processingJobs={processingJobs}
            />
          </TabsContent>

          <TabsContent value="form" className="space-y-6">
            <ResearchJobForm
              onSuccess={handleJobSuccess}
              editData={editingJob}
              onCancel={() => {
                setEditingJob(null);
                setActiveTab("list");
              }}
            />
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
};

export default Index;
