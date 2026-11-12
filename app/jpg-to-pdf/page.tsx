import type { Metadata } from "next";
import PdfWorkspace from "../../components/PdfWorkspace";
export const metadata: Metadata = { title: "JPG & PNG to PDF Converter | PDFStudio", description: "Convert JPG and PNG images into a clean PDF directly in your browser." };
export default function Page() { return <PdfWorkspace initialTool="images" />; }
