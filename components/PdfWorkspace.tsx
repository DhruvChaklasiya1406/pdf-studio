"use client";

import { useState, useRef } from "react";
import Link from "next/link";
import { PDFDocument, degrees } from "pdf-lib";

export type ToolId = "merge" | "images" | "pdf-to-img" | "split" | "rotate";

interface ToolConfig {
  id: ToolId;
  href: string;
  shortTitle: string;
  title: string;
  tagline: string;
  badge: string;
  accent: string;
  accept: string;
  multiple: boolean;
  actionLabel: string;
  defaultFileName: string;
  faqs: { q: string; a: string }[];
}

interface RenderedPageImage {
  pageNum: number;
  dataUrl: string;
  filename: string;
}

export const TOOLS: Record<ToolId, ToolConfig> = {
  merge: {
    id: "merge",
    href: "/merge-pdf",
    shortTitle: "Merge PDF",
    title: "Merge PDF Files Online",
    tagline: "Combine multiple PDF documents into a single ordered PDF in seconds.",
    badge: "Most Popular",
    accent: "bg-rose-500",
    accept: "application/pdf,.pdf",
    multiple: true,
    actionLabel: "Merge & Download PDF",
    defaultFileName: "merged-document",
    faqs: [
      {
        q: "Are my PDFs uploaded to a server when merging?",
        a: "No. PDFStudio merges your documents directly inside your web browser using local memory, so sensitive contracts and forms never leave your device.",
      },
      {
        q: "Can I change the order of files before merging?",
        a: "Yes. Use the up and down arrows next to each file in the queue to arrange the exact page sequence before downloading.",
      },
    ],
  },
  images: {
    id: "images",
    href: "/jpg-to-pdf",
    shortTitle: "JPG / PNG to PDF",
    title: "Convert JPG & PNG Images to PDF",
    tagline: "Turn photos, receipts, and screenshots into one clean multi-page PDF.",
    badge: "Instant",
    accent: "bg-amber-500",
    accept: "image/jpeg,image/png,.jpg,.jpeg,.png",
    multiple: true,
    actionLabel: "Convert Images to PDF",
    defaultFileName: "images-converted",
    faqs: [
      {
        q: "Can I combine JPG and PNG files into the same PDF?",
        a: "Yes. Select any mix of JPG and PNG images, arrange them in your preferred order, and export them as a single PDF file.",
      },
      {
        q: "Does converting images to PDF reduce photo sharpness?",
        a: "Each PDF page matches the exact pixel dimensions of your original image so text, receipts, and scans stay crisp.",
      },
    ],
  },
  "pdf-to-img": {
    id: "pdf-to-img",
    href: "/pdf-to-jpg",
    shortTitle: "PDF to JPG / PNG",
    title: "Convert PDF Pages to JPG or PNG",
    tagline: "Render every PDF page as a high-resolution image and download individually or as a ZIP.",
    badge: "New",
    accent: "bg-sky-500",
    accept: "application/pdf,.pdf",
    multiple: false,
    actionLabel: "Convert PDF to Images",
    defaultFileName: "pdf-page",
    faqs: [
      {
        q: "Should I choose JPG or PNG format?",
        a: "Choose JPG for smaller file sizes when sharing documents by email or messaging apps, and PNG for sharp diagrams, slides, and screenshots.",
      },
      {
        q: "How do I download all pages at once?",
        a: "After conversion finishes, click Download All (.ZIP) to save every converted page in a single archive folder.",
      },
    ],
  },
  split: {
    id: "split",
    href: "/split-pdf",
    shortTitle: "Extract Pages",
    title: "Extract & Split PDF Pages",
    tagline: "Pull specific pages or custom page ranges out of any large PDF document.",
    badge: "Precision",
    accent: "bg-indigo-500",
    accept: "application/pdf,.pdf",
    multiple: false,
    actionLabel: "Extract & Download PDF",
    defaultFileName: "extracted-pages",
    faqs: [
      {
        q: "How do I extract non-consecutive pages?",
        a: "Separate single page numbers and ranges with commas—for example, entering 1, 4-6, 9 creates a new PDF containing only those pages.",
      },
      {
        q: "Does splitting modify my original PDF file?",
        a: "No. Your original file stays untouched on your device while a new PDF with your selected pages downloads automatically.",
      },
    ],
  },
  rotate: {
    id: "rotate",
    href: "/rotate-pdf",
    shortTitle: "Rotate PDF",
    title: "Rotate PDF Pages Permanently",
    tagline: "Fix upside-down or sideways scans by 90°, 180°, or 270° across all pages.",
    badge: "Quick Fix",
    accent: "bg-emerald-500",
    accept: "application/pdf,.pdf",
    multiple: false,
    actionLabel: "Rotate & Download PDF",
    defaultFileName: "rotated-document",
    faqs: [
      {
        q: "Will the rotation stay saved when I open the PDF later?",
        a: "Yes. Unlike temporary viewer rotation in a browser, PDFStudio writes the new orientation directly into the downloaded PDF file.",
      },
      {
        q: "Is there any page count limit?",
        a: "No. Because your own browser processes the file locally, you can rotate multi-page documents without artificial server limits.",
      },
    ],
  },
};

