import { View, Text, Link } from '@react-pdf/renderer';
import { pdfStyles } from './PDFStyles';
import { PDFTable } from './PDFTable';

// Section Header with automatic orphan prevention
export const SectionHeader: React.FC<{ title: string }> = ({ title }) => (
  <Text style={pdfStyles.h2} break={false}>
    {title}
  </Text>
);

// Company Details Section (CEO, LinkedIn, Contact Status)
export const CompanyDetailsSection: React.FC<{
  ceoName: string;
  ceoLinkedIn?: string;
  contactStatus?: string;
  lastContactDate?: string;
}> = ({ ceoName, ceoLinkedIn, contactStatus, lastContactDate }) => (
  <View style={pdfStyles.section}>
    <View style={pdfStyles.fieldRow}>
      <Text style={pdfStyles.fieldLabel}>CEO Name: </Text>
      <Text>{ceoName}</Text>
      {ceoLinkedIn && (
        <>
          <Text style={[pdfStyles.fieldLabel, { marginLeft: 15 }]}>LinkedIn: </Text>
          <Link src={ceoLinkedIn} style={pdfStyles.link}>
            {ceoLinkedIn}
          </Link>
        </>
      )}
    </View>
    {(contactStatus || lastContactDate) && (
      <View style={pdfStyles.fieldRow}>
        <Text style={pdfStyles.fieldLabel}>Contact Status: </Text>
        <Text>
          {contactStatus || 'Unknown'}
          {lastContactDate &&
            ` - ${new Date(lastContactDate).toLocaleDateString('en-US', {
              year: 'numeric',
              month: '2-digit',
              day: '2-digit',
            })}`}
        </Text>
      </View>
    )}
  </View>
);

// Key Executives Section with single-line table format
export const KeyExecutivesSection: React.FC<{ executives: any[] }> = ({ executives }) => {
  const columns = [
    { key: 'name', label: 'Name', width: '28%', bold: true },
    { key: 'position', label: 'Position', width: '30%' },
    { key: 'linkedin_url', label: 'LinkedIn', width: '32%', isLink: true },
    { key: 'confidence_level', label: 'Confidence', width: '10%' },
  ];

  return (
    <View style={pdfStyles.section} wrap={false}>
      <SectionHeader title="Key Executives" />
      {executives && executives.length > 0 ? (
        <PDFTable columns={columns} data={executives} />
      ) : (
        <Text style={pdfStyles.text}>No executive information available.</Text>
      )}
    </View>
  );
};

// Text Content Section (reusable for all text-based sections)
export const TextContentSection: React.FC<{
  title: string;
  content?: string;
  emptyMessage?: string;
}> = ({ title, content, emptyMessage = 'No information available.' }) => (
  <View style={pdfStyles.section} wrap={false}>
    <SectionHeader title={title} />
    <Text style={pdfStyles.text}>{content && content.trim() ? content : emptyMessage}</Text>
  </View>
);

// Financial Section with structured data
export const FinancialSection: React.FC<{
  employeeCount?: number;
  revenueAmount?: number;
  ebitdaAmount?: number;
  financialInformation?: string;
}> = ({ employeeCount, revenueAmount, ebitdaAmount, financialInformation }) => {
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  };

  const formatNumber = (num: number) => {
    return new Intl.NumberFormat('en-US').format(num);
  };

  const hasFinancialData =
    employeeCount !== undefined ||
    revenueAmount !== undefined ||
    ebitdaAmount !== undefined ||
    (financialInformation && financialInformation.trim());

  return (
    <View style={pdfStyles.section} wrap={false}>
      <SectionHeader title="Financial Information" />
      {hasFinancialData ? (
        <View>
          {employeeCount !== undefined && employeeCount !== null && (
            <View style={pdfStyles.fieldRow}>
              <Text style={pdfStyles.fieldLabel}>Employee Count: </Text>
              <Text>{formatNumber(employeeCount)}</Text>
            </View>
          )}
          {revenueAmount !== undefined && revenueAmount !== null && (
            <View style={pdfStyles.fieldRow}>
              <Text style={pdfStyles.fieldLabel}>Revenue: </Text>
              <Text>{formatCurrency(revenueAmount)}</Text>
            </View>
          )}
          {ebitdaAmount !== undefined && ebitdaAmount !== null && (
            <View style={pdfStyles.fieldRow}>
              <Text style={pdfStyles.fieldLabel}>EBITDA: </Text>
              <Text>{formatCurrency(ebitdaAmount)}</Text>
            </View>
          )}
          {financialInformation && financialInformation.trim() && (
            <Text style={[pdfStyles.text, { marginTop: 5 }]}>{financialInformation}</Text>
          )}
        </View>
      ) : (
        <Text style={pdfStyles.text}>No financial information available.</Text>
      )}
    </View>
  );
};

