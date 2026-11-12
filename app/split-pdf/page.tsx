import type { Metadata } from "next";
import PdfWorkspace from "../../components/PdfWorkspace";
export const metadata: Metadata = { title: "Split PDF & Extract Pages Online | PDFStudio", description: "Extract specific pages or ranges from any PDF file in your browser." };
export default function Page() { return <PdfWorkspace initialTool="split" />; }
