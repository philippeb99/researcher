import { View, Text, Link } from '@react-pdf/renderer';
import { pdfStyles } from './PDFStyles';

interface PDFHeaderProps {
  companyName: string;
  location: string;
  websiteUrl: string;
  dateOfResearch: string;
  requestedBy?: string;
  lastUpdated: string;
}

export const PDFHeader: React.FC<PDFHeaderProps> = ({
  companyName,
  location,
  websiteUrl,
  dateOfResearch,
  requestedBy,
  lastUpdated,
}) => (
  <View style={pdfStyles.header} fixed>
    {/* Left Column */}
    <View style={pdfStyles.headerLeft}>
      <Text style={pdfStyles.h1}>{companyName}</Text>
      <Text style={pdfStyles.text}>
        {location}
      </Text>
      <Link src={websiteUrl} style={pdfStyles.link}>
        {websiteUrl}
      </Link>
    </View>
    
    {/* Right Column */}
    <View style={pdfStyles.headerRight}>
      <Text style={pdfStyles.headerRightText}>Date of Research: {dateOfResearch}</Text>
      {requestedBy && (
        <Text style={pdfStyles.headerRightText}>Requested by: {requestedBy}</Text>
      )}
      <Text style={pdfStyles.headerRightText}>Last Updated: {lastUpdated}</Text>
    </View>
  </View>
);
