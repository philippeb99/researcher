import { StyleSheet } from '@react-pdf/renderer';

export const pdfStyles = StyleSheet.create({
  page: {
    padding: 20,
    fontFamily: 'Helvetica',
    fontSize: 11,
  },
  
  // Typography
  h1: {
    fontSize: 22,
    fontWeight: 'bold',
    marginTop: 5,
    marginBottom: 5,
  },
  h2: {
    fontSize: 14,
    fontWeight: 'bold',
    marginTop: 15,
    marginBottom: 5,
    borderBottomWidth: 0.5,
    borderBottomColor: '#000',
    paddingBottom: 2,
  },
  h3: {
    fontSize: 11,
    fontWeight: 'bold',
    marginBottom: 3,
  },
  text: {
    fontSize: 11,
    lineHeight: 1.4,
  },
  textBold: {
    fontSize: 11,
    fontWeight: 'bold',
  },
  
  // Links
  link: {
    fontSize: 11,
    color: '#0000FF',
    textDecoration: 'underline',
  },
  linkSmall: {
    fontSize: 9,
    color: '#0000FF',
    textDecoration: 'underline',
  },
  
  // Header layout (two columns)
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
    marginBottom: 10,
    borderBottomWidth: 0.3,
    borderBottomColor: '#000',
    paddingBottom: 5,
  },
  headerLeft: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  headerRight: {
    fontSize: 9,
    textAlign: 'right',
    justifyContent: 'flex-end',
  },
  headerRightText: {
    fontSize: 9,
    marginBottom: 2,
  },
  
  // Field layouts
  fieldRow: {
    flexDirection: 'row',
    marginBottom: 7,
    flexWrap: 'wrap',
  },
  fieldLabel: {
    fontWeight: 'bold',
    marginRight: 4,
  },
  
  // Table styles
  table: {
    width: '100%',
    marginTop: 5,
    marginBottom: 5,
  },
  tableRow: {
    flexDirection: 'row',
    borderBottomWidth: 0.5,
    borderBottomColor: '#E0E0E0',
    paddingVertical: 4,
    alignItems: 'center',
  },
  tableCell: {
    fontSize: 11,
  },
  tableCellBold: {
    fontSize: 11,
    fontWeight: 'bold',
  },
  
  // Sections
  section: {
    marginBottom: 10,
  },
  
  // Discussion points grid
  discussionGrid: {
    marginTop: 5,
  },
  discussionRow: {
    flexDirection: 'row',
    borderBottomWidth: 0.5,
    borderBottomColor: '#E0E0E0',
    paddingVertical: 6,
  },
  discussionTitle: {
    width: '30%',
    paddingRight: 10,
  },
  discussionContent: {
    width: '70%',
  },
  discussionLink: {
    fontSize: 9,
    color: '#0000FF',
    marginTop: 2,
  },
  
  // Sources
  sourceItem: {
    marginBottom: 5,
    paddingLeft: 5,
  },
  sourceSubItem: {
    marginBottom: 3,
    paddingLeft: 10,
  },
});
