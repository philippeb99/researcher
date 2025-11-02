import React from "react";
import { useParams, useNavigate, useLocation } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useUserRole } from "@/hooks/useUserRole";
import { useContactStatuses } from "@/hooks/useContactStatuses";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { EditableTop5 } from "@/components/EditableTop5";
import { ResearchNotes } from "@/components/ResearchNotes";
import { ExecutiveTable } from "@/components/ExecutiveTable";
import { IntroScripts } from "@/components/IntroScripts";
import { ContactActivity } from "@/components/ContactActivity";
import { EmbeddingsManager } from "@/components/EmbeddingsManager";
import { SemanticSearchPanel } from "@/components/SemanticSearchPanel";
import { HistoricalInsights } from "@/components/HistoricalInsights";
import { RAGScriptGenerator } from "@/components/RAGScriptGenerator";
import RoleGuard from "@/components/RoleGuard";
import { Executive } from "@/types/executive";
import { NewsItem } from "@/types/news";
import {
  ArrowLeft,
  Building2,
  MapPin,
  ExternalLink,
  User,
  LinkedinIcon,
  Calendar,
  TrendingUp,
  Users,
  DollarSign,
  Handshake,
  Newspaper,
  MessageSquare,
  Trash2,
  Plus,
  Edit2,
  Save,
  X,
  FileText,
  RefreshCw,
  ArrowUp,
} from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { formatDistanceToNow, format } from "date-fns";
import { generateFeedbackPDF } from "@/utils/pdfGenerator";
import { Download } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { SourceLinks, CompetitorSources } from "@/components/CitationSources";
import { DebugPanel } from "@/components/DebugPanel";

// Research details component

