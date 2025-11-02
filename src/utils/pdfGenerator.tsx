import React from 'react';
import { pdf } from '@react-pdf/renderer';
import { ResearchReportPDF } from '@/components/pdf/ResearchReportPDF';

// Export interfaces for external use
export interface Executive {
  name: string;
  position: string;
  linkedin_url?: string;
  confidence_level?: string;
  location?: string;
}

export interface CitationSource {
  url: string;
  section?: string;
}

export interface DiscussionTopic {
  title: string;
  description: string;
  source_references?: string[];
}

export interface PDFData {
  companyName: string;
  location: string;
  websiteUrl: string;
  ceoName: string;
  ceoLinkedIn?: string;
  contactStatus?: string;
  lastContactDate?: string;
  processedAt?: string;
  createdAt: string;
  requestedBy?: string;
  companyOverview?: string;
  executives?: Executive[];
  top5?: string | object;
  industryBusinessModel?: string;
  marketPosition?: string;
  keyProductsCustomers?: string;
  recentDevelopments?: string;
  financialInformation?: string;
  employeeCount?: number;
  revenueAmount?: number;
  ebitdaAmount?: number;
  keyPartnerships?: string;
  competitors?: string;
  likelyAcquirers?: string;
  acquisitionSignal?: string;
  citations?: {
    overview?: string[];
    competitors?: any[];
    acquirers?: any[];
  };
  internalNotes?: string;
  discussionTopics?: DiscussionTopic[];
}

export const generateFeedbackPDF = async (data: PDFData) => {
  try {
    // Generate PDF blob using @react-pdf/renderer
    const blob = await pdf(<ResearchReportPDF data={data} />).toBlob();

    // Create download link
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${data.companyName.replace(/[^a-zA-Z0-9]/g, '_')}_research_report.pdf`;
    link.click();

    // Cleanup
    URL.revokeObjectURL(url);
  } catch (error) {
    console.error('Error generating PDF:', error);
    throw error;
  }
};
