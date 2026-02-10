import React from "react";
import { Document, Page, Text, Image, View } from "@react-pdf/renderer";
import { pdfStyles as styles } from "./PDFStyles";

export const PDFTemplate = ({ rawDoc }) => {
  return (
    <Document>
      {/* 1. FRONT COVER PAGE */}
      <Page size="A4" style={styles.frontPage}>
        <Image src="/logo.png" style={styles.logoLarge} />
        
        <View style={styles.pageFooter} fixed>
          <Text style={styles.footerText}>Downloaded from tutorlix.com</Text>
          <Text 
            style={styles.pageNumber} 
            render={({ pageNumber, totalPages }) => (
              `Page ${pageNumber} of ${totalPages}`
            )} 
          />
        </View>
      </Page>

      {/* 2. CONTENT PAGES LOOP */}
      {React.Children.map(rawDoc.props.children, (page, i) => (
        <Page key={`content-page-${i}`} size="A4" style={styles.contentPage}>
          
          {/* WATERMARK Layer */}
          <View style={styles.watermarkContainer} fixed>
            <Image src="/logo.png" style={styles.logoWatermark} />
          </View>

          {/* MAIN CONTENT AREA 
              Fix: We wrap content in a View to avoid key collisions on the Page level
          */}
          <View style={styles.mainContentArea}>
            {React.Children.map(page.props.children, (child, j) => (
               <React.Fragment key={`block-${i}-${j}`}>
                 {child}
               </React.Fragment>
            ))}
          </View>

          {/* SHARED FOOTER */}
          <View style={styles.pageFooter} fixed>
            <Text style={styles.footerText}>Downloaded from tutorlix.com</Text>
            <Text 
              style={styles.pageNumber} 
              render={({ pageNumber, totalPages }) => (
                `Page ${pageNumber} of ${totalPages}`
              )} 
            />
          </View>
          
        </Page>
      ))}
    </Document>
  );
};