export default function ResearchDetails() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const location = useLocation();
  const { user } = useAuth();
  const { permissions, loading: roleLoading } = useUserRole();
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const { statuses: contactStatuses } = useContactStatuses();
  const fromFilteredList = location.state?.fromFilteredList;
  const [isAddTopicOpen, setIsAddTopicOpen] = React.useState(false);
  const [newTopic, setNewTopic] = React.useState({
    title: "",
    description: "",
    topic_type: "touchpoint",
  });
  const [isAddNewsOpen, setIsAddNewsOpen] = React.useState(false);
  const [newNews, setNewNews] = React.useState({
    title: "",
    url: "",
    summary: "",
    keywords: "",
    published_date: "",
  });
  const [isEditingAcquisition, setIsEditingAcquisition] = React.useState(false);
  const [acquisitionSignalEdit, setAcquisitionSignalEdit] = React.useState("");
  const [isProcessing, setIsProcessing] = React.useState(false);
  const scriptsRef = React.useRef<HTMLDivElement>(null);
  const [isEditingMetrics, setIsEditingMetrics] = React.useState(false);
  const [metricsEdit, setMetricsEdit] = React.useState({
    employee_count: "",
    revenue_amount: "",
    ebitda_amount: "",
  });
  const [isSavingMetrics, setIsSavingMetrics] = React.useState(false);
  const [activeTab, setActiveTab] = React.useState("overview");

  const scrollToScripts = () => {
    scriptsRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  const scrollToTop = () => {
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const handleProcessResearch = async () => {
    if (!id) return;

    setIsProcessing(true);
    try {
      const { error } = await supabase.functions.invoke("process-research", {
        body: { research_job_id: id },
      });

      if (error) throw error;

      toast({
        title: "Processing started",
        description: "Research job is being processed. This may take a few minutes.",
      });

      // Refresh the data after a delay
      setTimeout(() => {
        queryClient.invalidateQueries({ queryKey: ["research-job", id] });
        queryClient.invalidateQueries({ queryKey: ["executives", id] });
        queryClient.invalidateQueries({ queryKey: ["news", id] });
        queryClient.invalidateQueries({ queryKey: ["discussion-topics", id] });
      }, 2000);
    } catch (error) {
      console.error("Error processing research:", error);
      toast({
        title: "Error",
        description: "Failed to process research job.",
        variant: "destructive",
      });
    } finally {
      setIsProcessing(false);
    }
  };

  const { data: job, isLoading } = useQuery({
    queryKey: ["research-job", id, permissions.canViewAll, user?.id],
    queryFn: async () => {
      if (!user || !id) return null;

      let query = supabase.from("research_jobs").select("*").eq("id", id);

      // Only filter by user_id if user doesn't have permission to view all
      if (!permissions.canViewAll) {
        query = query.eq("user_id", user.id);
      }

      const { data, error } = await query.single();

      if (error) throw error;
      return data as any; // Temporary type assertion to fix build errors
    },
    enabled: !!user && !!id && !roleLoading,
    retry: 3,
    retryDelay: 1000,
  });

  const { data: executives } = useQuery({
    queryKey: ["executives", id, permissions.canViewAll, user?.id],
    queryFn: async () => {
      if (!id) return [];

      const { data, error } = await supabase
        .from("executives")
        .select("*")
        .eq("research_job_id", id)
        .order("created_at", { ascending: true });

      if (error) throw error;
      return data as Executive[];
    },
    enabled: !!id && !roleLoading,
    retry: 3,
    retryDelay: 1000,
  });

  const { data: news } = useQuery({
    queryKey: ["news", id, permissions.canViewAll, user?.id],
    queryFn: async () => {
      if (!id) return [];

      const { data, error } = await supabase
        .from("news_items")
        .select("*")
        .eq("research_job_id", id)
        .order("published_date", { ascending: false });

      if (error) throw error;
      return data as NewsItem[];
    },
    enabled: !!id && !roleLoading,
    retry: 3,
    retryDelay: 1000,
  });

  const { data: discussionTopics } = useQuery({
    queryKey: ["discussion-topics", id, permissions.canViewAll, user?.id],
    queryFn: async () => {
      if (!id) return [];

      const { data, error } = await supabase
        .from("discussion_topics")
        .select("*")
        .eq("research_job_id", id)
        .order("created_at", { ascending: true });

      if (error) throw error;
      return data;
    },
    enabled: !!id && !roleLoading,
    retry: 3,
    retryDelay: 1000,
  });

  const { data: notes } = useQuery({
    queryKey: ["research-notes", id, permissions.canViewAll, user?.id],
    queryFn: async () => {
      if (!id) return null;

      const { data, error } = await supabase.from("research_notes").select("*").eq("research_job_id", id).maybeSingle();

      if (error) throw error;
      return data;
    },
    enabled: !!id && !roleLoading,
    retry: 3,
    retryDelay: 1000,
  });

  const handleDownloadPDF = async () => {
    if (!job) return;

    // Get user profile for "Requested by" field
    let requestedBy = '';
    try {
      const { data: profile } = await supabase
        .from('profiles')
        .select('user_name, display_name')
        .eq('user_id', job.user_id)
        .single();
      
      if (profile) {
        requestedBy = profile.display_name || profile.user_name || '';
      }
    } catch (error) {
      console.error('Error fetching user profile:', error);
    }

    // Parse citations
    const citations: any = {};
    try {
      if (job.overview_citations) {
        const parsed = typeof job.overview_citations === 'string' 
          ? JSON.parse(job.overview_citations) 
          : job.overview_citations;
        citations.overview = Array.isArray(parsed) ? parsed : [];
      }
    } catch (e) {
      console.error('Error parsing overview citations:', e);
    }

    try {
      if (job.competitors_citations) {
        const parsed = typeof job.competitors_citations === 'string'
          ? JSON.parse(job.competitors_citations)
          : job.competitors_citations;
        citations.competitors = Array.isArray(parsed) ? parsed : [];
      }
    } catch (e) {
      console.error('Error parsing competitors citations:', e);
    }

    try {
      if (job.likely_acquirers_citations) {
        const parsed = typeof job.likely_acquirers_citations === 'string'
          ? JSON.parse(job.likely_acquirers_citations)
          : job.likely_acquirers_citations;
        citations.acquirers = Array.isArray(parsed) ? parsed : [];
      }
    } catch (e) {
      console.error('Error parsing acquirers citations:', e);
    }

    const pdfData = {
      companyName: job.company_name,
      location: [job.city, job.state, job.country].filter(Boolean).join(", "),
      websiteUrl: job.website_url || '',
      ceoName: job.ceo_name || '',
      ceoLinkedIn: job.ceo_linkedin_url,
      contactStatus: job.contact_status || contactStatuses.find(s => s.value === job.contact_status)?.label,
      lastContactDate: job.last_contact_datetime,
      processedAt: job.processed_at,
      createdAt: job.created_at,
      requestedBy,
      companyOverview: job.company_overview,
      executives: executives || [],
      top5: job.top_5,
      industryBusinessModel: job.industry_business_model,
      marketPosition: job.market_position,
      keyProductsCustomers: job.key_products_customers,
      recentDevelopments: job.recent_developments,
      financialInformation: job.financial_information,
      employeeCount: job.employee_count,
      revenueAmount: job.revenue_amount,
      ebitdaAmount: job.ebitda_amount,
      keyPartnerships: job.key_partnerships,
      competitors: job.competitors,
      likelyAcquirers: job.likely_acquirers,
      acquisitionSignal: job.acquisition_signal,
      citations,
      internalNotes: notes?.internal_notes,
      discussionTopics: discussionTopics || [],
    };

    generateFeedbackPDF(pdfData);
  };

  const handleDeleteNews = async (newsItem: any) => {
    if (!confirm(`Are you sure you want to delete this news item: "${newsItem.title}"?`)) return;

    try {
      const { error } = await supabase.from("news_items").delete().eq("id", newsItem.id);

      if (error) throw error;

      toast({
        title: "News item deleted",
        description: "The news item has been successfully removed.",
      });

      queryClient.invalidateQueries({ queryKey: ["news", id] });
    } catch (error) {
      console.error("Error deleting news item:", error);
      toast({
        title: "Error",
        description: "Failed to delete news item.",
        variant: "destructive",
      });
    }
  };

  const handleDeleteDiscussionTopic = async (topic: any) => {
    if (!confirm(`Are you sure you want to delete this discussion topic: "${topic.title}"?`)) return;

    try {
      const { error } = await supabase.from("discussion_topics").delete().eq("id", topic.id);

      if (error) throw error;

      toast({
        title: "Discussion topic deleted",
        description: "The discussion topic has been successfully removed.",
      });

      queryClient.invalidateQueries({ queryKey: ["discussion-topics", id] });
    } catch (error) {
      console.error("Error deleting discussion topic:", error);
      toast({
        title: "Error",
        description: "Failed to delete discussion topic.",
        variant: "destructive",
      });
    }
  };

  const handleAddDiscussionTopic = async () => {
    if (!newTopic.title.trim() || !newTopic.description.trim()) {
      toast({
        title: "Error",
        description: "Please fill in all required fields.",
        variant: "destructive",
      });
      return;
    }

    try {
      const { error } = await supabase.from("discussion_topics").insert({
        research_job_id: id,
        title: newTopic.title.trim(),
        description: newTopic.description.trim(),
        topic_type: newTopic.topic_type,
      });

      if (error) throw error;

      toast({
        title: "Discussion topic added",
        description: "The new discussion topic has been successfully created.",
      });

      setNewTopic({ title: "", description: "", topic_type: "touchpoint" });
      setIsAddTopicOpen(false);
      queryClient.invalidateQueries({ queryKey: ["discussion-topics", id] });
    } catch (error) {
      console.error("Error adding discussion topic:", error);
      toast({
        title: "Error",
        description: "Failed to add discussion topic.",
        variant: "destructive",
      });
    }
  };

  const handleAddNews = async () => {
    if (!newNews.title.trim() || !newNews.url.trim() || !newNews.summary.trim()) {
      toast({
        title: "Error",
        description: "Please fill in title, URL, and summary fields.",
        variant: "destructive",
      });
      return;
    }

    try {
      const keywords = newNews.keywords.trim()
        ? newNews.keywords
            .split(",")
            .map((k) => k.trim())
            .filter((k) => k)
        : [];

      const { error } = await supabase.from("news_items").insert({
        research_job_id: id,
        title: newNews.title.trim(),
        url: newNews.url.trim(),
        summary: newNews.summary.trim(),
        keywords: keywords,
        published_date: newNews.published_date || new Date().toISOString(),
        confidence_level: "high", // User-added news gets high confidence by default
      });

      if (error) throw error;

      toast({
        title: "News item added",
        description: "The new news item has been successfully created.",
      });

      setNewNews({ title: "", url: "", summary: "", keywords: "", published_date: "" });
      setIsAddNewsOpen(false);
      queryClient.invalidateQueries({ queryKey: ["news", id] });
    } catch (error) {
      console.error("Error adding news item:", error);
      toast({
        title: "Error",
        description: "Failed to add news item.",
        variant: "destructive",
      });
    }
  };

  const handleNewsConfidenceChange = async (newsId: string, newConfidence: string) => {
    try {
      const { error } = await supabase.from("news_items").update({ confidence_level: newConfidence }).eq("id", newsId);

      if (error) throw error;

      toast({
        title: "Confidence level updated",
        description: "News item confidence level has been successfully updated.",
      });

      queryClient.invalidateQueries({ queryKey: ["news", id] });
    } catch (error) {
      console.error("Error updating news confidence level:", error);
      toast({
        title: "Error",
        description: "Failed to update confidence level.",
        variant: "destructive",
      });
    }
  };

  const handleStartEditingAcquisition = () => {
    setAcquisitionSignalEdit(job?.acquisition_signal || "");
    setIsEditingAcquisition(true);
  };

  const handleSaveAcquisitionSignal = async () => {
    try {
      const { error } = await supabase
        .from("research_jobs")
        .update({ acquisition_signal: acquisitionSignalEdit })
        .eq("id", id);

      if (error) throw error;

      toast({
        title: "Acquisition signal updated",
        description: "The acquisition signal has been successfully updated.",
      });

      setIsEditingAcquisition(false);
      queryClient.invalidateQueries({ queryKey: ["research-job", id] });
    } catch (error) {
      console.error("Error updating acquisition signal:", error);
      toast({
        title: "Error",
        description: "Failed to update acquisition signal.",
        variant: "destructive",
      });
    }
  };

  const handleCancelEditingAcquisition = () => {
    setIsEditingAcquisition(false);
    setAcquisitionSignalEdit("");
  };

  const formatCurrency = (amount: number | null) => {
    if (amount === null || amount === undefined) return "Not specified";
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  };

  const formatNumber = (num: number | null) => {
    if (num === null || num === undefined) return "Not specified";
    return new Intl.NumberFormat("en-US").format(num);
  };

  const handleStartEditingMetrics = () => {
    setMetricsEdit({
      employee_count: job?.employee_count?.toString() || "",
      revenue_amount: job?.revenue_amount?.toString() || "",
      ebitda_amount: job?.ebitda_amount?.toString() || "",
    });
    setIsEditingMetrics(true);
  };

  const handleSaveMetrics = async () => {
    if (!id) return;

    // Validate inputs
    const errors: string[] = [];
    const employeeCount = metricsEdit.employee_count ? parseInt(metricsEdit.employee_count) : null;
    const revenueAmount = metricsEdit.revenue_amount ? parseFloat(metricsEdit.revenue_amount) : null;
    const ebitdaAmount = metricsEdit.ebitda_amount ? parseFloat(metricsEdit.ebitda_amount) : null;

    if (employeeCount !== null && (employeeCount < 0 || employeeCount > 10000000)) {
      errors.push("Employee count must be between 0 and 10,000,000");
    }
    if (revenueAmount !== null && (revenueAmount < 0 || revenueAmount > 1000000000000)) {
      errors.push("Revenue must be between $0 and $1 trillion");
    }
    if (ebitdaAmount !== null && Math.abs(ebitdaAmount) > 1000000000000) {
      errors.push("EBITDA value seems too large");
    }

    if (errors.length > 0) {
      toast({
        title: "Validation Error",
        description: errors.join(". "),
        variant: "destructive",
      });
      return;
    }

    setIsSavingMetrics(true);
    try {
      const { error } = await supabase
        .from("research_jobs")
        .update({
          employee_count: employeeCount,
          revenue_amount: revenueAmount,
          ebitda_amount: ebitdaAmount,
        })
        .eq("id", id);

      if (error) throw error;

      toast({
        title: "Metrics updated",
        description: "Company metrics have been successfully updated.",
      });

      setIsEditingMetrics(false);
      queryClient.invalidateQueries({ queryKey: ["research-job", id] });
    } catch (error) {
      console.error("Error updating metrics:", error);
      toast({
        title: "Error",
        description: "Failed to update company metrics.",
        variant: "destructive",
      });
    } finally {
      setIsSavingMetrics(false);
    }
  };

  const handleCancelEditingMetrics = () => {
    setIsEditingMetrics(false);
    setMetricsEdit({
      employee_count: "",
      revenue_amount: "",
      ebitda_amount: "",
    });
  };

  const handleBackNavigation = () => {
    // If we came from filtered list, go back to preserve URL params
    if (fromFilteredList) {
      navigate(-1);
    } else {
      // Otherwise navigate to home
      navigate('/');
    }
  };

  if (isLoading) {
    return (
      <div className="container mx-auto p-6 space-y-6">
        <div className="flex items-center gap-4 mb-6">
          <Button variant="outline" onClick={handleBackNavigation}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back
          </Button>
        </div>
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-muted rounded w-1/3"></div>
          <div className="h-4 bg-muted rounded w-2/3"></div>
          <div className="h-32 bg-muted rounded"></div>
        </div>
      </div>
    );
  }

  if (!job) {
    return (
      <div className="container mx-auto p-6">
        <div className="text-center">
          <h2 className="text-2xl font-bold mb-2">Research job not found</h2>
          <Button onClick={handleBackNavigation}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Research Jobs
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-4 sm:p-6" id="top">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
        <div className="flex items-center gap-4">
          <Button variant="outline" onClick={handleBackNavigation} className="min-h-[44px]">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back
          </Button>
          <h1 className="text-2xl sm:text-3xl font-bold">Research Details</h1>
        </div>
        <div className="flex gap-2 w-full sm:w-auto flex-wrap">
          <Button
            variant="outline"
            onClick={handleProcessResearch}
            disabled={isProcessing}
            className="flex items-center gap-2 min-h-[44px] flex-1 sm:flex-initial"
          >
            <RefreshCw className={`h-4 w-4 ${isProcessing ? "animate-spin" : ""}`} />
            Process
          </Button>
          <Button
            variant="outline"
            onClick={() => setActiveTab("scripts")}
            className="flex items-center gap-2 min-h-[44px] flex-1 sm:flex-initial"
          >
            <FileText className="h-4 w-4" />
            Scripts
          </Button>
          <Button onClick={handleDownloadPDF} className="flex items-center gap-2 min-h-[44px] flex-1 sm:flex-initial">
            <Download className="h-4 w-4" />
            Download PDF
          </Button>
        </div>
      </div>

      {/* Tabs Navigation */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="mb-6">
        <TabsList className="grid w-full grid-cols-2 lg:grid-cols-4">
          <TabsTrigger value="overview">Research Overview</TabsTrigger>
          <TabsTrigger value="scripts">Scripts & Activity</TabsTrigger>
          <RoleGuard allowedRoles={['super_admin']} mode="hide">
            <TabsTrigger value="ai-tools">AI-Powered Tools</TabsTrigger>
          </RoleGuard>
          <RoleGuard allowedRoles={['super_admin']} mode="hide">
            <TabsTrigger value="debug">Debug</TabsTrigger>
          </RoleGuard>
        </TabsList>

        <TabsContent value="overview" className="space-y-6 mt-6">

      {/* Company Header */}
      <Card className="mb-6" id="overview">
        <CardHeader>
          <div className="flex items-start justify-between">
            <div>
              <CardTitle className="text-2xl flex items-center gap-2 mb-2">
                <Building2 className="h-6 w-6 text-primary" />
                {job.company_name}
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
              <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4 text-muted-foreground text-sm sm:text-base">
                <span className="flex items-center gap-1">
                  <MapPin className="h-4 w-4 flex-shrink-0" />
                  {[job.city, job.state, job.country].filter(Boolean).join(", ")}
                </span>
                <a
                  href={job.website_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-1 hover:text-primary transition-colors"
                >
                  <ExternalLink className="h-4 w-4 flex-shrink-0" />
                  Website
                </a>
                <span className="flex items-center gap-1">
                  <User className="h-4 w-4 flex-shrink-0" />
                  <span className="font-medium">CEO:</span> {job.ceo_name}
                </span>

                <span className="flex items-center gap-1">
                  <Calendar className="h-4 w-4 flex-shrink-0" />
                  <span className="hidden sm:inline">Processed </span>
                  {job.processed_at ? formatDistanceToNow(new Date(job.processed_at), { addSuffix: true }) : "Never"}
                </span>
              </div>

              {/* Contact Status & Last Contact Date */}
              {permissions.canEdit && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-4">
                  <div>
                    <Label className="text-xs text-muted-foreground">Contact Status</Label>
                    <Select
                      value={job.contact_status || "never"}
                      onValueChange={async (value: string) => {
                        const { error } = await supabase
                          .from("research_jobs")
                          .update({ contact_status: value as any })
                          .eq("id", id!);

                        if (error) {
                          toast({
                            title: "Error",
                            description: error.message,
                            variant: "destructive",
                          });
                        } else {
                          toast({
                            title: "Updated",
                            description: "Contact status has been updated.",
                          });
                          queryClient.invalidateQueries({ queryKey: ["research-job", id] });
                        }
                      }}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {contactStatuses.map((status) => (
                          <SelectItem key={status.id} value={status.value}>
                            {status.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label className="text-xs text-muted-foreground">Last Contact Date</Label>
                    <Input
                      type="datetime-local"
                      value={
                        job.last_contact_datetime
                          ? format(new Date(job.last_contact_datetime), "yyyy-MM-dd'T'HH:mm")
                          : ""
                      }
                      onChange={async (e) => {
                        const value = e.target.value ? new Date(e.target.value).toISOString() : null;
                        const { error } = await supabase
                          .from("research_jobs")
                          .update({ last_contact_datetime: value })
                          .eq("id", id!);

                        if (error) {
                          toast({
                            title: "Error",
                            description: error.message,
                            variant: "destructive",
                          });
                        } else {
                          toast({
                            title: "Updated",
                            description: "Last contact date has been updated.",
                          });
                          queryClient.invalidateQueries({ queryKey: ["research-job", id] });
                        }
                      }}
                    />
                  </div>
                </div>
              )}
            </div>
            <Badge variant="default" className="text-green-600">
              {job.status.charAt(0).toUpperCase() + job.status.slice(1)}
            </Badge>
          </div>
        </CardHeader>
        <CardContent>
          {job.company_overview && (
            <div className="mb-4">
              <h3 className="font-semibold mb-2">Company Overview</h3>
              <p className="text-muted-foreground">{job.company_overview}</p>
              <SourceLinks citations={job.overview_citations} title="Company Overview" />
              {job.competitors && (
                <>
                  <p className="font-semibold mt-4">Competitors:</p>
                  <p className="text-muted-foreground">{job.competitors}</p>
                  <CompetitorSources items={job.competitors_citations || []} title="Competitors" />
                </>
              )}
              {job.likely_acquirers && (
                <>
                  <p className="font-semibold mt-4">Acquirers:</p>
                  <p className="text-muted-foreground">{job.likely_acquirers}</p>
                  <CompetitorSources items={job.likely_acquirers_citations || []} title="Likely Acquirers" />
                </>
              )}
              {job.company_keywords && job.company_keywords.length > 0 && (
                <div className="flex flex-wrap gap-1 sm:gap-2 mt-3">
                  {job.company_keywords.map((keyword, index) => (
                    <Badge key={index} variant="secondary" className="text-xs">
                      {keyword}
                    </Badge>
                  ))}
                </div>
              )}
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
            <div></div>
            <div></div>
          </div>
        </CardContent>
      </Card>

      {/* Acquisition Signal */}
      <Card className="mb-6">
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="text-lg flex items-center gap-2">
              <TrendingUp className="h-5 w-5 text-primary" />
              <strong>Acquisition Signal</strong>
            </CardTitle>
            {permissions.canEdit && !isEditingAcquisition && (
              <Button variant="outline" size="sm" onClick={handleStartEditingAcquisition}>
                <Edit2 className="h-4 w-4 mr-2" />
                Edit
              </Button>
            )}
          </div>
        </CardHeader>
        <CardContent>
          {isEditingAcquisition ? (
            <div className="space-y-4">
              <Textarea
                value={acquisitionSignalEdit}
                onChange={(e) => setAcquisitionSignalEdit(e.target.value)}
                placeholder="Enter acquisition signal information..."
                className="min-h-[100px]"
              />
              <div className="flex gap-2">
                <Button onClick={handleSaveAcquisitionSignal} size="sm">
                  <Save className="h-4 w-4 mr-2" />
                  Save
                </Button>
                <Button variant="outline" onClick={handleCancelEditingAcquisition} size="sm">
                  <X className="h-4 w-4 mr-2" />
                  Cancel
                </Button>
              </div>
            </div>
          ) : (
            <div
              className={`p-4 rounded-lg border ${
                job.acquisition_signal === "No Acquisition Signal Found"
                  ? "bg-muted/50 border-muted"
                  : "bg-yellow-50 border-yellow-200 dark:bg-yellow-900/20 dark:border-yellow-800"
              }`}
            >
              <p
                className={`text-sm ${
                  job.acquisition_signal === "No Acquisition Signal Found"
                    ? "text-muted-foreground"
                    : "text-yellow-800 dark:text-yellow-200"
                }`}
              >
                {job.acquisition_signal || "No Acquisition Signal Found"}
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Company Metrics */}
      <Card className="mb-6" id="financial-metrics">
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="text-lg flex items-center gap-2">
              <DollarSign className="h-5 w-5 text-primary" />
              Company Metrics
            </CardTitle>
            {permissions.canEdit && !isEditingMetrics && (
              <Button variant="outline" size="sm" onClick={handleStartEditingMetrics}>
                <Edit2 className="h-4 w-4 mr-2" />
                Edit
              </Button>
            )}
          </div>
        </CardHeader>
        <CardContent>
          {isEditingMetrics ? (
            <div className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                <div>
                  <Label htmlFor="employee_count">Employee Count</Label>
                  <Input
                    id="employee_count"
                    type="number"
                    placeholder="e.g., 500"
                    value={metricsEdit.employee_count}
                    onChange={(e) => setMetricsEdit({ ...metricsEdit, employee_count: e.target.value })}
                    min="0"
                    max="10000000"
                  />
                </div>
                <div>
                  <Label htmlFor="revenue_amount">Revenue (USD)</Label>
                  <Input
                    id="revenue_amount"
                    type="number"
                    placeholder="e.g., 50000000"
                    value={metricsEdit.revenue_amount}
                    onChange={(e) => setMetricsEdit({ ...metricsEdit, revenue_amount: e.target.value })}
                    min="0"
                    step="1000"
                  />
                </div>
                <div>
                  <Label htmlFor="ebitda_amount">EBITDA (USD)</Label>
                  <Input
                    id="ebitda_amount"
                    type="number"
                    placeholder="e.g., 10000000"
                    value={metricsEdit.ebitda_amount}
                    onChange={(e) => setMetricsEdit({ ...metricsEdit, ebitda_amount: e.target.value })}
                    step="1000"
                  />
                </div>
              </div>
              <div className="flex gap-2">
                <Button onClick={handleSaveMetrics} size="sm" disabled={isSavingMetrics}>
                  {isSavingMetrics ? (
                    <>
                      <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                      Saving...
                    </>
                  ) : (
                    <>
                      <Save className="h-4 w-4 mr-2" />
                      Save
                    </>
                  )}
                </Button>
                <Button variant="outline" onClick={handleCancelEditingMetrics} size="sm" disabled={isSavingMetrics}>
                  <X className="h-4 w-4 mr-2" />
                  Cancel
                </Button>
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              <div className="flex flex-col space-y-1">
                <div className="flex items-center gap-2 text-muted-foreground text-sm">
                  <Users className="h-4 w-4" />
                  <span>Employee Count</span>
                </div>
                <p className="text-lg font-semibold">
                  {job.employee_count ? formatNumber(job.employee_count) : "Not specified"}
                </p>
              </div>
              <div className="flex flex-col space-y-1">
                <div className="flex items-center gap-2 text-muted-foreground text-sm">
                  <DollarSign className="h-4 w-4" />
                  <span>Revenue</span>
                </div>
                <p className="text-lg font-semibold">
                  {job.revenue_amount ? formatCurrency(job.revenue_amount) : "Not specified"}
                </p>
              </div>
              <div className="flex flex-col space-y-1">
                <div className="flex items-center gap-2 text-muted-foreground text-sm">
                  <TrendingUp className="h-4 w-4" />
                  <span>EBITDA</span>
                </div>
                <p className="text-lg font-semibold">
                  {job.ebitda_amount !== null && job.ebitda_amount !== undefined
                    ? formatCurrency(job.ebitda_amount)
                    : "Not specified"}
                </p>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Key Executives */}
      <div id="executives">
        <ExecutiveTable
          executives={executives || []}
          researchJobId={id!}
          onUpdate={() => queryClient.invalidateQueries({ queryKey: ["executives", id] })}
          onDelete={() => queryClient.invalidateQueries({ queryKey: ["executives", id] })}
        />
      </div>

      {/* Notes Section */}
      <div id="notes">
        <ResearchNotes researchJobId={id!} />
      </div>

      {/* Contact Activity */}
      <Card className="mb-6" id="activity">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <MessageSquare className="h-5 w-5" />
            Contact Activity
            <Button
              variant="ghost"
              size="sm"
              onClick={scrollToTop}
              className="ml-auto h-auto p-1 text-xs text-muted-foreground hover:text-primary"
            >
              <ArrowUp className="h-3 w-3 mr-1" />
              Back to top
            </Button>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <ContactActivity researchJobId={id!} />
        </CardContent>
      </Card>

      {/* Top 5 Key Business Insights */}
      <div id="top5">
        <EditableTop5
          researchJobId={id!}
          top5Data={job.top_5}
          onUpdate={() => {
            // Refetch the research job data when top5 is updated
            queryClient.invalidateQueries({ queryKey: ["research-job", id] });
          }}
        />
      </div>

      {/* Research Sections */}
      <div className="grid grid-cols-1 gap-6 mb-6">
        {job.industry_business_model && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <TrendingUp className="h-5 w-5" />
                Industry & Business Model
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground">{job.industry_business_model}</p>
            </CardContent>
          </Card>
        )}

        {job.key_products_customers && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Users className="h-5 w-5" />
                Key Products & Customers
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground">{job.key_products_customers}</p>
            </CardContent>
          </Card>
        )}

        {job.market_position && (
          <Card>
            <CardHeader>
              <CardTitle>Market Position & Competitive Landscape</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground">{job.market_position}</p>
            </CardContent>
          </Card>
        )}

        {job.recent_developments && (
          <Card>
            <CardHeader>
              <CardTitle>Recent Company Developments</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground">{job.recent_developments}</p>
            </CardContent>
          </Card>
        )}

        {job.financial_information && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <DollarSign className="h-5 w-5" />
                Financial Information
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground">{job.financial_information}</p>
            </CardContent>
          </Card>
        )}

        {job.key_partnerships && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Handshake className="h-5 w-5" />
                Key Partnerships
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground">{job.key_partnerships}</p>
            </CardContent>
          </Card>
        )}
      </div>

      {/* News Items */}
      {(news && news.length > 0) || true ? (
        <Card className="mb-6">
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center gap-2">
                <Newspaper className="h-5 w-5" />
                Recent News
              </CardTitle>
              <Dialog open={isAddNewsOpen} onOpenChange={setIsAddNewsOpen}>
                <DialogTrigger asChild>
                  <Button variant="outline" size="sm" className="flex items-center gap-2">
                    <Plus className="h-4 w-4" />
                    Add News
                  </Button>
                </DialogTrigger>
                <DialogContent className="max-w-md">
                  <DialogHeader>
                    <DialogTitle>Add News Item</DialogTitle>
                  </DialogHeader>
                  <div className="space-y-4">
                    <div>
                      <Label htmlFor="news-title">Title *</Label>
                      <Input
                        id="news-title"
                        value={newNews.title}
                        onChange={(e) => setNewNews({ ...newNews, title: e.target.value })}
                        placeholder="Enter news title"
                      />
                    </div>
                    <div>
                      <Label htmlFor="news-url">URL *</Label>
                      <Input
                        id="news-url"
                        type="url"
                        value={newNews.url}
                        onChange={(e) => setNewNews({ ...newNews, url: e.target.value })}
                        placeholder="https://example.com/news-article"
                      />
                    </div>
                    <div>
                      <Label htmlFor="news-summary">Summary *</Label>
                      <Textarea
                        id="news-summary"
                        value={newNews.summary}
                        onChange={(e) => setNewNews({ ...newNews, summary: e.target.value })}
                        placeholder="Enter news summary"
                        rows={3}
                      />
                    </div>
                    <div>
                      <Label htmlFor="news-keywords">Keywords (comma-separated)</Label>
                      <Input
                        id="news-keywords"
                        value={newNews.keywords}
                        onChange={(e) => setNewNews({ ...newNews, keywords: e.target.value })}
                        placeholder="keyword1, keyword2, keyword3"
                      />
                    </div>
                    <div>
                      <Label htmlFor="news-date">Published Date</Label>
                      <Input
                        id="news-date"
                        type="date"
                        value={newNews.published_date}
                        onChange={(e) => setNewNews({ ...newNews, published_date: e.target.value })}
                      />
                    </div>
                    <div className="flex gap-2">
                      <Button onClick={handleAddNews} className="flex-1">
                        Add News
                      </Button>
                      <Button variant="outline" onClick={() => setIsAddNewsOpen(false)} className="flex-1">
                        Cancel
                      </Button>
                    </div>
                  </div>
                </DialogContent>
              </Dialog>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            {news && news.length > 0 ? (
              news.map((item, index) => {
                const getConfidenceColor = (level?: string) => {
                  switch (level) {
                    case "high":
                      return "border-l-green-500 bg-green-50/50 dark:bg-green-900/10";
                    case "medium":
                      return "border-l-amber-500 bg-amber-50/50 dark:bg-amber-900/10";
                    case "low":
                      return "border-l-red-500 bg-red-50/50 dark:bg-red-900/10";
                    default:
                      return "border-l-gray-400 bg-gray-50/50 dark:bg-gray-900/10";
                  }
                };

                const getConfidenceBadge = (level?: string) => {
                  switch (level) {
                    case "high":
                      return {
                        text: "High",
                        color: "text-green-600 bg-green-100 dark:text-green-400 dark:bg-green-900/20",
                      };
                    case "medium":
                      return {
                        text: "Medium",
                        color: "text-amber-600 bg-amber-100 dark:text-amber-400 dark:bg-amber-900/20",
                      };
                    case "low":
                      return { text: "Low", color: "text-red-600 bg-red-100 dark:text-red-400 dark:bg-red-900/20" };
                    default:
                      return {
                        text: "Unverified",
                        color: "text-gray-600 bg-gray-100 dark:text-gray-400 dark:bg-gray-900/20",
                      };
                  }
                };

                return (
                  <div key={item.id}>
                    {index > 0 && <Separator className="my-4" />}
                    <div
                      className={`space-y-2 border-l-4 pl-4 py-2 rounded-r-md ${getConfidenceColor(item.confidence_level)}`}
                    >
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex items-start gap-2 flex-1">
                          <a
                            href={item.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="font-medium hover:text-primary transition-colors flex items-center gap-2 flex-1"
                          >
                            {item.title}
                            <ExternalLink className="h-4 w-4 flex-shrink-0" />
                          </a>
                          <Badge
                            className={`text-xs ${getConfidenceBadge(item.confidence_level).color}`}
                            variant="outline"
                          >
                            {getConfidenceBadge(item.confidence_level).text}
                          </Badge>
                          {item.relevance_score !== null && item.relevance_score !== undefined && (
                            <Badge variant="outline" className="text-xs font-mono">
                              Score: {item.relevance_score}
                            </Badge>
                          )}
                          {item.source_domain && (
                            <Badge variant="secondary" className="text-xs">
                              {item.source_domain}
                            </Badge>
                          )}
                          {permissions.canEdit && (
                            <Select
                              value={item.confidence_level || "medium"}
                              onValueChange={(value) => handleNewsConfidenceChange(item.id, value)}
                            >
                              <SelectTrigger className="w-24 h-6 text-xs">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="high">High</SelectItem>
                                <SelectItem value="medium">Medium</SelectItem>
                                <SelectItem value="low">Low</SelectItem>
                              </SelectContent>
                            </Select>
                          )}
                        </div>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleDeleteNews(item)}
                          className="flex items-center gap-1 text-destructive hover:text-destructive"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                      <p className="text-sm text-muted-foreground">{item.summary}</p>
                      {item.keywords && item.keywords.length > 0 && (
                        <div className="flex gap-1 flex-wrap">
                          {item.keywords.map((keyword, idx) => (
                            <Badge key={idx} variant="outline" className="text-xs">
                              {keyword}
                            </Badge>
                          ))}
                        </div>
                      )}
                      {item.published_date && (
                        <p className="text-xs text-muted-foreground">
                          {formatDistanceToNow(new Date(item.published_date), { addSuffix: true })}
                        </p>
                      )}
                    </div>
                  </div>
                );
              })
            ) : (
              <p className="text-muted-foreground text-center py-4">
                No news items yet. Click "Add News" to create one.
              </p>
            )}
          </CardContent>
        </Card>
      ) : null}

      {/* Discussion Topics */}
      <Card id="discussion-topics" className="mb-6">
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <MessageSquare className="h-5 w-5" />
              Discussion Topics & Opportunities
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
            <Dialog open={isAddTopicOpen} onOpenChange={setIsAddTopicOpen}>
              <DialogTrigger asChild>
                <Button variant="outline" size="sm" className="flex items-center gap-2">
                  <Plus className="h-4 w-4" />
                  Add Topic
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-md">
                <DialogHeader>
                  <DialogTitle>Add Discussion Topic</DialogTitle>
                </DialogHeader>
                <div className="space-y-4">
                  <div>
                    <Label htmlFor="topic-type">Topic Type</Label>
                    <Select
                      value={newTopic.topic_type}
                      onValueChange={(value) => setNewTopic({ ...newTopic, topic_type: value })}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="touchpoint">Discussion Point</SelectItem>
                        <SelectItem value="opportunity">Opportunity/Challenge</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label htmlFor="topic-title">Title</Label>
                    <Input
                      id="topic-title"
                      value={newTopic.title}
                      onChange={(e) => setNewTopic({ ...newTopic, title: e.target.value })}
                      placeholder="Enter topic title"
                    />
                  </div>
                  <div>
                    <Label htmlFor="topic-description">Description</Label>
                    <Textarea
                      id="topic-description"
                      value={newTopic.description}
                      onChange={(e) => setNewTopic({ ...newTopic, description: e.target.value })}
                      placeholder="Enter topic description"
                      rows={3}
                    />
                  </div>
                  <div className="flex gap-2">
                    <Button onClick={handleAddDiscussionTopic} className="flex-1">
                      Add Topic
                    </Button>
                    <Button variant="outline" onClick={() => setIsAddTopicOpen(false)} className="flex-1">
                      Cancel
                    </Button>
                  </div>
                </div>
              </DialogContent>
            </Dialog>
          </div>
        </CardHeader>
        <CardContent>
          {discussionTopics && discussionTopics.length > 0 ? (
            <div className="space-y-4">
              {discussionTopics.map((topic, index) => (
                <div key={topic.id}>
                  {index > 0 && <Separator className="my-4" />}
                  <div className="space-y-2">
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex items-start gap-2 flex-1">
                        <Badge
                          variant={topic.topic_type === "touchpoint" ? "default" : "secondary"}
                          className="text-xs"
                        >
                          {topic.topic_type === "touchpoint" ? "Discussion Point" : "Opportunity/Challenge"}
                        </Badge>
                      </div>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleDeleteDiscussionTopic(topic)}
                        className="flex items-center gap-1 text-destructive hover:text-destructive"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                    <h4 className="font-semibold">{topic.title}</h4>
                    <p className="text-sm text-muted-foreground">{topic.description}</p>
                    {topic.source_references && topic.source_references.length > 0 && (
                      <div className="text-xs text-muted-foreground">
                        <span className="font-medium">Sources: </span>
                        <div className="flex flex-wrap gap-2 mt-1">
                          {topic.source_references.map((source, idx) => (
                            <a
                              key={idx}
                              href={source}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-primary hover:underline break-all"
                            >
                              {source}
                            </a>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-muted-foreground text-center py-4">
              No discussion topics yet. Click "Add Topic" to create one.
            </p>
          )}
        </CardContent>
      </Card>

        </TabsContent>

        <TabsContent value="scripts" className="space-y-6 mt-6">
          {/* Introduction Scripts Section */}
          <div ref={scriptsRef} id="scripts" className="scroll-mt-20">
            <IntroScripts researchJobId={id!} />
          </div>
        </TabsContent>

        <RoleGuard allowedRoles={['super_admin']} mode="hide">
          <TabsContent value="debug" className="space-y-6 mt-6">
            <DebugPanel researchJobId={id!} />
          </TabsContent>
        </RoleGuard>

        <RoleGuard allowedRoles={['super_admin']} mode="hide">
          <TabsContent value="ai-tools" className="space-y-6 mt-6">
            {/* AI-Powered Research Tools */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Handshake className="h-5 w-5" />
                  AI-Powered Research Tools
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                <EmbeddingsManager researchJobId={id!} />
                <Separator />
                <div className="grid md:grid-cols-2 gap-6">
                  <RAGScriptGenerator researchJobId={id!} />
                  <HistoricalInsights researchJobId={id!} />
                </div>
                <Separator />
                <SemanticSearchPanel />
              </CardContent>
            </Card>
          </TabsContent>
        </RoleGuard>
      </Tabs>
    </div>
  );
}
