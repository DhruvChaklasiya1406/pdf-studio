import type { Metadata } from "next";
import PdfWorkspace from "../../components/PdfWorkspace";
export const metadata: Metadata = { title: "PDF to JPG & PNG Converter | PDFStudio", description: "Turn PDF pages into high-resolution JPG or PNG images in your browser." };
export default function Page() { return <PdfWorkspace initialTool="pdf-to-img" />; }
