import { Document, Page } from '@react-pdf/renderer';
import { pdfStyles } from './PDFStyles';
import { PDFHeader } from './PDFHeader';
import {
  CompanyDetailsSection,
  KeyExecutivesSection,
  TextContentSection,
  FinancialSection,
  Top5Section,
  SourcesSection,
  DiscussionPointsSection,
  AcquisitionSignalSection,
} from './PDFSections';

interface Executive {
  name: string;
  position: string;
  linkedin_url?: string;
  confidence_level?: string;
  location?: string;
}

interface DiscussionTopic {
  title: string;
  description: string;
  source_references?: string[];
}

interface PDFData {
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

interface ResearchReportPDFProps {
  data: PDFData;
}

export const ResearchReportPDF: React.FC<ResearchReportPDFProps> = ({ data }) => {
  const dateOfResearch = data.processedAt
    ? new Date(data.processedAt).toLocaleDateString('en-US', {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
      })
    : new Date(data.createdAt).toLocaleDateString('en-US', {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
      });

  const lastUpdated = data.processedAt
    ? new Date(data.processedAt).toLocaleDateString('en-US', {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
      })
    : new Date(data.createdAt).toLocaleDateString('en-US', {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
      });

  return (
    <Document>
      <Page size="A4" style={pdfStyles.page}>
        {/* Header - repeated on every page */}
        <PDFHeader
          companyName={data.companyName}
          location={data.location}
          websiteUrl={data.websiteUrl}
          dateOfResearch={dateOfResearch}
          requestedBy={data.requestedBy}
          lastUpdated={lastUpdated}
        />

        {/* Company Details (no section title) */}
        <CompanyDetailsSection
          ceoName={data.ceoName}
          ceoLinkedIn={data.ceoLinkedIn}
          contactStatus={data.contactStatus}
          lastContactDate={data.lastContactDate}
        />

        {/* All content sections in specified order */}
        <TextContentSection title="Company Overview" content={data.companyOverview} />

        <KeyExecutivesSection executives={data.executives || []} />

        <Top5Section top5Data={data.top5} />

        <TextContentSection
          title="Industry & Business Model"
          content={data.industryBusinessModel}
        />

        <TextContentSection title="Market Position" content={data.marketPosition} />

        <TextContentSection
          title="Key Products & Customers"
          content={data.keyProductsCustomers}
        />

        <TextContentSection title="Recent Developments" content={data.recentDevelopments} />

        <FinancialSection
          employeeCount={data.employeeCount}
          revenueAmount={data.revenueAmount}
          ebitdaAmount={data.ebitdaAmount}
          financialInformation={data.financialInformation}
        />

        <TextContentSection title="Key Partnerships" content={data.keyPartnerships} />

        <TextContentSection title="Competitors" content={data.competitors} />

        <TextContentSection
          title="Potential Acquirers Insight"
          content={data.likelyAcquirers}
        />

        <AcquisitionSignalSection acquisitionSignal={data.acquisitionSignal} />

        <SourcesSection citations={data.citations} />

        <TextContentSection title="Internal Notes" content={data.internalNotes} />

        {data.discussionTopics && data.discussionTopics.length > 0 && (
          <DiscussionPointsSection topics={data.discussionTopics} />
        )}
      </Page>
    </Document>
  );
};
