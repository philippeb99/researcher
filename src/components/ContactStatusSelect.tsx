import React from "react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { cn } from "@/lib/utils";
import { useUpdateContactStatus } from "@/hooks/useUpdateContactStatus";
import { Loader2 } from "lucide-react";

interface ContactStatus {
  id: string;
  value: string;
  label: string;
  color: string;
}

interface ContactStatusSelectProps {
  jobId: string;
  currentStatus: string | null;
  contactStatuses: ContactStatus[];
  disabled?: boolean;
}

const getContactStatusColor = (status: string | null) => {
  if (!status || status === "never") return "bg-muted text-muted-foreground";
  
  const colorMap: Record<string, string> = {
    first_call: "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200",
    follow_up: "bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200",
    connected: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200",
    meeting_scheduled: "bg-cyan-100 text-cyan-800 dark:bg-cyan-900 dark:text-cyan-200",
    proposal_sent: "bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-200",
    not_interested: "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200",
  };
  
  return colorMap[status] || "bg-muted text-muted-foreground";
};

const getStatusDotColor = (color: string) => {
  const colorMap: Record<string, string> = {
    blue: "bg-blue-500",
    purple: "bg-purple-500",
    green: "bg-green-500",
    cyan: "bg-cyan-500",
    amber: "bg-amber-500",
    red: "bg-red-500",
    gray: "bg-gray-500",
  };
  return colorMap[color] || "bg-gray-500";
};

export const ContactStatusSelect: React.FC<ContactStatusSelectProps> = ({
  jobId,
  currentStatus,
  contactStatuses,
  disabled = false,
}) => {
  const updateStatus = useUpdateContactStatus();

  const handleStatusChange = (newStatus: string) => {
    updateStatus.mutate({ jobId, status: newStatus });
  };

  return (
    <Select
      value={currentStatus || "never"}
      onValueChange={handleStatusChange}
      disabled={disabled || updateStatus.isPending}
    >
      <SelectTrigger 
        className={cn(
          "h-7 text-xs border-0 shadow-none hover:opacity-80 transition-opacity",
          getContactStatusColor(currentStatus)
        )}
      >
        <div className="flex items-center gap-2">
          {updateStatus.isPending && <Loader2 className="h-3 w-3 animate-spin" />}
          <SelectValue />
        </div>
      </SelectTrigger>
      <SelectContent>
        {contactStatuses.map((status) => (
          <SelectItem key={status.id} value={status.value}>
            <div className="flex items-center gap-2">
              <div className={cn("w-2 h-2 rounded-full", getStatusDotColor(status.color))} />
              <span>{status.label}</span>
            </div>
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
};