// Top 5 Insights Section with parsing logic
export const Top5Section: React.FC<{ top5Data?: string | object }> = ({ top5Data }) => {
  let insights: string[] = [];

  if (top5Data) {
    try {
      let parsedData: any;
      if (typeof top5Data === 'string') {
        try {
          parsedData = JSON.parse(top5Data);
        } catch {
          insights = [top5Data];
        }
      } else {
        parsedData = top5Data;
      }

      if (parsedData) {
        if (Array.isArray(parsedData)) {
          parsedData.forEach((item: any) => {
            if (!item) return;
            if (typeof item === 'string' && item.trim()) {
              insights.push(item.trim());
            } else if (typeof item === 'object') {
              Object.values(item).forEach((val: any) => {
                if (val && typeof val === 'string' && val.trim()) {
                  insights.push(val.trim());
                }
              });
            }
          });
        } else if (typeof parsedData === 'object') {
          Object.values(parsedData).forEach((value: any) => {
            if (value && typeof value === 'string' && value.trim()) {
              insights.push(value.trim());
            }
          });
        }
      }
    } catch (error) {
      console.error('Error processing top5 data:', error);
    }
  }

  return (
    <View style={pdfStyles.section} wrap={false}>
      <SectionHeader title="Top 5 Key Business Insights" />
      {insights.length > 0 ? (
        <View>
          {insights.map((insight, index) => (
            <Text key={index} style={[pdfStyles.text, { marginBottom: 5 }]}>
              {index + 1}. {insight}
            </Text>
          ))}
        </View>
      ) : (
        <Text style={pdfStyles.text}>No key insights available.</Text>
      )}
    </View>
  );
};

// Sources Section
export const SourcesSection: React.FC<{
  citations?: {
    overview?: string[];
    competitors?: any[];
    acquirers?: any[];
  };
}> = ({ citations }) => {
  const hasCitations =
    (citations?.overview && citations.overview.length > 0) ||
    (citations?.competitors && citations.competitors.length > 0) ||
    (citations?.acquirers && citations.acquirers.length > 0);

  return (
    <View style={pdfStyles.section} wrap={false}>
      <SectionHeader title="Sources Reference" />
      {hasCitations ? (
        <View>
          {citations?.overview && citations.overview.length > 0 && (
            <View style={{ marginBottom: 8 }}>
              <Text style={pdfStyles.h3}>Company Overview Sources:</Text>
              {citations.overview.map((url, index) => (
                <View key={index} style={pdfStyles.sourceItem}>
                  <Link src={url} style={pdfStyles.linkSmall}>
                    {index + 1}. {url}
                  </Link>
                </View>
              ))}
            </View>
          )}
          {citations?.competitors && citations.competitors.length > 0 && (
            <View style={{ marginBottom: 8 }}>
              <Text style={pdfStyles.h3}>Competitors Sources:</Text>
              {citations.competitors.map((item: any, index: number) => (
                <View key={index} style={pdfStyles.sourceItem}>
                  {item.name && (
                    <Text style={pdfStyles.textBold}>{item.name}:</Text>
                  )}
                  {item.sources &&
                    Array.isArray(item.sources) &&
                    item.sources.map((url: string, srcIndex: number) => (
                      <View key={srcIndex} style={pdfStyles.sourceSubItem}>
                        <Link src={url} style={pdfStyles.linkSmall}>
                          {srcIndex + 1}. {url}
                        </Link>
                      </View>
                    ))}
                </View>
              ))}
            </View>
          )}
          {citations?.acquirers && citations.acquirers.length > 0 && (
            <View>
              <Text style={pdfStyles.h3}>Potential Acquirers Sources:</Text>
              {citations.acquirers.map((item: any, index: number) => (
                <View key={index} style={pdfStyles.sourceItem}>
                  {item.name && (
                    <Text style={pdfStyles.textBold}>{item.name}:</Text>
                  )}
                  {item.sources &&
                    Array.isArray(item.sources) &&
                    item.sources.map((url: string, srcIndex: number) => (
                      <View key={srcIndex} style={pdfStyles.sourceSubItem}>
                        <Link src={url} style={pdfStyles.linkSmall}>
                          {srcIndex + 1}. {url}
                        </Link>
                      </View>
                    ))}
                </View>
              ))}
            </View>
          )}
        </View>
      ) : (
        <Text style={pdfStyles.text}>No source references available.</Text>
      )}
    </View>
  );
};

// Discussion Points Section with two-column layout
export const DiscussionPointsSection: React.FC<{ topics: any[] }> = ({ topics }) => (
  <View style={pdfStyles.section}>
    <SectionHeader title="Discussion Points" />
    {topics && topics.length > 0 ? (
      <View style={pdfStyles.discussionGrid}>
        {topics.map((topic, index) => (
          <View key={index} style={pdfStyles.discussionRow} wrap={false}>
            <View style={pdfStyles.discussionTitle}>
              <Text style={pdfStyles.h3}>
                {index + 1}. {topic.title}
              </Text>
            </View>
            <View style={pdfStyles.discussionContent}>
              <Text style={pdfStyles.text}>{topic.description}</Text>
              {topic.source_references &&
                Array.isArray(topic.source_references) &&
                topic.source_references.map((url: string, i: number) => (
                  <Link key={i} src={url} style={pdfStyles.discussionLink}>
                    {url}
                  </Link>
                ))}
            </View>
          </View>
        ))}
      </View>
    ) : (
      <Text style={pdfStyles.text}>No discussion points available.</Text>
    )}
  </View>
);

// Acquisition Signal as subsection
export const AcquisitionSignalSection: React.FC<{ acquisitionSignal?: string }> = ({
  acquisitionSignal,
}) => {
  if (!acquisitionSignal || !acquisitionSignal.trim()) return null;

  return (
    <View style={{ marginTop: 10 }}>
      <Text style={pdfStyles.h3}>Acquisition Signal:</Text>
      <Text style={pdfStyles.text}>{acquisitionSignal}</Text>
    </View>
  );
};