const TOOL_LIST: ToolConfig[] = [
  TOOLS.merge,
  TOOLS.images,
  TOOLS["pdf-to-img"],
  TOOLS.split,
  TOOLS.rotate,
];

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
}

export default function PdfWorkspace({
  initialTool = "merge",
  isHome = false,
}: {
  initialTool?: ToolId;
  isHome?: boolean;
}) {
  const activeTool = TOOLS[initialTool] || TOOLS.merge;

  const [files, setFiles] = useState<File[]>([]);
  const [pageCount, setPageCount] = useState<number | null>(null);
  const [pageRange, setPageRange] = useState("1");
  const [rotationAngle, setRotationAngle] = useState<90 | 180 | 270>(90);
  const [imageFormat, setImageFormat] = useState<"jpg" | "png">("jpg");
  const [outputName, setOutputName] = useState(activeTool.defaultFileName);
  const [convertedImages, setConvertedImages] = useState<RenderedPageImage[]>([]);
  const [isDragging, setIsDragging] = useState(false);
  const [processing, setProcessing] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");
  const [successMsg, setSuccessMsg] = useState("");

  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const inspectSinglePdf = async (file: File) => {
    try {
      const buffer = await file.arrayBuffer();
      const pdf = await PDFDocument.load(buffer, { ignoreEncryption: true });
      const total = pdf.getPageCount();
      setPageCount(total);
      setPageRange(total > 1 ? `1-${Math.min(2, total)}` : "1");
    } catch {
      setPageCount(null);
      setErrorMsg("Could not read PDF page count. Ensure the file is not password-locked.");
    }
  };

  const handleIncomingFiles = async (incomingList: FileList | null) => {
    if (!incomingList || incomingList.length === 0) return;
    setErrorMsg("");
    setSuccessMsg("");
    setConvertedImages([]);

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
      setErrorMsg("Please select valid PDF (.pdf) files.");
      return;
    }

    if (activeTool.multiple) {
      setFiles((prev) => [...prev, ...validPdfs]);
    } else {
      const single = validPdfs[0];
      setFiles([single]);
      const baseTitle = single.name.replace(/\.pdf$/i, "");
      setOutputName(
        activeTool.id === "pdf-to-img"
          ? baseTitle
          : `${activeTool.id}-${baseTitle}`
      );
      await inspectSinglePdf(single);
    }
  };

  const moveFile = (index: number, direction: -1 | 1) => {
    const target = index + direction;
    if (target < 0 || target >= files.length) return;
    const updated = [...files];
    const [removed] = updated.splice(index, 1);
    updated.splice(target, 0, removed);
    setFiles(updated);
  };

  const removeFile = (index: number) => {
    const updated = files.filter((_, i) => i !== index);
    setFiles(updated);
    if (updated.length === 0) {
      setPageCount(null);
      setConvertedImages([]);
    }
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
          throw new Error(`Invalid range "${part}". Enter numbers between 1 and ${maxPages}.`);
        }
        for (let p = start; p <= end; p++) indices.add(p - 1);
      } else {
        const pageNum = parseInt(part, 10);
        if (isNaN(pageNum) || pageNum < 1 || pageNum > maxPages) {
          throw new Error(`Invalid page "${part}". Enter numbers between 1 and ${maxPages}.`);
        }
        indices.add(pageNum - 1);
      }
    }

    const result = Array.from(indices);
    if (result.length === 0) {
      throw new Error("Enter at least one page number to extract.");
    }
    return result;
  };

  const triggerBlobDownload = (blob: Blob, filename: string) => {
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const sanitizeBaseName = (raw: string, fallback: string) => {
    const cleaned = raw.trim().replace(/\.pdf$/i, "").replace(/[^a-zA-Z0-9-_ ]/g, "");
    return cleaned || fallback;
  };

  const handleProcess = async () => {
    if (files.length === 0) return;
    setProcessing(true);
    setErrorMsg("");
    setSuccessMsg("");
    setConvertedImages([]);

    const cleanName = sanitizeBaseName(outputName, activeTool.defaultFileName);

    try {
      if (activeTool.id === "merge") {
        if (files.length < 2) {
          throw new Error("Add at least 2 PDF files to merge them together.");
        }
        const mergedPdf = await PDFDocument.create();
        for (const file of files) {
          const buf = await file.arrayBuffer();
          const srcDoc = await PDFDocument.load(buf, { ignoreEncryption: true });
          const copied = await mergedPdf.copyPages(srcDoc, srcDoc.getPageIndices());
          copied.forEach((p) => mergedPdf.addPage(p));
        }
        const outBytes = await mergedPdf.save();
        const blob = new Blob([outBytes as unknown as BlobPart], { type: "application/pdf" });
        triggerBlobDownload(blob, `${cleanName}.pdf`);
        setSuccessMsg(`Merged ${files.length} PDFs into ${cleanName}.pdf!`);
      } else if (activeTool.id === "images") {
        const pdfDoc = await PDFDocument.create();
        for (const imgFile of files) {
          const buf = await imgFile.arrayBuffer();
          const embedded =
            imgFile.type === "image/png"
              ? await pdfDoc.embedPng(buf)
              : await pdfDoc.embedJpg(buf);
          const page = pdfDoc.addPage([embedded.width, embedded.height]);
          page.drawImage(embedded, {
            x: 0,
            y: 0,
            width: embedded.width,
            height: embedded.height,
          });
        }
        const outBytes = await pdfDoc.save();
        const blob = new Blob([outBytes as unknown as BlobPart], { type: "application/pdf" });
        triggerBlobDownload(blob, `${cleanName}.pdf`);
        setSuccessMsg(`Converted ${files.length} image(s) into ${cleanName}.pdf!`);
      } else if (activeTool.id === "pdf-to-img") {
        const pdfjsLib = await import("pdfjs-dist");
        pdfjsLib.GlobalWorkerOptions.workerSrc = `https://unpkg.com/pdfjs-dist@${pdfjsLib.version}/build/pdf.worker.min.mjs`;

        const buf = await files[0].arrayBuffer();
        const loadingTask = pdfjsLib.getDocument({ data: new Uint8Array(buf) });
        const pdf = await loadingTask.promise;

        const rendered: RenderedPageImage[] = [];
        const mime = imageFormat === "png" ? "image/png" : "image/jpeg";

        for (let pageNum = 1; pageNum <= pdf.numPages; pageNum++) {
          const page = await pdf.getPage(pageNum);
          const viewport = page.getViewport({ scale: 2 });
          const canvas = document.createElement("canvas");
          canvas.width = viewport.width;
          canvas.height = viewport.height;
          const context = canvas.getContext("2d");
          if (!context) {
            throw new Error("Could not initialize browser canvas.");
          }
          await page.render({
            canvasContext: context,
            canvas,
            viewport,
          } as Parameters<typeof page.render>[0]).promise;

          const dataUrl = canvas.toDataURL(mime, 0.92);
          rendered.push({
            pageNum,
            dataUrl,
            filename: `${cleanName}-page-${pageNum}.${imageFormat}`,
          });
        }

        setConvertedImages(rendered);
        setSuccessMsg(
          `Rendered ${rendered.length} page(s) as ${imageFormat.toUpperCase()}! Download individually or grab the ZIP below.`
        );
      } else if (activeTool.id === "split") {
        const buf = await files[0].arrayBuffer();
        const srcDoc = await PDFDocument.load(buf, { ignoreEncryption: true });
        const total = srcDoc.getPageCount();
        const selectedIndices = parsePageSelection(pageRange, total);

        const newPdf = await PDFDocument.create();
        const copied = await newPdf.copyPages(srcDoc, selectedIndices);
        copied.forEach((p) => newPdf.addPage(p));

        const outBytes = await newPdf.save();
        const blob = new Blob([outBytes as unknown as BlobPart], { type: "application/pdf" });
        triggerBlobDownload(blob, `${cleanName}.pdf`);
        setSuccessMsg(`Extracted ${selectedIndices.length} page(s) into ${cleanName}.pdf!`);
      } else if (activeTool.id === "rotate") {
        const buf = await files[0].arrayBuffer();
        const pdfDoc = await PDFDocument.load(buf, { ignoreEncryption: true });
        const pages = pdfDoc.getPages();
        pages.forEach((p) => {
          const current = p.getRotation().angle;
          p.setRotation(degrees((current + rotationAngle) % 360));
        });
        const outBytes = await pdfDoc.save();
        const blob = new Blob([outBytes as unknown as BlobPart], { type: "application/pdf" });
        triggerBlobDownload(blob, `${cleanName}.pdf`);
        setSuccessMsg(`Rotated ${pages.length} page(s) by ${rotationAngle}° into ${cleanName}.pdf!`);
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to process file.";
      setErrorMsg(msg);
    } finally {
      setProcessing(false);
    }
  };

  const handleDownloadZip = async () => {
    if (convertedImages.length === 0) return;
    const JSZip = (await import("jszip")).default;
    const zip = new JSZip();
    for (const img of convertedImages) {
      const base64 = img.dataUrl.split(",")[1];
      zip.file(img.filename, base64, { base64: true });
    }
    const zipBlob = await zip.generateAsync({ type: "blob" });
    const cleanName = sanitizeBaseName(outputName, activeTool.defaultFileName);
    triggerBlobDownload(zipBlob, `${cleanName}-${imageFormat}-pages.zip`);
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 flex flex-col">
      <header className="bg-white border-b border-slate-200 sticky top-0 z-20">
        <div className="max-w-6xl mx-auto px-4 sm:px-8 h-16 flex items-center justify-between gap-4">
          <Link href="/" className="flex items-center gap-2.5 shrink-0">
            <div className="h-9 w-9 rounded-xl bg-rose-600 text-white font-extrabold flex items-center justify-center shadow-sm">
              PDF
            </div>
            <span className="font-bold text-xl tracking-tight text-slate-900">
              PDF<span className="text-rose-600">Studio</span>
            </span>
          </Link>

          <nav className="hidden md:flex items-center gap-1">
            {TOOL_LIST.map((tool) => {
              const isCurrent = tool.id === activeTool.id && !isHome;
              return (
                <Link
                  key={tool.id}
                  href={tool.href}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition ${
                    isCurrent
                      ? "bg-rose-50 text-rose-700"
                      : "text-slate-600 hover:text-slate-900 hover:bg-slate-100"
                  }`}
                >
                  {tool.shortTitle}
                </Link>
              );
            })}
          </nav>

          <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 border border-emerald-200 px-3 py-1 text-[11px] font-semibold text-emerald-700 shrink-0">
            ● 100% Local & Private
          </span>
        </div>
      </header>

      <main className="flex-1 max-w-5xl w-full mx-auto px-4 sm:px-8 py-10 space-y-8">
        <section className="text-center max-w-2xl mx-auto">
          <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-slate-900">
            {isHome ? (
              <>
                Every PDF tool you need,{" "}
                <span className="text-rose-600">instant & free.</span>
              </>
            ) : (
              activeTool.title
            )}
          </h1>
          <p className="mt-3 text-sm sm:text-base text-slate-600">
            {isHome
              ? "Merge PDFs, convert JPG/PNG images, render PDF pages as images, or split and rotate documents directly in your browser with zero uploads."
              : activeTool.tagline}
          </p>
        </section>

        <section className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
          {TOOL_LIST.map((tool) => {
            const isSelected = tool.id === activeTool.id;
            return (
              <Link
                key={tool.id}
                href={tool.href}
                className={`text-left p-4 rounded-2xl border transition-all ${
                  isSelected
                    ? "bg-white border-rose-500 ring-2 ring-rose-500/20 shadow-md"
                    : "bg-white border-slate-200 hover:border-slate-300 hover:shadow-sm"
                }`}
              >
                <div className="flex items-center justify-between mb-2.5">
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
                <p className="mt-1 text-[11px] text-slate-500 line-clamp-2">
                  {tool.tagline}
                </p>
              </Link>
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
                  setConvertedImages([]);
                  setErrorMsg("");
                  setSuccessMsg("");
                }}
                className="text-xs font-semibold text-slate-500 hover:text-rose-600"
              >
                Clear files
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
              Files stay 100% on your device • Instant browser processing
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
                        onClick={() => removeFile(idx)}
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

          {files.length > 0 && activeTool.id === "pdf-to-img" && (
            <div className="mt-5 p-4 rounded-2xl bg-slate-50 border border-slate-200">
              <span className="block text-xs font-bold uppercase tracking-wide text-slate-700 mb-2">
                Output Image Format
              </span>
              <div className="flex gap-2">
                {(["jpg", "png"] as const).map((fmt) => (
                  <button
                    key={fmt}
                    type="button"
                    onClick={() => setImageFormat(fmt)}
                    className={`px-4 py-2 rounded-xl text-xs font-semibold uppercase border transition ${
                      imageFormat === fmt
                        ? "bg-slate-900 text-white border-slate-900"
                        : "bg-white text-slate-700 border-slate-300 hover:bg-slate-100"
                    }`}
                  >
                    {fmt}
                  </button>
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
                className="w-full sm:w-72 px-3.5 py-2 border border-slate-300 rounded-xl text-sm text-slate-900 bg-white focus:outline-none focus:ring-2 focus:ring-rose-500"
              />
              <p className="mt-1.5 text-xs text-slate-500">
                Separate single pages or ranges with commas (example: <code>1, 3-5</code>).
              </p>
            </div>
          )}

          {files.length > 0 && activeTool.id === "rotate" && (
            <div className="mt-5 p-4 rounded-2xl bg-slate-50 border border-slate-200">
              <span className="block text-xs font-bold uppercase tracking-wide text-slate-700 mb-2">
                Rotation Angle (Clockwise)
              </span>
              <div className="flex flex-wrap gap-2">
                {([90, 180, 270] as const).map((angle) => (
                  <button
                    key={angle}
                    type="button"
                    onClick={() => setRotationAngle(angle)}
                    className={`px-4 py-2 rounded-xl text-xs font-semibold border transition ${
                      rotationAngle === angle
                        ? "bg-slate-900 text-white border-slate-900"
                        : "bg-white text-slate-700 border-slate-300 hover:bg-slate-100"
                    }`}
                  >
                    Rotate {angle}°
                  </button>
                ))}
              </div>
            </div>
          )}

          {files.length > 0 && (
            <div className="mt-6 flex flex-col sm:flex-row sm:items-end gap-4">
              <div className="flex-1 max-w-xs">
                <label className="block text-[11px] font-bold uppercase tracking-wide text-slate-500 mb-1">
                  Output File Name
                </label>
                <div className="flex items-center rounded-xl border border-slate-300 bg-white overflow-hidden focus-within:ring-2 focus-within:ring-rose-500">
                  <input
                    type="text"
                    value={outputName}
                    onChange={(e) => setOutputName(e.target.value)}
                    className="w-full px-3 py-2.5 text-sm text-slate-900 focus:outline-none"
                  />
                  <span className="px-3 text-xs font-semibold text-slate-400 bg-slate-50 border-l border-slate-200 py-2.5">
                    {activeTool.id === "pdf-to-img" ? `.${imageFormat}` : ".pdf"}
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

          {convertedImages.length > 0 && (
            <div className="mt-8 pt-6 border-t border-slate-200 space-y-4">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <h3 className="text-base font-bold text-slate-900">
                  Converted Pages ({convertedImages.length})
                </h3>
                {convertedImages.length > 1 && (
                  <button
                    type="button"
                    onClick={handleDownloadZip}
                    className="px-4 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold transition"
                  >
                    Download All (.ZIP)
                  </button>
                )}
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
                {convertedImages.map((img) => (
                  <div
                    key={img.pageNum}
                    className="rounded-2xl border border-slate-200 bg-slate-50 p-3 flex flex-col justify-between"
                  >
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={img.dataUrl}
                      alt={`Page ${img.pageNum}`}
                      className="w-full h-48 object-contain bg-white rounded-xl border border-slate-100"
                    />
                    <div className="mt-3 flex items-center justify-between gap-2">
                      <span className="text-xs font-semibold text-slate-600">
                        Page {img.pageNum}
                      </span>
                      <a
                        href={img.dataUrl}
                        download={img.filename}
                        className="px-3 py-1.5 rounded-lg bg-rose-600 hover:bg-rose-700 text-white text-xs font-semibold transition"
                      >
                        Download {imageFormat.toUpperCase()}
                      </a>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </section>

        <section className="bg-white rounded-3xl border border-slate-200 p-6 sm:p-8 space-y-4">
          <h2 className="text-lg font-bold text-slate-900">
            Frequently Asked Questions
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {activeTool.faqs.map((item, i) => (
              <div key={i} className="p-4 rounded-2xl bg-slate-50 border border-slate-100">
                <h3 className="text-sm font-bold text-slate-900">{item.q}</h3>
                <p className="mt-1.5 text-xs text-slate-600 leading-relaxed">{item.a}</p>
              </div>
            ))}
          </div>
        </section>
      </main>

      <footer className="border-t border-slate-200 bg-white mt-12">
        <div className="max-w-6xl mx-auto px-4 sm:px-8 py-8 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-slate-500">
          <p>PDFStudio • Free Browser-Based Document Tools</p>
          <div className="flex flex-wrap items-center gap-4">
            {TOOL_LIST.map((t) => (
              <Link key={t.id} href={t.href} className="hover:text-slate-900">
                {t.shortTitle}
              </Link>
            ))}
          </div>
        </div>
      </footer>
    </div>
  );
}