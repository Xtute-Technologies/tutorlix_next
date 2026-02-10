import { StyleSheet } from "@react-pdf/renderer";

export const pdfStyles = StyleSheet.create({
  frontPage: {
    flexDirection: "column",
    justifyContent: "center",
    alignItems: "center",
    height: "100%",
    backgroundColor: "#ffffff",
    position: "relative",
  },
  logoLarge: {
    height: 100,
    width: "auto",
    marginBottom: 20
  },
  contentPage: {
    paddingTop: 50,
    paddingBottom: 80,
    paddingHorizontal: 45,
    position: "relative",
    backgroundColor: "#ffffff",
  },
  mainContentArea: {
    flex: 1,
  },
  watermarkContainer: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    zIndex: -1,
  },
  logoWatermark: {
    width: "140%",
    height: "auto",
    opacity: 0.05,
    transform: "rotate(-45deg)",
  },
  codeBlock: {
    backgroundColor: "rgba(30, 41, 59, 0.85)",
    color: "#f8fafc",
    padding: 12,
    borderRadius: 8,
    fontFamily: "Courier",
    fontSize: 9,
    marginVertical: 10,
    lineHeight: 1.5,
  },
  pageFooter: {
    position: "absolute",
    bottom: 30,
    left: 45,
    right: 45,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    borderTopWidth: 0.5,
    borderTopColor: "#e2e8f0",
    paddingTop: 10,
  },
  footerText: {
    fontSize: 8,
    color: "#000000",
    textTransform: "uppercase",
    letterSpacing: 1,
  },
  pageNumber: {
    fontSize: 9,
    color: "#000000",
    fontWeight: 'bold',
  },



  // Video Block Styles
  videoBox: {
    padding: 12,
    marginVertical: 10,
    borderWidth: 1,
    borderColor: "#e2e8f0",
    borderRadius: 8,
    backgroundColor: "#f8fafc",
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
  },
  videoTitle: {
    color: "#ef4444",
    fontSize: 11,
    fontWeight: "bold",
    marginBottom: 4,
  },
  videoSubtitle: {
    fontSize: 9,
    color: "#64748b",
    marginBottom: 4,
  },
  videoLink: {
    fontSize: 9,
    color: "#3b82f6",
    textDecoration: "underline",
  },
});