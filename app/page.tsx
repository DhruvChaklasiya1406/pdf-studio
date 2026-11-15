"use client";

import { useState, useRef } from "react";
import { PDFDocument, StandardFonts, degrees, rgb } from "pdf-lib";

type ToolId = "merge" | "organize" | "split" | "rotate" | "watermark" | "numbers" | "sign" | "crop" | "images" | "flatten";

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
  thumbUrl: string;
}

interface PdfJsViewport { width: number; height: number; }
interface PdfJsPage {
  getViewport: (opts: { scale: number }) => PdfJsViewport;
  render: (opts: { canvasContext: CanvasRenderingContext2D; viewport: PdfJsViewport }) => { promise: Promise<void> };
}
interface PdfJsDoc { numPages: number; getPage: (n: number) => Promise<PdfJsPage>; }
interface PdfJsLib {
  GlobalWorkerOptions: { workerSrc: string };
  getDocument: (opts: { data: Uint8Array }) => { promise: Promise<PdfJsDoc> };
}

const TOOLS: ToolConfig[] = [
  { id: "merge", shortTitle: "Merge PDF", title: "Merge PDF Files", tagline: "Combine multiple PDFs into one ordered document.", badge: "Popular", accent: "bg-rose-600", accept: "application/pdf,.pdf", multiple: true, actionLabel: "Merge & Download PDF", defaultOut: "merged-document" },
  { id: "organize", shortTitle: "Organize Pages", title: "Organize, Reorder & Delete Pages", tagline: "Visually reorder pages, rotate single pages, or remove unwanted pages.", badge: "Visual", accent: "bg-purple-600", accept: "application/pdf,.pdf", multiple: false, actionLabel: "Save Organized PDF", defaultOut: "organized-document" },
  { id: "split", shortTitle: "Split & Extract", title: "Split & Extract PDF Pages", tagline: "Click page thumbnails or enter custom ranges to extract into a new PDF.", badge: "Precision", accent: "bg-indigo-600", accept: "application/pdf,.pdf", multiple: false, actionLabel: "Extract & Download PDF", defaultOut: "extracted-pages" },
  { id: "rotate", shortTitle: "Rotate PDF", title: "Rotate PDF Pages Permanently", tagline: "Rotate upside-down or sideways scans by 90, 180, or 270 degrees.", badge: "Quick Fix", accent: "bg-emerald-600", accept: "application/pdf,.pdf", multiple: false, actionLabel: "Rotate & Download PDF", defaultOut: "rotated-document" },
  { id: "watermark", shortTitle: "Watermark", title: "Add Text Watermark to PDF", tagline: "Stamp custom diagonal or tiled text across every page.", badge: "Security", accent: "bg-cyan-600", accept: "application/pdf,.pdf", multiple: false, actionLabel: "Stamp Watermark & Download", defaultOut: "watermarked-document" },
  { id: "numbers", shortTitle: "Page Numbers", title: "Add Page Numbers to PDF", tagline: "Insert header or footer page numbers across your document.", badge: "Format", accent: "bg-teal-600", accept: "application/pdf,.pdf", multiple: false, actionLabel: "Add Page Numbers & Download", defaultOut: "numbered-document" },
  { id: "sign", shortTitle: "Sign PDF", title: "Draw & Stamp Signature on PDF", tagline: "Draw your signature with mouse or touchscreen and stamp it on your PDF.", badge: "eSign", accent: "bg-blue-600", accept: "application/pdf,.pdf", multiple: false, actionLabel: "Sign & Download PDF", defaultOut: "signed-document" },
  { id: "crop", shortTitle: "Crop Margins", title: "Crop PDF Page Margins", tagline: "Trim white margins from the top, bottom, left, and right.", badge: "Layout", accent: "bg-orange-600", accept: "application/pdf,.pdf", multiple: false, actionLabel: "Crop & Download PDF", defaultOut: "cropped-document" },
  { id: "images", shortTitle: "JPG to PDF", title: "Convert JPG & PNG to PDF", tagline: "Turn photos, receipts, and screenshots into a single PDF.", badge: "Convert", accent: "bg-amber-500", accept: "image/jpeg,image/png,.jpg,.jpeg,.png", multiple: true, actionLabel: "Convert Images to PDF", defaultOut: "images-converted" },
  { id: "flatten", shortTitle: "Lock Forms", title: "Flatten PDF Forms & Metadata", tagline: "Lock interactive form fields so they cannot be edited.", badge: "Protect", accent: "bg-slate-800", accept: "application/pdf,.pdf", multiple: false, actionLabel: "Flatten & Download PDF", defaultOut: "flattened-document" },
];

function formatBytes(b: number): string {
  if (b < 1024) return `${b} B`;
  if (b < 1048576) return `${(b / 1024).toFixed(1)} KB`;
  return `${(b / 1048576).toFixed(2)} MB`;
}

