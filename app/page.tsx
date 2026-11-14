"use client";

import { useState, useRef } from "react";
import { PDFDocument, StandardFonts, degrees, rgb } from "pdf-lib";

type ToolId =
  | "merge"
  | "organize"
  | "split"
  | "rotate"
  | "watermark"
  | "numbers"
  | "sign"
  | "crop"
  | "images"
  | "flatten";

interface ToolConfig {
  id: ToolId;
  shortTitle: string;
  title: string;
  tagline: string;
  badge: string;
  accent: string;
  accept: string;
  multiple: boolean;
  actionLabel: string;
  defaultOut: string;
}

interface PageItem {
  originalIndex: number;
  pageNumber: number;
  rotation: 0 | 90 | 180 | 270;
  deleted: boolean;
}

const TOOLS: ToolConfig[] = [
  {
    id: "merge",
    shortTitle: "Merge PDF",
    title: "Merge PDF Files",
    tagline: "Combine multiple PDFs into one single ordered document.",
    badge: "Popular",
    accent: "bg-rose-600",
    accept: "application/pdf,.pdf",
    multiple: true,
    actionLabel: "Merge & Download PDF",
    defaultOut: "merged-document",
  },
  {
    id: "organize",
    shortTitle: "Organize Pages",
    title: "Organize, Reorder & Delete Pages",
    tagline: "Move pages left or right, rotate single pages, or remove unwanted pages.",
    badge: "Visual",
    accent: "bg-purple-600",
    accept: "application/pdf,.pdf",
    multiple: false,
    actionLabel: "Save Organized PDF",
    defaultOut: "organized-document",
  },
  {
    id: "split",
    shortTitle: "Split & Extract",
    title: "Split & Extract PDF Pages",
    tagline: "Extract specific page numbers or custom ranges into a new PDF.",
    badge: "Precision",
    accent: "bg-indigo-600",
    accept: "application/pdf,.pdf",
    multiple: false,
    actionLabel: "Extract & Download PDF",
    defaultOut: "extracted-pages",
  },
  {
    id: "rotate",
    shortTitle: "Rotate PDF",
    title: "Rotate PDF Pages Permanently",
    tagline: "Rotate upside-down or sideways scans by 90, 180, or 270 degrees.",
    badge: "Quick Fix",
    accent: "bg-emerald-600",
    accept: "application/pdf,.pdf",
    multiple: false,
    actionLabel: "Rotate & Download PDF",
    defaultOut: "rotated-document",
  },
  {
    id: "watermark",
    shortTitle: "Watermark",
    title: "Add Text Watermark to PDF",
    tagline: "Stamp custom diagonal or tiled text across every page with opacity control.",
    badge: "Security",
    accent: "bg-cyan-600",
    accept: "application/pdf,.pdf",
    multiple: false,
    actionLabel: "Stamp Watermark & Download",
    defaultOut: "watermarked-document",
  },
  {
    id: "numbers",
    shortTitle: "Page Numbers",
    title: "Add Page Numbers to PDF",
    tagline: "Insert clean header or footer page numbers across your document.",
    badge: "Format",
    accent: "bg-teal-600",
    accept: "application/pdf,.pdf",
    multiple: false,
    actionLabel: "Add Page Numbers & Download",
    defaultOut: "numbered-document",
  },
  {
    id: "sign",
    shortTitle: "Sign PDF",
    title: "Draw & Stamp Signature on PDF",
    tagline: "Draw your signature directly on screen and stamp it onto your PDF.",
    badge: "eSign",
    accent: "bg-blue-600",
    accept: "application/pdf,.pdf",
    multiple: false,
    actionLabel: "Sign & Download PDF",
    defaultOut: "signed-document",
  },
  {
    id: "crop",
    shortTitle: "Crop Margins",
    title: "Crop PDF Page Margins",
    tagline: "Trim white margins from the top, bottom, left, and right of every page.",
    badge: "Layout",
    accent: "bg-orange-600",
    accept: "application/pdf,.pdf",
    multiple: false,
    actionLabel: "Crop & Download PDF",
    defaultOut: "cropped-document",
  },
  {
    id: "images",
    shortTitle: "JPG to PDF",
    title: "Convert JPG & PNG to PDF",
    tagline: "Turn photos, receipts, and screenshots into a single PDF file.",
    badge: "Convert",
    accent: "bg-amber-500",
    accept: "image/jpeg,image/png,.jpg,.jpeg,.png",
    multiple: true,
    actionLabel: "Convert Images to PDF",
    defaultOut: "images-converted",
  },
  {
    id: "flatten",
    shortTitle: "Lock Forms",
    title: "Flatten PDF Forms & Metadata",
    tagline: "Lock interactive form fields so they cannot be edited and clean metadata.",
    badge: "Protect",
    accent: "bg-slate-800",
    accept: "application/pdf,.pdf",
    multiple: false,
    actionLabel: "Flatten & Download PDF",
    defaultOut: "flattened-document",
  },
];

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
}

