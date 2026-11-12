import type { Metadata } from "next";
import PdfWorkspace from "../../components/PdfWorkspace";
export const metadata: Metadata = { title: "Merge PDF Online Free | PDFStudio", description: "Combine multiple PDF files into one document in your browser." };
export default function Page() { return <PdfWorkspace initialTool="merge" />; }