async function loadPdfJs(): Promise<PdfJsLib | null> {
  if (typeof window === "undefined") return null;
  const win = window as unknown as { pdfjsLib?: PdfJsLib };
  if (win.pdfjsLib) return win.pdfjsLib;
  return new Promise((resolve) => {
    const s = document.createElement("script");
    s.src = "https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.min.js";
    s.async = true;
    s.onload = () => {
      if (win.pdfjsLib) {
        win.pdfjsLib.GlobalWorkerOptions.workerSrc = "https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js";
        resolve(win.pdfjsLib);
      } else resolve(null);
    };
    s.onerror = () => resolve(null);
    document.head.appendChild(s);
  });
}

async function normalizeImage(file: File): Promise<{ bytes: Uint8Array; width: number; height: number }> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      const c = document.createElement("canvas");
      c.width = img.naturalWidth || img.width || 800;
      c.height = img.naturalHeight || img.height || 1000;
      const ctx = c.getContext("2d");
      if (!ctx) { URL.revokeObjectURL(url); return reject(new Error("Canvas unavailable.")); }
      ctx.fillStyle = "#ffffff";
      ctx.fillRect(0, 0, c.width, c.height);
      ctx.drawImage(img, 0, 0);
      URL.revokeObjectURL(url);
      const bin = atob(c.toDataURL("image/png").split(",")[1]);
      resolve({ bytes: Uint8Array.from(bin, (ch) => ch.charCodeAt(0)), width: c.width, height: c.height });
    };
    img.onerror = () => { URL.revokeObjectURL(url); reject(new Error(`Could not read image ${file.name}`)); };
    img.src = url;
  });
}