export default function PdfStudioApp() {
  const [activeToolId, setActiveToolId] = useState<ToolId>("merge");
  const [files, setFiles] = useState<File[]>([]);
  const [pageCount, setPageCount] = useState<number | null>(null);
  const [outputName, setOutputName] = useState("merged-document");

  const [pageRange, setPageRange] = useState("1");
  const [rotationAngle, setRotationAngle] = useState<90 | 180 | 270>(90);
  const [organizePages, setOrganizePages] = useState<PageItem[]>([]);

  const [watermarkText, setWatermarkText] = useState("CONFIDENTIAL");
  const [watermarkStyle, setWatermarkStyle] = useState<"diagonal" | "tiled">("diagonal");
  const [watermarkColor, setWatermarkColor] = useState<"gray" | "red" | "blue">("gray");
  const [watermarkOpacity, setWatermarkOpacity] = useState(0.25);
  const [watermarkSize, setWatermarkSize] = useState(52);

  const [numberPos, setNumberPos] = useState<
    "bottom-center" | "bottom-right" | "bottom-left" | "top-right"
  >("bottom-center");
  const [numberFormat, setNumberFormat] = useState<"page-of" | "slash" | "plain">("page-of");
  const [startNumber, setStartNumber] = useState(1);

  const [cropMargin, setCropMargin] = useState(36);

  const sigCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [hasSignature, setHasSignature] = useState(false);
  const [signTarget, setSignTarget] = useState<"last" | "first" | "all">("last");
  const [signPos, setSignPos] = useState<"bottom-right" | "bottom-left">("bottom-right");

  const [isDragging, setIsDragging] = useState(false);
  const [processing, setProcessing] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");
  const [successMsg, setSuccessMsg] = useState("");
  const [infoModal, setInfoModal] = useState<"privacy" | "terms" | "contact" | null>(null);

  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const activeTool = TOOLS.find((t) => t.id === activeToolId) || TOOLS[0];

  const switchTool = (id: ToolId) => {
    const nextTool = TOOLS.find((t) => t.id === id) || TOOLS[0];
    setActiveToolId(id);
    setFiles([]);
    setPageCount(null);
    setOrganizePages([]);
    setOutputName(nextTool.defaultOut);
    setErrorMsg("");
    setSuccessMsg("");
  };

  const inspectPdf = async (file: File) => {
    try {
      const buffer = await file.arrayBuffer();
      const pdf = await PDFDocument.load(buffer, { ignoreEncryption: true });
      const total = pdf.getPageCount();
      setPageCount(total);
      setPageRange(total > 1 ? `1-${Math.min(2, total)}` : "1");
      const items: PageItem[] = [];
      for (let i = 0; i < total; i++) {
        items.push({
          originalIndex: i,
          pageNumber: i + 1,
          rotation: 0,
          deleted: false,
        });
      }
      setOrganizePages(items);
    } catch {
      setPageCount(null);
      setErrorMsg("Could not read PDF pages. Check that the file is not password-locked.");
    }
  };

  const handleIncomingFiles = async (incomingList: FileList | null) => {
    if (!incomingList || incomingList.length === 0) return;
    setErrorMsg("");
    setSuccessMsg("");

    const incoming = Array.from(incomingList);

    if (activeTool.id === "images") {
      const validImages = incoming.filter((f) =>
        ["image/jpeg", "image/jpg", "image/png"].includes(f.type)
      );
      if (validImages.length === 0) {
        setErrorMsg("Please select JPG or PNG images.");
        return;
      }
      setFiles((prev) => [...prev, ...validImages]);
      return;
    }

    const validPdfs = incoming.filter(
      (f) => f.type === "application/pdf" || f.name.toLowerCase().endsWith(".pdf")
    );
    if (validPdfs.length === 0) {
      setErrorMsg("Please select a valid PDF (.pdf) file.");
      return;
    }

    if (activeTool.multiple) {
      setFiles((prev) => [...prev, ...validPdfs]);
    } else {
      const single = validPdfs[0];
      setFiles([single]);
      const base = single.name.replace(/\.pdf$/i, "");
      setOutputName(`${activeTool.id}-${base}`);
      await inspectPdf(single);
    }
  };

  const moveFile = (index: number, direction: -1 | 1) => {
    const target = index + direction;
    if (target < 0 || target >= files.length) return;
    const copy = [...files];
    const [item] = copy.splice(index, 1);
    copy.splice(target, 0, item);
    setFiles(copy);
  };

  const movePageItem = (index: number, direction: -1 | 1) => {
    const target = index + direction;
    if (target < 0 || target >= organizePages.length) return;
    const copy = [...organizePages];
    const [item] = copy.splice(index, 1);
    copy.splice(target, 0, item);
    setOrganizePages(copy);
  };

  const rotatePageItem = (index: number) => {
    setOrganizePages((prev) =>
      prev.map((p, i) =>
        i === index ? { ...p, rotation: ((p.rotation + 90) % 360) as 0 | 90 | 180 | 270 } : p
      )
    );
  };

  const toggleDeletePageItem = (index: number) => {
    setOrganizePages((prev) =>
      prev.map((p, i) => (i === index ? { ...p, deleted: !p.deleted } : p))
    );
  };

  const startDrawing = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = sigCanvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    const rect = canvas.getBoundingClientRect();
    ctx.strokeStyle = "#0f172a";
    ctx.lineWidth = 2.5;
    ctx.lineCap = "round";
    ctx.beginPath();
    ctx.moveTo(e.clientX - rect.left, e.clientY - rect.top);
    setIsDrawing(true);
    setHasSignature(true);
  };

  const drawMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!isDrawing) return;
    const canvas = sigCanvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    const rect = canvas.getBoundingClientRect();
    ctx.lineTo(e.clientX - rect.left, e.clientY - rect.top);
    ctx.stroke();
  };

  const stopDrawing = () => {
    setIsDrawing(false);
  };

  const clearSignature = () => {
    const canvas = sigCanvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    setHasSignature(false);
  };

  const parsePageSelection = (input: string, maxPages: number): number[] => {
    const indices = new Set<number>();
    const parts = input.split(",").map((p) => p.trim()).filter(Boolean);

    for (const part of parts) {
      if (part.includes("-")) {
        const [startStr, endStr] = part.split("-");
        const start = parseInt(startStr, 10);
        const end = parseInt(endStr, 10);
        if (isNaN(start) || isNaN(end) || start < 1 || end > maxPages || start > end) {
          throw new Error(`Invalid range "${part}". Enter pages between 1 and ${maxPages}.`);
        }
        for (let p = start; p <= end; p++) indices.add(p - 1);
      } else {
        const num = parseInt(part, 10);
        if (isNaN(num) || num < 1 || num > maxPages) {
          throw new Error(`Invalid page "${part}". Enter pages between 1 and ${maxPages}.`);
        }
        indices.add(num - 1);
      }
    }

    const out = Array.from(indices);
    if (out.length === 0) throw new Error("Enter at least one page number.");
    return out;
  };

  const downloadPdfBytes = (bytes: Uint8Array, rawName: string) => {
    const clean =
      rawName.trim().replace(/\.pdf$/i, "").replace(/[^a-zA-Z0-9-_ ]/g, "") ||
      activeTool.defaultOut;
    const blob = new Blob([bytes as unknown as BlobPart], { type: "application/pdf" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${clean}.pdf`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    return `${clean}.pdf`;
  };

  const handleProcess = async () => {
    if (files.length === 0) return;
    setProcessing(true);
    setErrorMsg("");
    setSuccessMsg("");

    try {
      if (activeTool.id === "merge") {
        if (files.length < 2) throw new Error("Select at least 2 PDF files to merge.");
        const merged = await PDFDocument.create();
        for (const file of files) {
          const buf = await file.arrayBuffer();
          const src = await PDFDocument.load(buf, { ignoreEncryption: true });
          const copied = await merged.copyPages(src, src.getPageIndices());
          copied.forEach((p) => merged.addPage(p));
        }
        const saved = await merged.save();
        const finalName = downloadPdfBytes(saved, outputName);
        setSuccessMsg(`Merged ${files.length} PDFs into ${finalName}!`);
      } else if (activeTool.id === "organize") {
        const kept = organizePages.filter((p) => !p.deleted);
        if (kept.length === 0) throw new Error("Keep at least 1 page before saving.");
        const buf = await files[0].arrayBuffer();
        const src = await PDFDocument.load(buf, { ignoreEncryption: true });
        const out = await PDFDocument.create();
        for (const item of kept) {
          const [copied] = await out.copyPages(src, [item.originalIndex]);
          if (item.rotation !== 0) {
            const cur = copied.getRotation().angle;
            copied.setRotation(degrees((cur + item.rotation) % 360));
          }
          out.addPage(copied);
        }
        const saved = await out.save();
        const finalName = downloadPdfBytes(saved, outputName);
        setSuccessMsg(`Saved ${kept.length} organized page(s) to ${finalName}!`);
      } else if (activeTool.id === "split") {
        const buf = await files[0].arrayBuffer();
        const src = await PDFDocument.load(buf, { ignoreEncryption: true });
        const selected = parsePageSelection(pageRange, src.getPageCount());
        const out = await PDFDocument.create();
        const copied = await out.copyPages(src, selected);
        copied.forEach((p) => out.addPage(p));
        const saved = await out.save();
        const finalName = downloadPdfBytes(saved, outputName);
        setSuccessMsg(`Extracted ${selected.length} page(s) into ${finalName}!`);
      } else if (activeTool.id === "rotate") {
        const buf = await files[0].arrayBuffer();
        const pdf = await PDFDocument.load(buf, { ignoreEncryption: true });
        const pages = pdf.getPages();
        pages.forEach((p) => {
          const cur = p.getRotation().angle;
          p.setRotation(degrees((cur + rotationAngle) % 360));
        });
        const saved = await pdf.save();
        const finalName = downloadPdfBytes(saved, outputName);
        setSuccessMsg(`Rotated ${pages.length} page(s) by ${rotationAngle}° into ${finalName}!`);
      } else if (activeTool.id === "watermark") {
        const text = watermarkText.trim();
        if (!text) throw new Error("Enter watermark text.");
        const buf = await files[0].arrayBuffer();
        const pdf = await PDFDocument.load(buf, { ignoreEncryption: true });
        const font = await pdf.embedFont(StandardFonts.HelveticaBold);
        const colorMap = {
          gray: rgb(0.35, 0.38, 0.42),
          red: rgb(0.82, 0.12, 0.18),
          blue: rgb(0.12, 0.32, 0.78),
        };
        const chosenColor = colorMap[watermarkColor];
        const pages = pdf.getPages();

        pages.forEach((page) => {
          const { width, height } = page.getSize();
          const tw = font.widthOfTextAtSize(text, watermarkSize);
          if (watermarkStyle === "diagonal") {
            page.drawText(text, {
              x: Math.max(36, (width - tw * 0.7) / 2),
              y: height / 2 - watermarkSize / 2,
              size: watermarkSize,
              font,
              color: chosenColor,
              opacity: watermarkOpacity,
              rotate: degrees(38),
            });
          } else {
            const tileSize = Math.max(20, Math.round(watermarkSize * 0.55));
            const stepX = Math.max(170, font.widthOfTextAtSize(text, tileSize) + 80);
            for (let y = 70; y < height; y += 150) {
              for (let x = 40; x < width; x += stepX) {
                page.drawText(text, {
                  x,
                  y,
                  size: tileSize,
                  font,
                  color: chosenColor,
                  opacity: watermarkOpacity,
                  rotate: degrees(32),
                });
              }
            }
          }
        });

        const saved = await pdf.save();
        const finalName = downloadPdfBytes(saved, outputName);
        setSuccessMsg(`Stamped watermark on ${pages.length} page(s) in ${finalName}!`);
      } else if (activeTool.id === "numbers") {
        const buf = await files[0].arrayBuffer();
        const pdf = await PDFDocument.load(buf, { ignoreEncryption: true });
        const font = await pdf.embedFont(StandardFonts.HelveticaBold);
        const pages = pdf.getPages();
        const total = pages.length;
        const size = 11;
        const margin = 28;

        pages.forEach((page, idx) => {
          const cur = (startNumber || 1) + idx;
          const maxNum = (startNumber || 1) + total - 1;
          const label =
            numberFormat === "page-of"
              ? `Page ${cur} of ${maxNum}`
              : numberFormat === "slash"
              ? `${cur} / ${maxNum}`
              : `${cur}`;
          const { width, height } = page.getSize();
          const tw = font.widthOfTextAtSize(label, size);
          let x = (width - tw) / 2;
          let y = margin;
          if (numberPos === "bottom-right") x = width - tw - margin;
          if (numberPos === "bottom-left") x = margin;
          if (numberPos === "top-right") {
            x = width - tw - margin;
            y = height - margin - size;
          }
          page.drawText(label, { x, y, size, font, color: rgb(0.2, 0.23, 0.28) });
        });

        const saved = await pdf.save();
        const finalName = downloadPdfBytes(saved, outputName);
        setSuccessMsg(`Added page numbers to ${total} page(s) in ${finalName}!`);
      } else if (activeTool.id === "sign") {
        if (!hasSignature || !sigCanvasRef.current) {
          throw new Error("Please draw your signature in the signature box first.");
        }
        const dataUrl = sigCanvasRef.current.toDataURL("image/png");
        const base64 = dataUrl.split(",")[1];
        const bin = atob(base64);
        const sigBytes = new Uint8Array(bin.length);
        for (let i = 0; i < bin.length; i++) sigBytes[i] = bin.charCodeAt(i);

        const buf = await files[0].arrayBuffer();
        const pdf = await PDFDocument.load(buf, { ignoreEncryption: true });
        const sigImg = await pdf.embedPng(sigBytes);
        const pages = pdf.getPages();

        const targetIndices =
          signTarget === "first"
            ? [0]
            : signTarget === "last"
            ? [pages.length - 1]
            : pages.map((_, i) => i);

        targetIndices.forEach((idx) => {
          const page = pages[idx];
          if (!page) return;
          const { width } = page.getSize();
          const sigW = 150;
          const sigH = 60;
          const x = signPos === "bottom-right" ? Math.max(36, width - sigW - 44) : 44;
          page.drawImage(sigImg, { x, y: 44, width: sigW, height: sigH });
        });

        const saved = await pdf.save();
        const finalName = downloadPdfBytes(saved, outputName);
        setSuccessMsg(`Stamped signature and downloaded ${finalName}!`);
      } else if (activeTool.id === "crop") {
        const buf = await files[0].arrayBuffer();
        const pdf = await PDFDocument.load(buf, { ignoreEncryption: true });
        const pages = pdf.getPages();
        pages.forEach((page) => {
          const { width, height } = page.getSize();
          const m = Math.min(cropMargin, Math.floor(Math.min(width, height) / 4));
          page.setCropBox(m, m, width - m * 2, height - m * 2);
        });
        const saved = await pdf.save();
        const finalName = downloadPdfBytes(saved, outputName);
        setSuccessMsg(`Cropped ${cropMargin}pt margins on ${pages.length} page(s) in ${finalName}!`);
      } else if (activeTool.id === "images") {
        const pdf = await PDFDocument.create();
        for (const imgFile of files) {
          const buf = await imgFile.arrayBuffer();
          const embedded =
            imgFile.type === "image/png" ? await pdf.embedPng(buf) : await pdf.embedJpg(buf);
          const page = pdf.addPage([embedded.width, embedded.height]);
          page.drawImage(embedded, {
            x: 0,
            y: 0,
            width: embedded.width,
            height: embedded.height,
          });
        }
        const saved = await pdf.save();
        const finalName = downloadPdfBytes(saved, outputName);
        setSuccessMsg(`Converted ${files.length} image(s) into ${finalName}!`);
      } else if (activeTool.id === "flatten") {
        const buf = await files[0].arrayBuffer();
        const pdf = await PDFDocument.load(buf, { ignoreEncryption: true });
        try {
          pdf.getForm().flatten();
        } catch {
          // Document has no interactive form fields
        }
        pdf.setTitle(outputName);
        pdf.setProducer("PDFStudio Local Browser Engine");
        const saved = await pdf.save();
        const finalName = downloadPdfBytes(saved, outputName);
        setSuccessMsg(`Flattened forms and saved ${finalName}!`);
      }
    } catch (err: unknown) {
      setErrorMsg(err instanceof Error ? err.message : "Failed to process PDF.");
    } finally {
      setProcessing(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 flex flex-col">
      <header className="bg-white border-b border-slate-200 sticky top-0 z-20">
        <div className="max-w-6xl mx-auto px-4 sm:px-8 h-16 flex items-center justify-between gap-4">
          <div className="flex items-center gap-2.5">
            <div className="h-9 w-9 rounded-xl bg-rose-600 text-white font-extrabold flex items-center justify-center shadow-sm">
              PDF
            </div>
            <span className="font-bold text-xl tracking-tight text-slate-900">
              PDF<span className="text-rose-600">Studio</span>
            </span>
          </div>

          <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 border border-emerald-200 px-3 py-1 text-xs font-semibold text-emerald-700">
            ● 10 Tools • 100% Private In-Browser Processing
          </span>
        </div>
      </header>

      <main className="flex-1 max-w-6xl w-full mx-auto px-4 sm:px-8 py-10 space-y-8">
        <section className="text-center max-w-2xl mx-auto">
          <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-slate-900">
            Every PDF tool you need,{" "}
            <span className="text-rose-600">instant & free.</span>
          </h1>
          <p className="mt-3 text-sm sm:text-base text-slate-600">
            Merge, organize, split, rotate, watermark, number, e-sign, crop, and convert
            PDFs directly in your browser. Zero server uploads and zero watermarks.
          </p>
        </section>

        <section className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
          {TOOLS.map((tool) => {
            const active = tool.id === activeToolId;
            return (
              <button
                key={tool.id}
                type="button"
                onClick={() => switchTool(tool.id)}
                className={`text-left p-4 rounded-2xl border transition-all ${
                  active
                    ? "bg-white border-rose-500 ring-2 ring-rose-500/20 shadow-md"
                    : "bg-white border-slate-200 hover:border-slate-300 hover:shadow-sm"
                }`}
              >
                <div className="flex items-center justify-between mb-2">
                  <span
                    className={`h-7 w-7 rounded-lg ${tool.accent} text-white text-[10px] font-bold flex items-center justify-center`}
                  >
                    {tool.shortTitle.slice(0, 3).toUpperCase()}
                  </span>
                  <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-slate-100 text-slate-600">
                    {tool.badge}
                  </span>
                </div>
                <h2 className="font-bold text-slate-900 text-sm">{tool.shortTitle}</h2>
                <p className="mt-1 text-[11px] text-slate-500 line-clamp-2">{tool.tagline}</p>
              </button>
            );
          })}
        </section>

        <section className="bg-white rounded-3xl border border-slate-200 shadow-sm p-6 sm:p-10">
          <div className="flex flex-wrap items-center justify-between gap-2 mb-6">
            <div>
              <h2 className="text-xl font-bold text-slate-900">{activeTool.title}</h2>
              <p className="text-xs sm:text-sm text-slate-500">{activeTool.tagline}</p>
            </div>
            {files.length > 0 && (
              <button
                type="button"
                onClick={() => {
                  setFiles([]);
                  setPageCount(null);
                  setOrganizePages([]);
                  setErrorMsg("");
                  setSuccessMsg("");
                }}
                className="text-xs font-semibold text-slate-500 hover:text-rose-600"
              >
                Clear all files
              </button>
            )}
          </div>

          <div
            onDragOver={(e) => {
              e.preventDefault();
              setIsDragging(true);
            }}
            onDragLeave={() => setIsDragging(false)}
            onDrop={(e) => {
              e.preventDefault();
              setIsDragging(false);
              handleIncomingFiles(e.dataTransfer.files);
            }}
            onClick={() => fileInputRef.current?.click()}
            className={`cursor-pointer rounded-2xl border-2 border-dashed p-10 text-center transition ${
              isDragging
                ? "border-rose-500 bg-rose-50/50"
                : "border-slate-300 bg-slate-50/70 hover:border-rose-400 hover:bg-slate-50"
            }`}
          >
            <input
              ref={fileInputRef}
              type="file"
              accept={activeTool.accept}
              multiple={activeTool.multiple}
              onChange={(e) => {
                handleIncomingFiles(e.target.files);
                e.target.value = "";
              }}
              className="hidden"
            />
            <div className="mx-auto h-12 w-12 rounded-2xl bg-rose-100 text-rose-600 flex items-center justify-center font-bold text-xl mb-3">
              +
            </div>
            <p className="text-sm sm:text-base font-semibold text-slate-800">
              Click to select {activeTool.id === "images" ? "JPG or PNG images" : "PDF file(s)"}{" "}
              or drag & drop here
            </p>
            <p className="mt-1 text-xs text-slate-400">
              Processed locally inside your browser • Instant download
            </p>
          </div>

          {files.length > 0 && (
            <div className="mt-6 space-y-3">
              <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                Selected Files ({files.length})
              </p>
              <div className="divide-y divide-slate-100 border border-slate-200 rounded-2xl overflow-hidden">
                {files.map((file, idx) => (
                  <div
                    key={`${file.name}-${idx}`}
                    className="flex items-center justify-between gap-3 px-4 py-3 bg-white text-sm"
                  >
                    <div className="min-w-0">
                      <p className="font-medium text-slate-800 truncate">
                        {idx + 1}. {file.name}
                      </p>
                      <p className="text-xs text-slate-400">
                        {formatBytes(file.size)}
                        {pageCount && !activeTool.multiple ? ` • ${pageCount} pages` : ""}
                      </p>
                    </div>
                    <div className="flex items-center gap-1.5 shrink-0">
                      {activeTool.multiple && files.length > 1 && (
                        <>
                          <button
                            type="button"
                            onClick={() => moveFile(idx, -1)}
                            disabled={idx === 0}
                            className="px-2 py-1 text-xs font-semibold rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-50 disabled:opacity-30"
                          >
                            ↑
                          </button>
                          <button
                            type="button"
                            onClick={() => moveFile(idx, 1)}
                            disabled={idx === files.length - 1}
                            className="px-2 py-1 text-xs font-semibold rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-50 disabled:opacity-30"
                          >
                            ↓
                          </button>
                        </>
                      )}
                      <button
                        type="button"
                        onClick={() => setFiles(files.filter((_, i) => i !== idx))}
                        className="px-2.5 py-1 text-xs font-semibold rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50"
                      >
                        Remove
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {files.length > 0 && activeTool.id === "organize" && organizePages.length > 0 && (
            <div className="mt-6 p-5 rounded-2xl bg-slate-50 border border-slate-200 space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold uppercase tracking-wide text-slate-700">
                  Page Order ({organizePages.filter((p) => !p.deleted).length} of{" "}
                  {organizePages.length} kept)
                </span>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-5 gap-3">
                {organizePages.map((p, idx) => (
                  <div
                    key={p.originalIndex}
                    className={`p-3 rounded-xl border text-center transition ${
                      p.deleted
                        ? "bg-rose-50 border-rose-200 opacity-50"
                        : "bg-white border-slate-200 shadow-xs"
                    }`}
                  >
                    <div className="h-20 rounded-lg bg-slate-100 flex flex-col items-center justify-center mb-2">
                      <span className="text-xs font-extrabold text-slate-800">
                        Page {p.pageNumber}
                      </span>
                      {p.rotation > 0 && (
                        <span className="text-[10px] font-semibold text-rose-600 mt-0.5">
                          Rotated {p.rotation}°
                        </span>
                      )}
                    </div>
                    <div className="flex items-center justify-center gap-1">
                      <button
                        type="button"
                        onClick={() => movePageItem(idx, -1)}
                        disabled={idx === 0}
                        className="px-1.5 py-1 text-xs border rounded bg-white disabled:opacity-30"
                      >
                        ←
                      </button>
                      <button
                        type="button"
                        onClick={() => movePageItem(idx, 1)}
                        disabled={idx === organizePages.length - 1}
                        className="px-1.5 py-1 text-xs border rounded bg-white disabled:opacity-30"
                      >
                        →
                      </button>
                      <button
                        type="button"
                        onClick={() => rotatePageItem(idx)}
                        className="px-1.5 py-1 text-xs border rounded bg-white"
                      >
                        ↻
                      </button>
                      <button
                        type="button"
                        onClick={() => toggleDeletePageItem(idx)}
                        className={`px-2 py-1 text-[10px] font-bold rounded ${
                          p.deleted ? "bg-emerald-600 text-white" : "bg-rose-100 text-rose-700"
                        }`}
                      >
                        {p.deleted ? "Keep" : "Del"}
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {files.length > 0 && activeTool.id === "split" && (
            <div className="mt-5 p-4 rounded-2xl bg-slate-50 border border-slate-200">
              <label className="block text-xs font-bold uppercase tracking-wide text-slate-700 mb-1.5">
                Pages to Extract {pageCount ? `(1 to ${pageCount})` : ""}
              </label>
              <input
                type="text"
                value={pageRange}
                onChange={(e) => setPageRange(e.target.value)}
                placeholder="e.g. 1, 3-5"
                className="w-full sm:w-72 px-3.5 py-2 border border-slate-300 rounded-xl text-sm bg-white"
              />
            </div>
          )}

          {files.length > 0 && activeTool.id === "rotate" && (
            <div className="mt-5 p-4 rounded-2xl bg-slate-50 border border-slate-200">
              <span className="block text-xs font-bold uppercase tracking-wide text-slate-700 mb-2">
                Rotation Angle (Clockwise)
              </span>
              <div className="flex gap-2">
                {([90, 180, 270] as const).map((angle) => (
                  <button
                    key={angle}
                    type="button"
                    onClick={() => setRotationAngle(angle)}
                    className={`px-4 py-2 rounded-xl text-xs font-semibold border ${
                      rotationAngle === angle
                        ? "bg-slate-900 text-white border-slate-900"
                        : "bg-white text-slate-700 border-slate-300"
                    }`}
                  >
                    Rotate {angle}°
                  </button>
                ))}
              </div>
            </div>
          )}

          {files.length > 0 && activeTool.id === "watermark" && (
            <div className="mt-5 p-5 rounded-2xl bg-slate-50 border border-slate-200 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <div>
                <label className="block text-xs font-bold uppercase text-slate-700 mb-1">
                  Watermark Text
                </label>
                <input
                  type="text"
                  value={watermarkText}
                  onChange={(e) => setWatermarkText(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-xl text-sm bg-white"
                />
              </div>
              <div>
                <label className="block text-xs font-bold uppercase text-slate-700 mb-1">
                  Style
                </label>
                <div className="flex gap-2">
                  {(["diagonal", "tiled"] as const).map((st) => (
                    <button
                      key={st}
                      type="button"
                      onClick={() => setWatermarkStyle(st)}
                      className={`flex-1 py-2 rounded-xl text-xs font-semibold capitalize border ${
                        watermarkStyle === st
                          ? "bg-slate-900 text-white border-slate-900"
                          : "bg-white text-slate-700 border-slate-300"
                      }`}
                    >
                      {st}
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <label className="block text-xs font-bold uppercase text-slate-700 mb-1">
                  Color & Size
                </label>
                <div className="flex gap-1.5">
                  {(["gray", "red", "blue"] as const).map((c) => (
                    <button
                      key={c}
                      type="button"
                      onClick={() => setWatermarkColor(c)}
                      className={`px-2.5 py-2 rounded-xl text-xs font-semibold capitalize border ${
                        watermarkColor === c
                          ? "bg-slate-900 text-white border-slate-900"
                          : "bg-white text-slate-700 border-slate-300"
                      }`}
                    >
                      {c}
                    </button>
                  ))}
                  <input
                    type="number"
                    value={watermarkSize}
                    onChange={(e) => setWatermarkSize(Number(e.target.value) || 48)}
                    className="w-16 px-2 py-2 border border-slate-300 rounded-xl text-xs bg-white"
                  />
                </div>
              </div>
              <div>
                <label className="block text-xs font-bold uppercase text-slate-700 mb-1">
                  Opacity ({Math.round(watermarkOpacity * 100)}%)
                </label>
                <input
                  type="range"
                  min={0.1}
                  max={0.8}
                  step={0.05}
                  value={watermarkOpacity}
                  onChange={(e) => setWatermarkOpacity(parseFloat(e.target.value))}
                  className="w-full accent-rose-600 mt-2"
                />
              </div>
            </div>
          )}

          {files.length > 0 && activeTool.id === "numbers" && (
            <div className="mt-5 p-5 rounded-2xl bg-slate-50 border border-slate-200 grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <label className="block text-xs font-bold uppercase text-slate-700 mb-1">
                  Position
                </label>
                <select
                  value={numberPos}
                  onChange={(e) => setNumberPos(e.target.value as typeof numberPos)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-xl text-sm bg-white"
                >
                  <option value="bottom-center">Bottom Center</option>
                  <option value="bottom-right">Bottom Right</option>
                  <option value="bottom-left">Bottom Left</option>
                  <option value="top-right">Top Right</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-bold uppercase text-slate-700 mb-1">
                  Format
                </label>
                <select
                  value={numberFormat}
                  onChange={(e) => setNumberFormat(e.target.value as typeof numberFormat)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-xl text-sm bg-white"
                >
                  <option value="page-of">Page 1 of N</option>
                  <option value="slash">1 / N</option>
                  <option value="plain">1</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-bold uppercase text-slate-700 mb-1">
                  Start Number
                </label>
                <input
                  type="number"
                  min={1}
                  value={startNumber}
                  onChange={(e) => setStartNumber(Math.max(1, parseInt(e.target.value, 10) || 1))}
                  className="w-full px-3 py-2 border border-slate-300 rounded-xl text-sm bg-white"
                />
              </div>
            </div>
          )}

          {files.length > 0 && activeTool.id === "sign" && (
            <div className="mt-5 p-5 rounded-2xl bg-slate-50 border border-slate-200 space-y-4">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <span className="text-xs font-bold uppercase text-slate-700">
                  Draw Your Signature Below
                </span>
                <button
                  type="button"
                  onClick={clearSignature}
                  className="text-xs font-semibold text-rose-600 hover:underline"
                >
                  Clear Signature Pad
                </button>
              </div>
              <canvas
                ref={sigCanvasRef}
                width={420}
                height={140}
                onMouseDown={startDrawing}
                onMouseMove={drawMove}
                onMouseUp={stopDrawing}
                onMouseLeave={stopDrawing}
                className="border-2 border-slate-300 rounded-xl bg-white cursor-crosshair max-w-full"
              />
              <div className="flex flex-wrap gap-4">
                <div>
                  <label className="block text-xs font-bold uppercase text-slate-700 mb-1">
                    Pages to Sign
                  </label>
                  <select
                    value={signTarget}
                    onChange={(e) => setSignTarget(e.target.value as typeof signTarget)}
                    className="px-3 py-2 border border-slate-300 rounded-xl text-sm bg-white"
                  >
                    <option value="last">Last Page Only</option>
                    <option value="first">First Page Only</option>
                    <option value="all">All Pages</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-bold uppercase text-slate-700 mb-1">
                    Corner Position
                  </label>
                  <select
                    value={signPos}
                    onChange={(e) => setSignPos(e.target.value as typeof signPos)}
                    className="px-3 py-2 border border-slate-300 rounded-xl text-sm bg-white"
                  >
                    <option value="bottom-right">Bottom Right</option>
                    <option value="bottom-left">Bottom Left</option>
                  </select>
                </div>
              </div>
            </div>
          )}

          {files.length > 0 && activeTool.id === "crop" && (
            <div className="mt-5 p-4 rounded-2xl bg-slate-50 border border-slate-200">
              <label className="block text-xs font-bold uppercase text-slate-700 mb-1">
                Margin Trim Size ({cropMargin} pt)
              </label>
              <input
                type="range"
                min={10}
                max={100}
                step={2}
                value={cropMargin}
                onChange={(e) => setCropMargin(Number(e.target.value))}
                className="w-full sm:w-72 accent-rose-600"
              />
            </div>
          )}

          {files.length > 0 && (
            <div className="mt-6 flex flex-col sm:flex-row sm:items-end gap-4">
              <div className="flex-1 max-w-xs">
                <label className="block text-[11px] font-bold uppercase tracking-wide text-slate-500 mb-1">
                  Output File Name
                </label>
                <div className="flex items-center rounded-xl border border-slate-300 bg-white overflow-hidden">
                  <input
                    type="text"
                    value={outputName}
                    onChange={(e) => setOutputName(e.target.value)}
                    className="w-full px-3 py-2.5 text-sm text-slate-900 focus:outline-none"
                  />
                  <span className="px-3 text-xs font-semibold text-slate-400 bg-slate-50 border-l border-slate-200 py-2.5">
                    .pdf
                  </span>
                </div>
              </div>

              <button
                type="button"
                onClick={handleProcess}
                disabled={processing}
                className="px-8 py-3 bg-rose-600 hover:bg-rose-700 text-white font-bold text-sm rounded-xl shadow-sm transition disabled:opacity-50"
              >
                {processing ? "Processing in Browser..." : activeTool.actionLabel}
              </button>
            </div>
          )}

          {errorMsg && (
            <div className="mt-5 p-3.5 rounded-xl bg-rose-50 border border-rose-200 text-sm text-rose-700">
              {errorMsg}
            </div>
          )}
          {successMsg && (
            <div className="mt-5 p-3.5 rounded-xl bg-emerald-50 border border-emerald-200 text-sm text-emerald-700 font-medium">
              ✓ {successMsg}
            </div>
          )}
        </section>

        {infoModal && (
          <section className="bg-white rounded-3xl border border-slate-200 p-6 sm:p-8 space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-bold text-slate-900 capitalize">
                {infoModal === "privacy"
                  ? "Privacy Policy"
                  : infoModal === "terms"
                  ? "Terms of Use"
                  : "Contact & Support"}
              </h3>
              <button
                type="button"
                onClick={() => setInfoModal(null)}
                className="text-xs font-bold text-slate-500 hover:text-slate-900"
              >
                Close ✕
              </button>
            </div>
            {infoModal === "privacy" && (
              <p className="text-xs text-slate-600 leading-relaxed">
                PDFStudio processes all PDF and image files 100% locally inside your web
                browser. Your documents are never uploaded to, stored on, or read by any
                external server.
              </p>
            )}
            {infoModal === "terms" && (
              <p className="text-xs text-slate-600 leading-relaxed">
                PDFStudio is provided free of charge for personal and commercial document
                workflows on an as-is basis. Always retain a backup copy of important
                original files.
              </p>
            )}
            {infoModal === "contact" && (
              <p className="text-xs text-slate-600 leading-relaxed">
                Questions, bug reports, or partnership inquiries? Email us directly at{" "}
                <span className="font-bold text-slate-900">support@pdfstudio.tools</span>.
              </p>
            )}
          </section>
        )}
      </main>

      <footer className="border-t border-slate-200 bg-white mt-12">
        <div className="max-w-6xl mx-auto px-4 sm:px-8 py-6 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-slate-500">
          <p>PDFStudio • 10 Free Browser-Based PDF Tools</p>
          <div className="flex items-center gap-4">
            <button
              type="button"
              onClick={() => setInfoModal("privacy")}
              className="hover:text-slate-900"
            >
              Privacy Policy
            </button>
            <button
              type="button"
              onClick={() => setInfoModal("terms")}
              className="hover:text-slate-900"
            >
              Terms of Use
            </button>
            <button
              type="button"
              onClick={() => setInfoModal("contact")}
              className="hover:text-slate-900"
            >
              Contact
            </button>
          </div>
        </div>
      </footer>
    </div>
  );
}