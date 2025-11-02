import React from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { useContactStatuses } from "@/hooks/useContactStatuses";
import { useSearchParams } from "react-router-dom";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { formatDistanceToNow } from "date-fns";
import {
  Building2,
  MapPin,
  ExternalLink,
  Calendar,
  Eye,
  Play,
  Edit,
  Trash2,
  Users,
  RefreshCw,
  ArrowUpDown,
  Loader2,
  DollarSign,
  Search,
  X,
  Database,
} from "lucide-react";
import { useUserRole } from "@/hooks/useUserRole";
import RoleGuard from "@/components/RoleGuard";
import { Progress } from "@/components/ui/progress";
import { ContactStatusSelect } from "@/components/ContactStatusSelect";
import { useEnrichData } from "@/hooks/useEnrichData";
import { useUserList } from "@/hooks/useUserList";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Checkbox } from "@/components/ui/checkbox";

interface ResearchJob {
  id: string;
  user_id: string;
  company_name: string;
  location: string;
  website_url: string;
  ceo_name: string;
  company_keywords: string[] | null;
  industry_business_model: string | null;
  status: "new" | "processing" | "processed" | "error";
  contact_status?: string;
  last_contact_datetime?: string;
  created_at: string;
  updated_at: string;
  processed_at: string | null;
  display_name?: string;
  user_email?: string;
  employee_count?: number | null;
  revenue_amount?: number | null;
  ebitda_amount?: number | null;
  executives?: Array<{
    name: string;
    position: string;
  }>;
}

interface ResearchJobListProps {
  onEdit: (job: ResearchJob) => void;
  onViewDetails: (job: ResearchJob) => void;
  onProcess: (job: ResearchJob) => void;
  onRefineData: (job: ResearchJob) => void;
  searchTerm?: string;
  onSearchChange?: (value: string) => void;
  onClearSearch?: () => void;
  processingJobs?: Set<string>;
}