export default function PdfStudioApp() {
  const [activeToolId, setActiveToolId] = useState<ToolId>("merge");
  const [files, setFiles] = useState<File[]>([]);
  const [pageCount, setPageCount] = useState<number | null>(null);
  const [outputName, setOutputName] = useState("merged-document");
  const [pageRange, setPageRange] = useState("1");
  const [rotationAngle, setRotationAngle] = useState<90 | 180 | 270>(90);
  const [organizePages, setOrganizePages] = useState<PageItem[]>([]);
  const [loadingThumbs, setLoadingThumbs] = useState(false);
  const [watermarkText, setWatermarkText] = useState("CONFIDENTIAL");
  const [watermarkStyle, setWatermarkStyle] = useState<"diagonal" | "tiled">("diagonal");
  const [watermarkColor, setWatermarkColor] = useState<"gray" | "red" | "blue">("gray");
  const [watermarkOpacity, setWatermarkOpacity] = useState(0.25);
  const [watermarkSize, setWatermarkSize] = useState(52);
  const [numberPos, setNumberPos] = useState<"bottom-center" | "bottom-right" | "bottom-left" | "top-right">("bottom-center");
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

  const resetAll = (nextId: ToolId = activeToolId) => {
    const nextTool = TOOLS.find((t) => t.id === nextId) || TOOLS[0];
    setActiveToolId(nextId);
    setFiles([]);
    setPageCount(null);
    setOrganizePages([]);
    setHasSignature(false);
    setOutputName(nextTool.defaultOut);
    setErrorMsg("");
    setSuccessMsg("");
  };

  const inspectPdf = async (file: File) => {
    setLoadingThumbs(true);
    try {
      const buffer = await file.arrayBuffer();
      const pdf = await PDFDocument.load(buffer, { ignoreEncryption: true });
      const total = pdf.getPageCount();
      setPageCount(total);
      setPageRange(total > 1 ? `1-${Math.min(2, total)}` : "1");
      const base: PageItem[] = Array.from({ length: total }, (_, i) => ({ originalIndex: i, pageNumber: i + 1, rotation: 0, deleted: false, thumbUrl: "" }));
      setOrganizePages(base);

      const pdfjs = await loadPdfJs();
      if (!pdfjs) return;
      const doc = await pdfjs.getDocument({ data: new Uint8Array(buffer.slice(0)) }).promise;
      const limit = Math.min(total, 50);
      const updated = [...base];
      for (let p = 1; p <= limit; p++) {
        const page = await doc.getPage(p);
        const vp = page.getViewport({ scale: 0.4 });
        const c = document.createElement("canvas");
        c.width = vp.width;
        c.height = vp.height;
        const ctx = c.getContext("2d");
        if (ctx) {
          await page.render({ canvasContext: ctx, viewport: vp }).promise;
          updated[p - 1] = { ...updated[p - 1], thumbUrl: c.toDataURL("image/jpeg", 0.78) };
        }
      }
      setOrganizePages([...updated]);
    } catch {
      setPageCount(null);
      setErrorMsg("Could not read PDF pages. Ensure the file is not password-protected.");
    } finally {
      setLoadingThumbs(false);
    }
  };

  const handleIncomingFiles = async (list: FileList | null) => {
    if (!list || !list.length) return;
    setErrorMsg("");
    setSuccessMsg("");
    const arr = Array.from(list);
    if (activeTool.id === "images") {
      const imgs = arr.filter((f) => ["image/jpeg", "image/jpg", "image/png"].includes(f.type) || /\.(jpe?g|png)$/i.test(f.name));
      if (!imgs.length) return setErrorMsg("Please select JPG or PNG images.");
      setFiles((prev) => [...prev, ...imgs]);
      return;
    }
    const pdfs = arr.filter((f) => f.type === "application/pdf" || f.name.toLowerCase().endsWith(".pdf"));
    if (!pdfs.length) return setErrorMsg("Please select a valid PDF (.pdf) file.");
    if (activeTool.multiple) {
      setFiles((prev) => [...prev, ...pdfs]);
    } else {
      const single = pdfs[0];
      setFiles([single]);
      setHasSignature(false);
      setOutputName(`${activeTool.id}-${single.name.replace(/\.pdf$/i, "")}`);
      await inspectPdf(single);
    }
  };

  const moveItem = <T,>(arr: T[], idx: number, dir: -1 | 1, setter: (v: T[]) => void) => {
    const t = idx + dir;
    if (t < 0 || t >= arr.length) return;
    const copy = [...arr];
    const [it] = copy.splice(idx, 1);
    copy.splice(t, 0, it);
    setter(copy);
  };

  const beginStroke = (cx: number, cy: number) => {
    const c = sigCanvasRef.current;
    const ctx = c?.getContext("2d");
    if (!c || !ctx) return;
    const r = c.getBoundingClientRect();
    ctx.strokeStyle = "#0f172a";
    ctx.lineWidth = 2.8;
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    ctx.beginPath();
    ctx.moveTo((cx - r.left) * (c.width / r.width), (cy - r.top) * (c.height / r.height));
    setIsDrawing(true);
    setHasSignature(true);
  };

  const moveStroke = (cx: number, cy: number) => {
    if (!isDrawing || !sigCanvasRef.current) return;
    const c = sigCanvasRef.current;
    const ctx = c.getContext("2d");
    if (!ctx) return;
    const r = c.getBoundingClientRect();
    ctx.lineTo((cx - r.left) * (c.width / r.width), (cy - r.top) * (c.height / r.height));
    ctx.stroke();
  };

  const clearSignature = () => {
    const c = sigCanvasRef.current;
    c?.getContext("2d")?.clearRect(0, 0, c.width, c.height);
    setHasSignature(false);
  };

  const parsePageSelection = (input: string, maxPages: number): number[] => {
    const indices = new Set<number>();
    for (const part of input.split(",").map((p) => p.trim()).filter(Boolean)) {
      if (part.includes("-")) {
        const [s, e] = part.split("-").map((n) => parseInt(n, 10));
        if (isNaN(s) || isNaN(e) || s < 1 || e > maxPages || s > e) throw new Error(`Invalid range "${part}".`);
        for (let p = s; p <= e; p++) indices.add(p - 1);
      } else {
        const num = parseInt(part, 10);
        if (isNaN(num) || num < 1 || num > maxPages) throw new Error(`Invalid page "${part}".`);
        indices.add(num - 1);
      }
    }
    if (!indices.size) throw new Error("Select at least one page.");
    return Array.from(indices).sort((a, b) => a - b);
  };

  const toggleSplitPage = (pageNum: number) => {
    if (!pageCount) return;
    let set = new Set<number>();
    try { set = new Set(parsePageSelection(pageRange, pageCount).map((i) => i + 1)); } catch { set = new Set(); }
    if (set.has(pageNum)) set.delete(pageNum); else set.add(pageNum);
    const sorted = Array.from(set).sort((a, b) => a - b);
    setPageRange(sorted.length ? sorted.join(", ") : "1");
  };

  const downloadPdfBytes = (bytes: Uint8Array, rawName: string) => {
    const clean = rawName.trim().replace(/\.pdf$/i, "").replace(/[^a-zA-Z0-9-_ ]/g, "") || activeTool.defaultOut;
    const blob = new Blob([bytes as unknown as BlobPart], { type: "application/pdf" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${clean}.pdf`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    setTimeout(() => URL.revokeObjectURL(url), 1500);
    return `${clean}.pdf`;
  };

  const handleProcess = async () => {
    if (!files.length) return;
    setProcessing(true);
    setErrorMsg("");
    setSuccessMsg("");
    try {
      if (activeTool.id === "merge") {
        if (files.length < 2) throw new Error("Add at least 2 PDF files to merge.");
        const merged = await PDFDocument.create();
        for (const f of files) {
          const src = await PDFDocument.load(await f.arrayBuffer(), { ignoreEncryption: true });
          (await merged.copyPages(src, src.getPageIndices())).forEach((p) => merged.addPage(p));
        }
        setSuccessMsg(`Merged into ${downloadPdfBytes(await merged.save(), outputName)}!`);
      } else if (activeTool.id === "organize") {
        const kept = organizePages.filter((p) => !p.deleted);
        if (!kept.length) throw new Error("Keep at least 1 page.");
        const src = await PDFDocument.load(await files[0].arrayBuffer(), { ignoreEncryption: true });
        const out = await PDFDocument.create();
        for (const item of kept) {
          const [copied] = await out.copyPages(src, [item.originalIndex]);
          if (item.rotation) copied.setRotation(degrees((copied.getRotation().angle + item.rotation) % 360));
          out.addPage(copied);
        }
        setSuccessMsg(`Saved ${downloadPdfBytes(await out.save(), outputName)}!`);
      } else if (activeTool.id === "split") {
        const src = await PDFDocument.load(await files[0].arrayBuffer(), { ignoreEncryption: true });
        const selected = parsePageSelection(pageRange, src.getPageCount());
        const out = await PDFDocument.create();
        (await out.copyPages(src, selected)).forEach((p) => out.addPage(p));
        setSuccessMsg(`Extracted ${selected.length} page(s) into ${downloadPdfBytes(await out.save(), outputName)}!`);
      } else if (activeTool.id === "rotate") {
        const pdf = await PDFDocument.load(await files[0].arrayBuffer(), { ignoreEncryption: true });
        pdf.getPages().forEach((p) => p.setRotation(degrees((p.getRotation().angle + rotationAngle) % 360)));
        setSuccessMsg(`Rotated into ${downloadPdfBytes(await pdf.save(), outputName)}!`);
      } else if (activeTool.id === "watermark") {
        const text = watermarkText.trim();
        if (!text) throw new Error("Enter watermark text.");
        const pdf = await PDFDocument.load(await files[0].arrayBuffer(), { ignoreEncryption: true });
        const font = await pdf.embedFont(StandardFonts.HelveticaBold);
        const color = { gray: rgb(0.35, 0.38, 0.42), red: rgb(0.82, 0.12, 0.18), blue: rgb(0.12, 0.32, 0.78) }[watermarkColor];
        pdf.getPages().forEach((page) => {
          const { width, height } = page.getSize();
          const tw = font.widthOfTextAtSize(text, watermarkSize);
          if (watermarkStyle === "diagonal") {
            page.drawText(text, { x: Math.max(36, (width - tw * 0.7) / 2), y: height / 2 - watermarkSize / 2, size: watermarkSize, font, color, opacity: watermarkOpacity, rotate: degrees(38) });
          } else {
            const ts = Math.max(20, Math.round(watermarkSize * 0.55));
            const sx = Math.max(170, font.widthOfTextAtSize(text, ts) + 80);
            for (let y = 70; y < height; y += 150)
              for (let x = 40; x < width; x += sx)
                page.drawText(text, { x, y, size: ts, font, color, opacity: watermarkOpacity, rotate: degrees(32) });
          }
        });
        setSuccessMsg(`Watermarked ${downloadPdfBytes(await pdf.save(), outputName)}!`);
      } else if (activeTool.id === "numbers") {
        const pdf = await PDFDocument.load(await files[0].arrayBuffer(), { ignoreEncryption: true });
        const font = await pdf.embedFont(StandardFonts.HelveticaBold);
        const pages = pdf.getPages();
        pages.forEach((page, i) => {
          const cur = (startNumber || 1) + i;
          const tot = (startNumber || 1) + pages.length - 1;
          const label = numberFormat === "page-of" ? `Page ${cur} of ${tot}` : numberFormat === "slash" ? `${cur} / ${tot}` : `${cur}`;
          const { width, height } = page.getSize();
          const tw = font.widthOfTextAtSize(label, 11);
          const x = numberPos === "bottom-left" ? 28 : numberPos === "bottom-center" ? (width - tw) / 2 : width - tw - 28;
          const y = numberPos === "top-right" ? height - 39 : 28;
          page.drawText(label, { x, y, size: 11, font, color: rgb(0.2, 0.23, 0.28) });
        });
        setSuccessMsg(`Numbered ${downloadPdfBytes(await pdf.save(), outputName)}!`);
      } else if (activeTool.id === "sign") {
        if (!hasSignature || !sigCanvasRef.current) throw new Error("Draw your signature in the pad first.");
        const bin = atob(sigCanvasRef.current.toDataURL("image/png").split(",")[1]);
        const sigImg = await (await PDFDocument.load(await files[0].arrayBuffer(), { ignoreEncryption: true })).embedPng(Uint8Array.from(bin, (c) => c.charCodeAt(0)));
        const pdf = await PDFDocument.load(await files[0].arrayBuffer(), { ignoreEncryption: true });
        const embeddedSig = await pdf.embedPng(Uint8Array.from(bin, (c) => c.charCodeAt(0)));
        void sigImg;
        const pages = pdf.getPages();
        const targets = signTarget === "first" ? [0] : signTarget === "last" ? [pages.length - 1] : pages.map((_, i) => i);
        targets.forEach((idx) => {
          const p = pages[idx];
          if (p) p.drawImage(embeddedSig, { x: signPos === "bottom-right" ? Math.max(36, p.getSize().width - 194) : 44, y: 44, width: 150, height: 60 });
        });
        setSuccessMsg(`Signed ${downloadPdfBytes(await pdf.save(), outputName)}!`);
      } else if (activeTool.id === "crop") {
        const pdf = await PDFDocument.load(await files[0].arrayBuffer(), { ignoreEncryption: true });
        pdf.getPages().forEach((p) => {
          const { width, height } = p.getSize();
          const m = Math.min(cropMargin, Math.floor(Math.min(width, height) / 4));
          p.setCropBox(m, m, width - m * 2, height - m * 2);
        });
        setSuccessMsg(`Cropped ${downloadPdfBytes(await pdf.save(), outputName)}!`);
      } else if (activeTool.id === "images") {
        const pdf = await PDFDocument.create();
        for (const imgFile of files) {
          const norm = await normalizeImage(imgFile);
          const img = await pdf.embedPng(norm.bytes);
          pdf.addPage([norm.width, norm.height]).drawImage(img, { x: 0, y: 0, width: norm.width, height: norm.height });
        }
        setSuccessMsg(`Converted into ${downloadPdfBytes(await pdf.save(), outputName)}!`);
      } else if (activeTool.id === "flatten") {
        const pdf = await PDFDocument.load(await files[0].arrayBuffer(), { ignoreEncryption: true });
        try { pdf.getForm().flatten(); } catch {}
        setSuccessMsg(`Flattened ${downloadPdfBytes(await pdf.save(), outputName)}!`);
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
            <div className="h-9 w-9 rounded-xl bg-rose-600 text-white font-extrabold flex items-center justify-center shadow-sm">PDF</div>
            <span className="font-bold text-xl tracking-tight text-slate-900">PDF<span className="text-rose-600">Studio</span></span>
          </div>
          <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 border border-emerald-200 px-3 py-1 text-xs font-semibold text-emerald-700">
            ● 10 Tools • Visual Previews • 100% Private
          </span>
        </div>
      </header>

      <main className="flex-1 max-w-6xl w-full mx-auto px-4 sm:px-8 py-10 space-y-8">
        <section className="text-center max-w-2xl mx-auto">
          <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-slate-900">
            Every PDF tool you need, <span className="text-rose-600">instant & free.</span>
          </h1>
          <p className="mt-3 text-sm sm:text-base text-slate-600">
            Merge, visually organize, split, rotate, watermark, number, e-sign, crop, and convert PDFs directly in your browser.
          </p>
        </section>

        <section className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
          {TOOLS.map((tool) => (
            <button key={tool.id} type="button" onClick={() => resetAll(tool.id)} className={`text-left p-4 rounded-2xl border transition-all ${tool.id === activeToolId ? "bg-white border-rose-500 ring-2 ring-rose-500/20 shadow-md" : "bg-white border-slate-200 hover:border-slate-300"}`}>
              <div className="flex items-center justify-between mb-2">
                <span className={`h-7 w-7 rounded-lg ${tool.accent} text-white text-[10px] font-bold flex items-center justify-center`}>{tool.shortTitle.slice(0, 3).toUpperCase()}</span>
                <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-slate-100 text-slate-600">{tool.badge}</span>
              </div>
              <h2 className="font-bold text-slate-900 text-sm">{tool.shortTitle}</h2>
              <p className="mt-1 text-[11px] text-slate-500 line-clamp-2">{tool.tagline}</p>
            </button>
          ))}
        </section>

        <section className="bg-white rounded-3xl border border-slate-200 shadow-sm p-6 sm:p-10">
          <div className="flex flex-wrap items-center justify-between gap-2 mb-6">
            <div>
              <h2 className="text-xl font-bold text-slate-900">{activeTool.title}</h2>
              <p className="text-xs sm:text-sm text-slate-500">{activeTool.tagline}</p>
            </div>
            {files.length > 0 && (
              <button type="button" onClick={() => resetAll(activeToolId)} className="text-xs font-semibold text-slate-500 hover:text-rose-600">Clear all files</button>
            )}
          </div>

          <div
            onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
            onDragLeave={() => setIsDragging(false)}
            onDrop={(e) => { e.preventDefault(); setIsDragging(false); handleIncomingFiles(e.dataTransfer.files); }}
            onClick={() => fileInputRef.current?.click()}
            className={`cursor-pointer rounded-2xl border-2 border-dashed p-10 text-center transition ${isDragging ? "border-rose-500 bg-rose-50/50" : "border-slate-300 bg-slate-50/70 hover:border-rose-400"}`}
          >
            <input ref={fileInputRef} type="file" accept={activeTool.accept} multiple={activeTool.multiple} onChange={(e) => { handleIncomingFiles(e.target.files); e.target.value = ""; }} className="hidden" />
            <div className="mx-auto h-12 w-12 rounded-2xl bg-rose-100 text-rose-600 flex items-center justify-center font-bold text-xl mb-3">+</div>
            <p className="text-sm sm:text-base font-semibold text-slate-800">Click to select {activeTool.id === "images" ? "JPG or PNG images" : "PDF file(s)"} or drag & drop here</p>
            <p className="mt-1 text-xs text-slate-400">Processed locally on your device • Instant download</p>
          </div>

          {files.length > 0 && (
            <div className="mt-6 divide-y divide-slate-100 border border-slate-200 rounded-2xl overflow-hidden">
              {files.map((file, idx) => (
                <div key={`${file.name}-${idx}`} className="flex items-center justify-between gap-3 px-4 py-3 bg-white text-sm">
                  <div className="min-w-0">
                    <p className="font-medium text-slate-800 truncate">{idx + 1}. {file.name}</p>
                    <p className="text-xs text-slate-400">{formatBytes(file.size)}{pageCount && !activeTool.multiple ? ` • ${pageCount} pages` : ""}</p>
                  </div>
                  <div className="flex items-center gap-1.5 shrink-0">
                    {activeTool.multiple && files.length > 1 && (
                      <>
                        <button type="button" onClick={() => moveItem(files, idx, -1, setFiles)} disabled={idx === 0} className="px-2 py-1 text-xs border rounded-lg disabled:opacity-30">↑</button>
                        <button type="button" onClick={() => moveItem(files, idx, 1, setFiles)} disabled={idx === files.length - 1} className="px-2 py-1 text-xs border rounded-lg disabled:opacity-30">↓</button>
                      </>
                    )}
                    <button type="button" onClick={() => { const n = files.filter((_, i) => i !== idx); setFiles(n); if (!n.length) resetAll(activeToolId); }} className="px-2.5 py-1 text-xs font-semibold text-slate-400 hover:text-rose-600">Remove</button>
                  </div>
                </div>
              ))}
            </div>
          )}

          {loadingThumbs && <div className="mt-4 p-3 rounded-xl bg-slate-50 border text-xs font-semibold text-slate-600 text-center">Rendering visual page previews...</div>}

          {files.length > 0 && activeTool.id === "organize" && organizePages.length > 0 && (
            <div className="mt-6 p-5 rounded-2xl bg-slate-50 border border-slate-200 grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
              {organizePages.map((p, idx) => (
                <div key={p.originalIndex} className={`p-3 rounded-2xl border text-center ${p.deleted ? "bg-rose-50 border-rose-200 opacity-50" : "bg-white border-slate-200"}`}>
                  <div className="relative h-36 rounded-xl bg-slate-100 flex items-center justify-center mb-2 overflow-hidden border">
                    {p.thumbUrl ? (
                      <div style={{ backgroundImage: `url(${p.thumbUrl})`, transform: `rotate(${p.rotation}deg)` }} className="w-full h-full bg-contain bg-center bg-no-repeat transition-transform" />
                    ) : <span className="text-xs font-bold">Page {p.pageNumber}</span>}
                    <span className="absolute top-1.5 left-1.5 px-2 py-0.5 rounded bg-slate-900/80 text-white text-[10px] font-bold">#{idx + 1} (p.{p.pageNumber})</span>
                  </div>
                  <div className="flex items-center justify-center gap-1">
                    <button type="button" onClick={() => moveItem(organizePages, idx, -1, setOrganizePages)} disabled={idx === 0} className="px-2 py-1 text-xs border rounded bg-white disabled:opacity-30">←</button>
                    <button type="button" onClick={() => moveItem(organizePages, idx, 1, setOrganizePages)} disabled={idx === organizePages.length - 1} className="px-2 py-1 text-xs border rounded bg-white disabled:opacity-30">→</button>
                    <button type="button" onClick={() => setOrganizePages((prev) => prev.map((it, i) => i === idx ? { ...it, rotation: ((it.rotation + 90) % 360) as 0 | 90 | 180 | 270 } : it))} className="px-2 py-1 text-xs border rounded bg-white">↻</button>
                    <button type="button" onClick={() => setOrganizePages((prev) => prev.map((it, i) => i === idx ? { ...it, deleted: !it.deleted } : it))} className={`px-2 py-1 text-[10px] font-bold rounded ${p.deleted ? "bg-emerald-600 text-white" : "bg-rose-100 text-rose-700"}`}>{p.deleted ? "Keep" : "Del"}</button>
                  </div>
                </div>
              ))}
            </div>
          )}

          {files.length > 0 && activeTool.id === "split" && (
            <div className="mt-5 p-5 rounded-2xl bg-slate-50 border border-slate-200 space-y-4">
              <div>
                <label className="block text-xs font-bold uppercase text-slate-700 mb-1.5">Pages to Extract {pageCount ? `(1 to ${pageCount})` : ""} — Click thumbnails or type ranges</label>
                <input type="text" value={pageRange} onChange={(e) => setPageRange(e.target.value)} placeholder="e.g. 1, 3-5" className="w-full sm:w-80 px-3.5 py-2 border border-slate-300 rounded-xl text-sm bg-white" />
              </div>
              {organizePages.length > 0 && (
                <div className="grid grid-cols-3 sm:grid-cols-5 md:grid-cols-6 gap-3">
                  {organizePages.map((p) => {
                    let sel = false;
                    try { if (pageCount) sel = parsePageSelection(pageRange, pageCount).includes(p.originalIndex); } catch {}
                    return (
                      <button key={p.originalIndex} type="button" onClick={() => toggleSplitPage(p.pageNumber)} className={`p-2 rounded-xl border text-center transition ${sel ? "bg-rose-50 border-rose-500 ring-2 ring-rose-500/20" : "bg-white border-slate-200 opacity-65"}`}>
                        <div className="h-24 rounded-lg bg-slate-100 flex items-center justify-center mb-1 overflow-hidden">
                          {p.thumbUrl ? <div style={{ backgroundImage: `url(${p.thumbUrl})` }} className="w-full h-full bg-contain bg-center bg-no-repeat" /> : <span className="text-xs font-bold">p.{p.pageNumber}</span>}
                        </div>
                        <span className="text-[11px] font-bold">Page {p.pageNumber} {sel ? "✓" : ""}</span>
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {files.length > 0 && activeTool.id === "rotate" && (
            <div className="mt-5 p-5 rounded-2xl bg-slate-50 border border-slate-200 space-y-4">
              <div className="flex gap-2">
                {([90, 180, 270] as const).map((angle) => (
                  <button key={angle} type="button" onClick={() => setRotationAngle(angle)} className={`px-4 py-2 rounded-xl text-xs font-semibold border ${rotationAngle === angle ? "bg-slate-900 text-white" : "bg-white text-slate-700"}`}>Rotate {angle}°</button>
                ))}
              </div>
              {organizePages[0]?.thumbUrl && (
                <div className="flex items-center gap-4">
                  <div className="w-28 h-36 rounded-xl bg-white border p-2 flex items-center justify-center overflow-hidden">
                    <div style={{ backgroundImage: `url(${organizePages[0].thumbUrl})`, transform: `rotate(${rotationAngle}deg)` }} className="w-full h-full bg-contain bg-center bg-no-repeat transition-transform" />
                  </div>
                  <p className="text-xs text-slate-600">Live preview of Page 1 rotated by <strong>{rotationAngle}°</strong>.</p>
                </div>
              )}
            </div>
          )}

          {files.length > 0 && activeTool.id === "watermark" && (
            <div className="mt-5 p-5 rounded-2xl bg-slate-50 border border-slate-200 grid grid-cols-1 sm:grid-cols-4 gap-4">
              <input type="text" value={watermarkText} onChange={(e) => setWatermarkText(e.target.value)} placeholder="Watermark text" className="px-3 py-2 border border-slate-300 rounded-xl text-sm bg-white" />
              <div className="flex gap-2">
                {(["diagonal", "tiled"] as const).map((st) => (
                  <button key={st} type="button" onClick={() => setWatermarkStyle(st)} className={`flex-1 py-2 rounded-xl text-xs font-semibold capitalize border ${watermarkStyle === st ? "bg-slate-900 text-white" : "bg-white"}`}>{st}</button>
                ))}
              </div>
              <div className="flex gap-1.5">
                {(["gray", "red", "blue"] as const).map((c) => (
                  <button key={c} type="button" onClick={() => setWatermarkColor(c)} className={`px-2.5 py-2 rounded-xl text-xs font-semibold capitalize border ${watermarkColor === c ? "bg-slate-900 text-white" : "bg-white"}`}>{c}</button>
                ))}
                <input type="number" value={watermarkSize} onChange={(e) => setWatermarkSize(Number(e.target.value) || 48)} className="w-16 px-2 py-2 border rounded-xl text-xs bg-white" />
              </div>
              <input type="range" min={0.1} max={0.8} step={0.05} value={watermarkOpacity} onChange={(e) => setWatermarkOpacity(parseFloat(e.target.value))} className="w-full accent-rose-600" />
            </div>
          )}

          {files.length > 0 && activeTool.id === "numbers" && (
            <div className="mt-5 p-5 rounded-2xl bg-slate-50 border border-slate-200 grid grid-cols-1 sm:grid-cols-3 gap-4">
              <select value={numberPos} onChange={(e) => setNumberPos(e.target.value as typeof numberPos)} className="px-3 py-2 border rounded-xl text-sm bg-white">
                <option value="bottom-center">Bottom Center</option>
                <option value="bottom-right">Bottom Right</option>
                <option value="bottom-left">Bottom Left</option>
                <option value="top-right">Top Right</option>
              </select>
              <select value={numberFormat} onChange={(e) => setNumberFormat(e.target.value as typeof numberFormat)} className="px-3 py-2 border rounded-xl text-sm bg-white">
                <option value="page-of">Page 1 of N</option>
                <option value="slash">1 / N</option>
                <option value="plain">1</option>
              </select>
              <input type="number" min={1} value={startNumber} onChange={(e) => setStartNumber(Math.max(1, parseInt(e.target.value, 10) || 1))} className="px-3 py-2 border rounded-xl text-sm bg-white" />
            </div>
          )}

          {files.length > 0 && activeTool.id === "sign" && (
            <div className="mt-5 p-5 rounded-2xl bg-slate-50 border border-slate-200 space-y-3">
              <div className="flex items-center justify-between max-w-md">
                <span className="text-xs font-bold uppercase text-slate-700">Draw Signature Below (Mouse or Touchscreen)</span>
                <button type="button" onClick={clearSignature} className="text-xs font-semibold text-rose-600">Clear Pad</button>
              </div>
              <canvas
                ref={sigCanvasRef}
                width={420}
                height={135}
                onMouseDown={(e) => beginStroke(e.clientX, e.clientY)}
                onMouseMove={(e) => moveStroke(e.clientX, e.clientY)}
                onMouseUp={() => setIsDrawing(false)}
                onMouseLeave={() => setIsDrawing(false)}
                onTouchStart={(e) => { e.preventDefault(); const t = e.touches[0]; if (t) beginStroke(t.clientX, t.clientY); }}
                onTouchMove={(e) => { e.preventDefault(); const t = e.touches[0]; if (t) moveStroke(t.clientX, t.clientY); }}
                onTouchEnd={() => setIsDrawing(false)}
                className="border-2 border-slate-300 rounded-xl bg-white cursor-crosshair max-w-full touch-none"
              />
              <div className="flex gap-3">
                <select value={signTarget} onChange={(e) => setSignTarget(e.target.value as typeof signTarget)} className="px-3 py-2 border rounded-xl text-sm bg-white">
                  <option value="last">Last Page Only</option>
                  <option value="first">First Page Only</option>
                  <option value="all">All Pages</option>
                </select>
                <select value={signPos} onChange={(e) => setSignPos(e.target.value as typeof signPos)} className="px-3 py-2 border rounded-xl text-sm bg-white">
                  <option value="bottom-right">Bottom Right</option>
                  <option value="bottom-left">Bottom Left</option>
                </select>
              </div>
            </div>
          )}

          {files.length > 0 && activeTool.id === "crop" && (
            <div className="mt-5 p-4 rounded-2xl bg-slate-50 border border-slate-200">
              <label className="block text-xs font-bold uppercase text-slate-700 mb-1">Margin Trim ({cropMargin} pt)</label>
              <input type="range" min={10} max={100} step={2} value={cropMargin} onChange={(e) => setCropMargin(Number(e.target.value))} className="w-full sm:w-72 accent-rose-600" />
            </div>
          )}

          {files.length > 0 && (
            <div className="mt-6 flex flex-col sm:flex-row sm:items-end gap-4">
              <div className="flex-1 max-w-xs">
                <label className="block text-[11px] font-bold uppercase text-slate-500 mb-1">Output File Name</label>
                <div className="flex items-center rounded-xl border border-slate-300 bg-white overflow-hidden">
                  <input type="text" value={outputName} onChange={(e) => setOutputName(e.target.value)} className="w-full px-3 py-2.5 text-sm focus:outline-none" />
                  <span className="px-3 text-xs font-semibold text-slate-400 bg-slate-50 border-l py-2.5">.pdf</span>
                </div>
              </div>
              <button type="button" onClick={handleProcess} disabled={processing || loadingThumbs} className="px-8 py-3 bg-rose-600 hover:bg-rose-700 text-white font-bold text-sm rounded-xl shadow-sm transition disabled:opacity-50">
                {processing ? "Processing..." : activeTool.actionLabel}
              </button>
            </div>
          )}

          {errorMsg && <div className="mt-5 p-3.5 rounded-xl bg-rose-50 border border-rose-200 text-sm text-rose-700">{errorMsg}</div>}
          {successMsg && <div className="mt-5 p-3.5 rounded-xl bg-emerald-50 border border-emerald-200 text-sm text-emerald-700 font-medium">✓ {successMsg}</div>}
        </section>

        {infoModal && (
          <section className="bg-white rounded-3xl border border-slate-200 p-6 space-y-2">
            <div className="flex items-center justify-between">
              <h3 className="text-base font-bold capitalize">{infoModal}</h3>
              <button type="button" onClick={() => setInfoModal(null)} className="text-xs font-bold text-slate-500">Close ✕</button>
            </div>
            <p className="text-xs text-slate-600">
              {infoModal === "privacy" ? "PDFStudio processes all files 100% locally in your browser with zero server uploads." : infoModal === "terms" ? "Provided free of charge on an as-is basis. Always keep backups of original documents." : "Contact support@pdfstudio.tools for inquiries."}
            </p>
          </section>
        )}
      </main>

      <footer className="border-t border-slate-200 bg-white mt-12">
        <div className="max-w-6xl mx-auto px-4 sm:px-8 py-6 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-slate-500">
          <p>PDFStudio • 10 Free Browser-Based PDF Tools</p>
          <div className="flex items-center gap-4">
            <button type="button" onClick={() => setInfoModal("privacy")} className="hover:text-slate-900">Privacy Policy</button>
            <button type="button" onClick={() => setInfoModal("terms")} className="hover:text-slate-900">Terms of Use</button>
            <button type="button" onClick={() => setInfoModal("contact")} className="hover:text-slate-900">Contact</button>
          </div>
        </div>
      </footer>
    </div>
  );
}
