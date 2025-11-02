import { View, Text, Link } from '@react-pdf/renderer';
import { pdfStyles } from './PDFStyles';

interface TableColumn {
  key: string;
  label: string;
  width?: string;
  bold?: boolean;
  isLink?: boolean;
}

interface PDFTableProps {
  columns: TableColumn[];
  data: any[];
}

export const PDFTable: React.FC<PDFTableProps> = ({ columns, data }) => (
  <View style={pdfStyles.table}>
    {data.map((row, index) => (
      <View key={index} style={pdfStyles.tableRow} wrap={false}>
        <Text style={[pdfStyles.tableCell, { width: '5%', fontSize: 11 }]}>{index + 1}.</Text>
        {columns.map((col) => {
          const value = row[col.key];
          const cellStyle = [
            col.bold ? pdfStyles.tableCellBold : pdfStyles.tableCell,
            col.width && { width: col.width },
          ];
          
          if (col.isLink && value) {
            return (
              <Link key={col.key} src={value} style={[...cellStyle, pdfStyles.link]}>
                {value}
              </Link>
            );
          }
          
          return <Text key={col.key} style={cellStyle}>{value || '-'}</Text>;
        })}
      </View>
    ))}
  </View>
);
