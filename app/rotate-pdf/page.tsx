import type { Metadata } from "next";
import PdfWorkspace from "../../components/PdfWorkspace";
export const metadata: Metadata = { title: "Rotate PDF Pages Online Free | PDFStudio", description: "Rotate PDF pages by 90, 180, or 270 degrees directly in your browser." };
export default function Page() { return <PdfWorkspace initialTool="rotate" />; }