export function ResearchJobList({
  onEdit,
  onViewDetails,
  onProcess,
  onRefineData,
  searchTerm = "",
  onSearchChange,
  onClearSearch,
  processingJobs = new Set(),
}: ResearchJobListProps) {
  const { user } = useAuth();
  const { permissions, loading: roleLoading } = useUserRole();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { statuses: contactStatuses } = useContactStatuses();
  const { users, isLoading: usersLoading } = useUserList();
  const [searchParams, setSearchParams] = useSearchParams();
  const [enrichingJobId, setEnrichingJobId] = React.useState<string | null>(null);
  const enrichData = useEnrichData({
    onSuccess: () => setEnrichingJobId(null),
    onError: () => setEnrichingJobId(null),
  });

  // Initialize from URL params with fallback to localStorage
  const [sortBy, setSortBy] = React.useState<"updated_at" | "company_name" | "created_at" | "status">(() => 
    (searchParams.get('sortBy') as any) || localStorage.getItem('jobListSort') || 'updated_at'
  );
  const [sortDirection, setSortDirection] = React.useState<"asc" | "desc">(() =>
    (searchParams.get('dir') as any) || localStorage.getItem('jobListSortDirection') || 'desc'
  );
  const [jobStatusFilter, setJobStatusFilter] = React.useState<string>(() =>
    searchParams.get('status') || localStorage.getItem('jobStatusFilter') || 'all'
  );
  const [contactStatusFilter, setContactStatusFilter] = React.useState<string>(() =>
    searchParams.get('contact') || localStorage.getItem('contactStatusFilter') || 'all'
  );
  const [countryFilter, setCountryFilter] = React.useState<string>(() =>
    searchParams.get('country') || localStorage.getItem('countryFilter') || 'all'
  );
  const [employeeOperator, setEmployeeOperator] = React.useState<string>(() =>
    searchParams.get('empOp') || localStorage.getItem('employeeOperator') || 'any'
  );
  const [employeeValue, setEmployeeValue] = React.useState<string>(() =>
    searchParams.get('empVal') || localStorage.getItem('employeeValue') || ''
  );
  const [revenueOperator, setRevenueOperator] = React.useState<string>(() =>
    searchParams.get('revOp') || localStorage.getItem('revenueOperator') || 'any'
  );
  const [revenueValue, setRevenueValue] = React.useState<string>(() =>
    searchParams.get('revVal') || localStorage.getItem('revenueValue') || ''
  );
  const [ownerFilter, setOwnerFilter] = React.useState<string[]>(() =>
    searchParams.get('owners')?.split(',').filter(Boolean) || 
    localStorage.getItem('ownerFilter')?.split(',').filter(Boolean) || 
    []
  );

  // Build color and label maps from contact statuses
  const contactStatusColorMap = React.useMemo(() => {
    const colorMap: Record<string, string> = {};
    contactStatuses.forEach((status) => {
      const colorClass = {
        gray: 'text-gray-600 border-gray-300',
        blue: 'text-blue-600 border-blue-300',
        green: 'text-green-600 border-green-300',
        orange: 'text-orange-600 border-orange-300',
        purple: 'text-purple-600 border-purple-300',
        red: 'text-red-600 border-red-300',
        yellow: 'text-yellow-600 border-yellow-300',
      }[status.color] || 'text-gray-600 border-gray-300';
      colorMap[status.value] = colorClass;
    });
    return colorMap;
  }, [contactStatuses]);

  const contactStatusLabelMap = React.useMemo(() => {
    const labelMap: Record<string, string> = {};
    contactStatuses.forEach((status) => {
      labelMap[status.value] = status.label;
    });
    return labelMap;
  }, [contactStatuses]);

  // Sync filters to URL whenever they change
  React.useEffect(() => {
    const params = new URLSearchParams(searchParams);
    
    // Update all filter params (only include non-default values)
    if (sortBy !== 'updated_at') params.set('sortBy', sortBy);
    else params.delete('sortBy');
    
    if (sortDirection !== 'desc') params.set('dir', sortDirection);
    else params.delete('dir');
    
    if (jobStatusFilter !== 'all') params.set('status', jobStatusFilter);
    else params.delete('status');
    
    if (contactStatusFilter !== 'all') params.set('contact', contactStatusFilter);
    else params.delete('contact');
    
    if (countryFilter !== 'all') params.set('country', countryFilter);
    else params.delete('country');
    
    if (employeeOperator !== 'any') params.set('empOp', employeeOperator);
    else params.delete('empOp');
    
    if (employeeValue) params.set('empVal', employeeValue);
    else params.delete('empVal');
    
    if (revenueOperator !== 'any') params.set('revOp', revenueOperator);
    else params.delete('revOp');
    
    if (revenueValue) params.set('revVal', revenueValue);
    else params.delete('revVal');
    
    if (ownerFilter.length > 0) params.set('owners', ownerFilter.join(','));
    else params.delete('owners');
    
    setSearchParams(params, { replace: true });
    
    // Also save to localStorage as backup
    localStorage.setItem('jobListSort', sortBy);
    localStorage.setItem('jobListSortDirection', sortDirection);
    localStorage.setItem('jobStatusFilter', jobStatusFilter);
    localStorage.setItem('contactStatusFilter', contactStatusFilter);
    localStorage.setItem('countryFilter', countryFilter);
    localStorage.setItem('employeeOperator', employeeOperator);
    localStorage.setItem('employeeValue', employeeValue);
    localStorage.setItem('revenueOperator', revenueOperator);
    localStorage.setItem('revenueValue', revenueValue);
    localStorage.setItem('ownerFilter', ownerFilter.join(','));
  }, [sortBy, sortDirection, jobStatusFilter, contactStatusFilter, countryFilter, 
      employeeOperator, employeeValue, revenueOperator, revenueValue, ownerFilter, searchParams, setSearchParams]);

  const { data: jobs, isLoading } = useQuery({
    queryKey: ["research-jobs", permissions.canViewAll, user?.id],
    queryFn: async () => {
      if (!user) return [];

      if (permissions.canViewAll) {
        // SuperAdmins get research jobs with user info
        const { data, error } = await supabase.rpc("get_research_jobs_with_user_info");
        if (error) throw error;
        return data as ResearchJob[];
      } else {
        // Regular users get only their own jobs
        const { data, error } = await supabase
          .from("research_jobs")
          .select(
            `
            *,
            executives (
              name,
              position
            )
          `,
          )
          .eq("user_id", user.id)
          .order("updated_at", { ascending: false });

        if (error) throw error;
        return data as ResearchJob[];
      }
    },
    enabled: !!user && !roleLoading,
    retry: 3,
    retryDelay: 1000,
  });

  // Restore scroll position when returning from details page
  React.useEffect(() => {
    const scrollPosition = sessionStorage.getItem('jobListScrollPosition');
    const clickedJobId = sessionStorage.getItem('clickedJobId');
    
    if (scrollPosition && clickedJobId && jobs && jobs.length > 0) {
      // Wait for jobs to render
      const restoreScroll = () => {
        const cardElement = document.getElementById(`job-card-${clickedJobId}`);
        
        if (cardElement) {
          // Scroll to the card with offset for header
          const yOffset = -100;
          const y = cardElement.getBoundingClientRect().top + window.pageYOffset + yOffset;
          window.scrollTo({ top: y, behavior: 'smooth' });
          
          // Add temporary highlight
          cardElement.classList.add('ring-2', 'ring-primary', 'ring-offset-2');
          setTimeout(() => {
            cardElement.classList.remove('ring-2', 'ring-primary', 'ring-offset-2');
          }, 2000);
        } else {
          // Fallback to saved scroll position
          window.scrollTo({ top: parseInt(scrollPosition), behavior: 'smooth' });
        }
        
        // Clean up session storage
        sessionStorage.removeItem('jobListScrollPosition');
        sessionStorage.removeItem('clickedJobId');
      };
      
      setTimeout(restoreScroll, 100);
    }
  }, [jobs]);

  // Extract country from location string
  const extractCountry = (location: string): string => {
    if (!location) return "Unknown";

    // Split by comma and take the last part (usually the country)
    const parts = location.split(",").map((p) => p.trim());
    const country = parts[parts.length - 1];

    // Normalize common variations
    const countryMap: { [key: string]: string } = {
      USA: "United States",
      US: "United States",
      "U.S.": "United States",
      UK: "United Kingdom",
      "U.K.": "United Kingdom",
    };

    return countryMap[country] || country;
  };

  // Get unique countries from jobs
  const uniqueCountries = React.useMemo(() => {
    if (!jobs) return [];
    const countries = new Set(jobs.map((job) => extractCountry(job.location)));
    return Array.from(countries).sort();
  }, [jobs]);

  // Filter and sort jobs
  const filteredAndSortedJobs = React.useMemo(() => {
    let result = jobs || [];

    // Filter by job status
    if (jobStatusFilter !== "all") {
      result = result.filter((job) => {
        if (jobStatusFilter === "processed") return job.status === "processed";
        if (jobStatusFilter === "error") return job.status === "error";
        if (jobStatusFilter === "new") return job.status === "new";
        if (jobStatusFilter === "processing") return job.status === "processing";
        return true;
      });
    }

    // Filter by contact status
    if (contactStatusFilter !== "all") {
      result = result.filter((job) => {
        if (contactStatusFilter === "never") {
          return !job.contact_status || job.contact_status === "never";
        }
        return job.contact_status === contactStatusFilter;
      });
    }

    // Filter by country
    if (countryFilter !== "all") {
      result = result.filter((job) => extractCountry(job.location) === countryFilter);
    }

    // Filter by owner (super_admin only)
    if (permissions.canViewAll && ownerFilter.length > 0) {
      result = result.filter((job) => ownerFilter.includes(job.user_id));
    }

    // Filter by employee count
    if (employeeOperator !== "any" && employeeValue) {
      const targetCount = parseInt(employeeValue);
      result = result.filter((job) => {
        if (!job.employee_count) return false;
        if (employeeOperator === "equal") return job.employee_count === targetCount;
        if (employeeOperator === "greater") return job.employee_count > targetCount;
        if (employeeOperator === "less") return job.employee_count < targetCount;
        return true;
      });
    }

    // Filter by revenue
    if (revenueOperator !== "any" && revenueValue) {
      const targetRevenue = parseFloat(revenueValue);
      result = result.filter((job) => {
        if (!job.revenue_amount) return false;
        if (revenueOperator === "equal") return job.revenue_amount === targetRevenue;
        if (revenueOperator === "greater") return job.revenue_amount > targetRevenue;
        if (revenueOperator === "less") return job.revenue_amount < targetRevenue;
        return true;
      });
    }

    // Filter by search term
    if (searchTerm.trim()) {
      const searchLower = searchTerm.toLowerCase();
      result = result.filter((job) => {
        if (job.company_name.toLowerCase().includes(searchLower)) return true;
        if (job.ceo_name.toLowerCase().includes(searchLower)) return true;
        if (job.company_keywords?.some((keyword) => keyword.toLowerCase().includes(searchLower))) return true;
        if (job.industry_business_model?.toLowerCase().includes(searchLower)) return true;
        if (
          job.executives?.some(
            (exec) =>
              exec.name.toLowerCase().includes(searchLower) || exec.position.toLowerCase().includes(searchLower),
          )
        )
          return true;
        return false;
      });
    }

    // Sort
    result = [...result].sort((a, b) => {
      let compareValue = 0;

      if (sortBy === "company_name") {
        compareValue = a.company_name.localeCompare(b.company_name);
      } else if (sortBy === "created_at") {
        compareValue = new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
      } else if (sortBy === "updated_at") {
        compareValue = new Date(a.updated_at).getTime() - new Date(b.updated_at).getTime();
      } else if (sortBy === "status") {
        const statusOrder = { new: 0, processing: 1, complete: 2, error: 3 };
        compareValue = statusOrder[a.status] - statusOrder[b.status];
      }

      return sortDirection === "asc" ? compareValue : -compareValue;
    });

    return result;
  }, [
    jobs,
    jobStatusFilter,
    contactStatusFilter,
    countryFilter,
    ownerFilter,
    permissions.canViewAll,
    employeeOperator,
    employeeValue,
    revenueOperator,
    revenueValue,
    searchTerm,
    sortBy,
    sortDirection,
  ]);

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

  const handleDelete = async (jobId: string) => {
    try {
      const { error } = await supabase.from("research_jobs").delete().eq("id", jobId);

      if (error) throw error;

      toast({ title: "Research job deleted successfully" });
      queryClient.invalidateQueries({ queryKey: ["research-jobs"] });
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const getStatusVariant = (status: string) => {
    switch (status) {
      case "new":
        return "secondary";
      case "processing":
        return "default";
      case "processed":
        return "default";
      case "complete":
        return "default"; // Keep for backward compatibility
      case "error":
        return "destructive";
      default:
        return "secondary";
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "new":
        return "text-muted-foreground";
      case "processing":
        return "text-blue-600";
      case "processed":
        return "text-green-600";
      case "complete":
        return "text-green-600"; // Keep for backward compatibility
      case "error":
        return "text-red-600";
      default:
        return "text-muted-foreground";
    }
  };

  const getContactStatusColor = (status: string) => {
    return contactStatusColorMap[status] || "text-muted-foreground";
  };

  const getContactStatusLabel = (status: string) => {
    return contactStatusLabelMap[status] || "";
  };

  if (isLoading) {
    return (
      <div className="space-y-4">
        {[1, 2, 3].map((i) => (
          <Card key={i} className="animate-pulse">
            <CardContent className="p-6">
              <div className="h-4 bg-muted rounded w-1/3 mb-2"></div>
              <div className="h-3 bg-muted rounded w-2/3 mb-4"></div>
              <div className="flex gap-2">
                <div className="h-8 bg-muted rounded w-20"></div>
                <div className="h-8 bg-muted rounded w-20"></div>
                <div className="h-8 bg-muted rounded w-20"></div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  if (!jobs || jobs.length === 0) {
    return (
      <Card>
        <CardContent className="p-8 text-center">
          <Building2 className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
          <h3 className="text-lg font-semibold mb-2">No research jobs yet</h3>
          <p className="text-muted-foreground">Create your first research job to get started.</p>
        </CardContent>
      </Card>
    );
  }


  const processingCount = processingJobs.size;

  const handleSortChange = (newSort: typeof sortBy) => {
    if (sortBy === newSort) {
      const newDirection = sortDirection === "asc" ? "desc" : "asc";
      setSortDirection(newDirection);
    } else {
      setSortBy(newSort);
      setSortDirection("desc");
    }
  };

  const handleViewDetailsClick = (job: ResearchJob) => {
    // Save scroll position and clicked card ID before navigating
    sessionStorage.setItem('jobListScrollPosition', window.scrollY.toString());
    sessionStorage.setItem('clickedJobId', job.id);
    onViewDetails(job);
  };

  const handleClearFilters = () => {
    setJobStatusFilter('all');
    setContactStatusFilter('all');
    setCountryFilter('all');
    setOwnerFilter([]);
    setEmployeeOperator('any');
    setEmployeeValue('');
    setRevenueOperator('any');
    setRevenueValue('');
    onClearSearch?.();
  };

  return (
    <div className="space-y-4">
      {/* Processing indicator */}
      {processingCount > 0 && (
        <Card className="border-primary/50 bg-primary/5">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <Loader2 className="h-5 w-5 animate-spin text-primary" />
              <div className="flex-1">
                <p className="text-sm font-medium">
                  {processingCount} {processingCount === 1 ? "job" : "jobs"} processing
                </p>
                <p className="text-xs text-muted-foreground">This may take a few minutes</p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Filter Section */}
      <Card>
        <CardContent className="p-4 space-y-4">
          {/* Search Section */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search companies..."
              value={searchTerm}
              onChange={(e) => onSearchChange?.(e.target.value)}
              className="pl-10 pr-10"
            />
            {searchTerm && (
              <Button
                variant="ghost"
                size="sm"
                className="absolute right-1 top-1/2 transform -translate-y-1/2 h-7 w-7 p-0"
                onClick={() => onClearSearch?.()}
              >
                <X className="h-4 w-4" />
              </Button>
            )}
          </div>

          {/* Filters Section */}
          <div className="flex flex-col lg:flex-row gap-4">
            <div className="flex-1">
              <Label className="text-sm text-muted-foreground mb-2 block">Job Status</Label>
              <Select
                value={jobStatusFilter}
                onValueChange={setJobStatusFilter}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Statuses</SelectItem>
                  <SelectItem value="new">New</SelectItem>
                  <SelectItem value="processing">Processing</SelectItem>
                  <SelectItem value="processed">Processed</SelectItem>
                  <SelectItem value="error">Error/Failed</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="flex-1">
              <Label className="text-sm text-muted-foreground mb-2 block">Contact Status</Label>
              <Select
                value={contactStatusFilter}
                onValueChange={setContactStatusFilter}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Contact Status</SelectItem>
                  {contactStatuses.map((status) => (
                    <SelectItem key={status.id} value={status.value}>
                      {status.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="flex-1">
              <Label className="text-sm text-muted-foreground mb-2 block">Country</Label>
              <Select
                value={countryFilter}
                onValueChange={setCountryFilter}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Countries</SelectItem>
                  {uniqueCountries.map((country) => (
                    <SelectItem key={country} value={country}>
                      {country}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {permissions.canViewAll && (
              <div className="flex-1">
                <Label className="text-sm text-muted-foreground mb-2 block">
                  Owner
                </Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      role="combobox"
                      className="w-full justify-between"
                    >
                      {ownerFilter.length === 0 ? (
                        "All Users"
                      ) : (
                        `${ownerFilter.length} user${ownerFilter.length > 1 ? 's' : ''} selected`
                      )}
                      <Users className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-[300px] p-0" align="start">
                    <div className="max-h-[300px] overflow-y-auto p-2">
                      {usersLoading ? (
                        <div className="p-2 text-sm text-muted-foreground">
                          Loading users...
                        </div>
                      ) : (
                        <>
                          {/* Select All / Deselect All */}
                          <div className="flex items-center space-x-2 px-2 py-2 border-b">
                            <Checkbox
                              id="select-all"
                              checked={ownerFilter.length === users.length && users.length > 0}
                              onCheckedChange={(checked) => {
                                setOwnerFilter(checked ? users.map(u => u.user_id) : []);
                              }}
                            />
                            <label htmlFor="select-all" className="text-sm font-medium cursor-pointer">
                              {ownerFilter.length === users.length && users.length > 0 ? 'Deselect All' : 'Select All'}
                            </label>
                          </div>
                          
                          {/* User checkboxes */}
                          {users.map((user) => (
                            <div
                              key={user.user_id}
                              className="flex items-center space-x-2 px-2 py-2 hover:bg-accent rounded-sm"
                            >
                              <Checkbox
                                id={`user-${user.user_id}`}
                                checked={ownerFilter.includes(user.user_id)}
                                onCheckedChange={(checked) => {
                                  setOwnerFilter(prev =>
                                    checked
                                      ? [...prev, user.user_id]
                                      : prev.filter(id => id !== user.user_id)
                                  );
                                }}
                              />
                              <label
                                htmlFor={`user-${user.user_id}`}
                                className="text-sm flex-1 cursor-pointer"
                              >
                                {user.display_name || user.email || 'Unknown User'}
                              </label>
                            </div>
                          ))}
                        </>
                      )}
                    </div>
                  </PopoverContent>
                </Popover>
              </div>
            )}

            <div className="flex-1">
              <Label className="text-sm text-muted-foreground mb-2 block">Employee Count</Label>
              <div className="flex gap-2">
                <Select
                  value={employeeOperator}
                  onValueChange={setEmployeeOperator}
                >
                  <SelectTrigger className="w-[120px]">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="any">Any</SelectItem>
                    <SelectItem value="equal">Equal to</SelectItem>
                    <SelectItem value="greater">Greater than</SelectItem>
                    <SelectItem value="less">Less than</SelectItem>
                  </SelectContent>
                </Select>
                {employeeOperator !== "any" && (
                  <Input
                    type="number"
                    placeholder="Count"
                    value={employeeValue}
                    onChange={(e) => setEmployeeValue(e.target.value)}
                    min="0"
                  />
                )}
              </div>
            </div>

            <div className="flex-1">
              <Label className="text-sm text-muted-foreground mb-2 block">Revenue (USD)</Label>
              <div className="flex gap-2">
                <Select
                  value={revenueOperator}
                  onValueChange={setRevenueOperator}
                >
                  <SelectTrigger className="w-[120px]">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="any">Any</SelectItem>
                    <SelectItem value="equal">Equal to</SelectItem>
                    <SelectItem value="greater">Greater than</SelectItem>
                    <SelectItem value="less">Less than</SelectItem>
                  </SelectContent>
                </Select>
                {revenueOperator !== "any" && (
                  <Input
                    type="number"
                    placeholder="Amount"
                    value={revenueValue}
                    onChange={(e) => setRevenueValue(e.target.value)}
                    min="0"
                    step="1000"
                  />
                )}
              </div>
            </div>

              <Button
                variant="outline"
                size="sm"
                onClick={handleClearFilters}
                className="min-h-[44px]"
              >
                <X className="h-4 w-4 mr-2" />
                Clear All
              </Button>
          </div>

          {/* Active Filters Badge */}
          {(searchTerm ||
            jobStatusFilter !== "all" ||
            contactStatusFilter !== "all" ||
            countryFilter !== "all" ||
            (permissions.canViewAll && ownerFilter.length > 0) ||
            (employeeOperator !== "any" && employeeValue) ||
            (revenueOperator !== "any" && revenueValue)) && (
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-sm text-muted-foreground">Active filters:</span>
              {searchTerm && (
                <Badge variant="secondary">
                  <Search className="h-3 w-3 mr-1" />
                  Search: "{searchTerm}"
                </Badge>
              )}
              {jobStatusFilter !== "all" && <Badge variant="secondary">Status: {jobStatusFilter}</Badge>}
              {contactStatusFilter !== "all" && <Badge variant="secondary">Contact: {contactStatusFilter}</Badge>}
              {countryFilter !== "all" && <Badge variant="secondary">Country: {countryFilter}</Badge>}
              {permissions.canViewAll && ownerFilter.length > 0 && (
                <Badge variant="secondary">
                  <Users className="h-3 w-3 mr-1" />
                  Owners: {ownerFilter.length} selected
                </Badge>
              )}
              {employeeOperator !== "any" && employeeValue && (
                <Badge variant="secondary">
                  Employees: {employeeOperator} {formatNumber(parseInt(employeeValue))}
                </Badge>
              )}
              {revenueOperator !== "any" && revenueValue && (
                <Badge variant="secondary">
                  Revenue: {revenueOperator} {formatCurrency(parseFloat(revenueValue))}
                </Badge>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Sort controls and Results Counter */}
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <p className="text-sm text-muted-foreground">
          Showing <span className="font-medium text-foreground">{filteredAndSortedJobs.length}</span> of{" "}
          <span className="font-medium text-foreground">{jobs.length}</span> companies
          {searchTerm && (
            <span className="font-medium"> matching "{searchTerm}"</span>
          )}
        </p>
        
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-sm text-muted-foreground">Sort by:</span>
          <Select value={sortBy} onValueChange={(value: any) => handleSortChange(value)}>
            <SelectTrigger className="w-[180px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="updated_at">Last Updated</SelectItem>
              <SelectItem value="company_name">Company Name</SelectItem>
              <SelectItem value="created_at">Created Date</SelectItem>
              <SelectItem value="status">Status</SelectItem>
            </SelectContent>
          </Select>
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              const newDirection = sortDirection === "asc" ? "desc" : "asc";
              setSortDirection(newDirection);
              localStorage.setItem("jobListSortDirection", newDirection);
            }}
          >
            <ArrowUpDown className="h-4 w-4 mr-2" />
            {sortDirection === "asc" ? "Ascending" : "Descending"}
          </Button>
        </div>
      </div>

      {/* Empty State or Job Cards */}
      {filteredAndSortedJobs.length === 0 ? (
        <Card>
          <CardContent className="p-8 text-center">
            <Building2 className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <h3 className="text-lg font-semibold mb-2">No companies found</h3>
            <p className="text-muted-foreground">
              {searchTerm || 
               jobStatusFilter !== "all" || 
               contactStatusFilter !== "all" || 
               countryFilter !== "all" ||
               (employeeOperator !== "any" && employeeValue) ||
               (revenueOperator !== "any" && revenueValue)
                ? "No companies match your current filters and search. Try adjusting your criteria."
                : "No companies in the database yet. Create your first research job to get started."}
            </p>
          </CardContent>
        </Card>
      ) : (
        filteredAndSortedJobs.map((job) => {
        const isProcessing = processingJobs.has(job.id) || job.status === "processing";
        return (
          <Card 
            key={job.id} 
            id={`job-card-${job.id}`}
            className={`hover:shadow-md transition-shadow ${isProcessing ? "border-primary/50" : ""}`}
          >
            <CardContent className="p-6">
              {isProcessing && (
                <div className="mb-3">
                  <div className="flex items-center gap-2 mb-2">
                    <Loader2 className="h-4 w-4 animate-spin text-primary" />
                    <span className="text-sm font-medium text-primary">Processing...</span>
                  </div>
                  <Progress value={undefined} className="h-1" />
                </div>
              )}
              <div className="relative mb-4">
                <div className="flex-1 pr-24">
                  <h3 className="text-lg font-semibold mb-2 flex items-center gap-2">
                    <Building2 className="h-5 w-5 text-primary" />
                    {job.company_name}
                  </h3>

                  <div className="flex items-center gap-2 sm:gap-4 text-sm text-muted-foreground mb-3 flex-wrap">
                    <span className="flex items-center gap-1">
                      <Users className="h-4 w-4" />
                      CEO: {job.ceo_name}
                    </span>
                    <span className="flex items-center gap-1">
                      <MapPin className="h-4 w-4" />
                      {job.location}
                    </span>
                    <a
                      href={job.website_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-1 hover:text-primary transition-colors"
                    >
                      <ExternalLink className="h-4 w-4" />
                      Website
                    </a>
                    {permissions.canViewAll && job.display_name && (
                      <span className="flex items-center gap-1">
                        <Users className="h-4 w-4 text-secondary" />
                        <span>By:</span>
                        <span className="font-medium text-foreground">{job.display_name}</span>
                      </span>
                    )}
                    <span className="flex items-center gap-1">
                      <Calendar className="h-4 w-4" />
                      {formatDistanceToNow(new Date(job.updated_at), { addSuffix: true })}
                    </span>
                  </div>

                  <div className="flex flex-col gap-2">
                    {/* Contact Status Row - Always show for editors/admins */}
                    {(permissions.canEdit || permissions.canViewAll) ? (
                      <div className="flex items-center gap-2">
                        <span className="text-xs text-muted-foreground">Contact:</span>
                        <ContactStatusSelect
                          jobId={job.id}
                          currentStatus={job.contact_status}
                          contactStatuses={contactStatuses}
                        />
                      </div>
                    ) : (
                      job.contact_status && job.contact_status !== "never" && (
                        <div className="flex items-center gap-2">
                          <span className="text-xs text-muted-foreground">Contact:</span>
                          <Badge variant="outline" className={getContactStatusColor(job.contact_status)}>
                            {getContactStatusLabel(job.contact_status)}
                          </Badge>
                        </div>
                      )
                    )}
                    
                    {/* Company Stats */}
                    <div className="flex items-center gap-3 text-sm text-muted-foreground flex-wrap">
                      {job.employee_count && (
                        <span className="flex items-center gap-1">
                          <Users className="h-4 w-4" />
                          {formatNumber(job.employee_count)} employees
                        </span>
                      )}
                      {job.revenue_amount && (
                        <span className="flex items-center gap-1">
                          <DollarSign className="h-4 w-4" />
                          {formatCurrency(job.revenue_amount)}
                        </span>
                      )}
                    </div>
                  </div>

                  {job.company_keywords && job.company_keywords.length > 0 && (
                    <div className="flex flex-wrap gap-1 mt-3">
                      {job.company_keywords.map((keyword, index) => (
                        <Badge key={index} variant="outline" className="text-xs">
                          {keyword}
                        </Badge>
                      ))}
                    </div>
                  )}
                </div>
                
                {/* Job Status Badge - Top Right */}
                <div className="absolute top-0 right-0">
                  <Badge variant={getStatusVariant(job.status)} className={getStatusColor(job.status)}>
                    {job.status === "processing" && <RefreshCw className="h-3 w-3 mr-1 animate-spin" />}
                    {job.status.charAt(0).toUpperCase() + job.status.slice(1)}
                  </Badge>
                </div>
              </div>

              <div className="flex flex-col sm:flex-row gap-2 pt-4 border-t">
                {/* Primary actions - always visible */}
                <div className="flex gap-2 sm:flex-1">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleViewDetailsClick(job)}
                    disabled={job.status === "new"}
                    className="flex-1 min-h-[44px]"
                  >
                    <Eye className="h-4 w-4 sm:mr-2" />
                    <span className="hidden sm:inline">Details</span>
                  </Button>

                  <RoleGuard allowedRoles={["super_admin", "editor"]} mode="disable">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => onProcess(job)}
                      disabled={isProcessing}
                      className="flex-1 min-h-[44px]"
                    >
                      {isProcessing ? (
                        <RefreshCw className="h-4 w-4 sm:mr-2 animate-spin" />
                      ) : (
                        <Play className="h-4 w-4 sm:mr-2" />
                      )}
                      <span className="hidden sm:inline">{job.status === "new" ? "Process" : "Reprocess"}</span>
                    </Button>
                  </RoleGuard>

                  {job.status === "processed" && (
                    <RoleGuard allowedRoles={["super_admin", "editor"]} mode="disable">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={(e) => {
                          e.stopPropagation();
                          setEnrichingJobId(job.id);
                          enrichData.mutate(job.id);
                        }}
                        disabled={enrichingJobId === job.id}
                        className="flex-1 min-h-[44px]"
                      >
                        {enrichingJobId === job.id ? (
                          <RefreshCw className="h-4 w-4 sm:mr-2 animate-spin" />
                        ) : (
                          <Database className="h-4 w-4 sm:mr-2" />
                        )}
                        <span className="hidden sm:inline">Enrich</span>
                      </Button>
                    </RoleGuard>
                  )}
                </div>

                {/* Secondary actions - responsive layout */}
                <div className="flex gap-2 sm:flex-1">
                  {/* REFINE BUTTON HIDDEN - Keep for future refactor
                <RoleGuard allowedRoles={['super_admin', 'editor']} mode="disable">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => onRefineData(job)}
                    disabled={job.status !== 'complete'}
                    className="flex-1 min-h-[44px]"
                  >
                    <Shield className="h-4 w-4 sm:mr-2" />
                    <span className="hidden sm:inline">Refine</span>
                  </Button>
                </RoleGuard>
                */}

                  <RoleGuard allowedRoles={["super_admin", "editor"]} mode="disable">
                    <Button variant="outline" size="sm" onClick={() => onEdit(job)} className="flex-1 min-h-[44px]">
                      <Edit className="h-4 w-4 sm:mr-2" />
                      <span className="hidden sm:inline">Edit</span>
                    </Button>
                  </RoleGuard>

                  <RoleGuard allowedRoles={["super_admin"]} mode="hide">
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button variant="outline" size="sm" className="min-h-[44px] px-3">
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>Delete Research Job</AlertDialogTitle>
                          <AlertDialogDescription>
                            Are you sure you want to delete the research job for "{job.company_name}"? This will also
                            delete all related data including executives, news, and discussion topics. This action
                            cannot be undone.
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>Cancel</AlertDialogCancel>
                          <AlertDialogAction
                            onClick={() => handleDelete(job.id)}
                            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                          >
                             Delete
                          </AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  </RoleGuard>
                </div>
              </div>
            </CardContent>
          </Card>
        );
      }))}
    </div>
  );
}
