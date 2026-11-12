"use client";

import { useState, useRef } from "react";
import { PDFDocument, degrees } from "pdf-lib";

type ToolId = "merge" | "images" | "split" | "rotate";

interface ToolConfig {
  id: ToolId;
  title: string;
  tagline: string;
  badge: string;
  accent: string;
  accept: string;
  multiple: boolean;
  actionLabel: string;
}

const TOOLS: ToolConfig[] = [
  {
    id: "merge",
    title: "Merge PDF",
    tagline: "Combine multiple PDF documents into one ordered file in seconds.",
    badge: "Most Popular",
    accent: "bg-rose-500",
    accept: "application/pdf,.pdf",
    multiple: true,
    actionLabel: "Merge & Download PDF",
  },
  {
    id: "images",
    title: "JPG / PNG to PDF",
    tagline: "Turn photos, scans, and screenshots into a single clean PDF.",
    badge: "Instant",
    accent: "bg-amber-500",
    accept: "image/jpeg,image/png,.jpg,.jpeg,.png",
    multiple: true,
    actionLabel: "Convert Images to PDF",
  },
  {
    id: "split",
    title: "Extract PDF Pages",
    tagline: "Pull specific pages or page ranges out of a large PDF document.",
    badge: "Precision",
    accent: "bg-indigo-500",
    accept: "application/pdf,.pdf",
    multiple: false,
    actionLabel: "Extract & Download PDF",
  },
  {
    id: "rotate",
    title: "Rotate PDF",
    tagline: "Fix upside-down or sideways scans permanently across all pages.",
    badge: "Quick Fix",
    accent: "bg-emerald-500",
    accept: "application/pdf,.pdf",
    multiple: false,
    actionLabel: "Rotate & Download PDF",
  },
];

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
}

export default function PdfStudioHome() {
  const [activeToolId, setActiveToolId] = useState<ToolId>("merge");
  const [files, setFiles] = useState<File[]>([]);
  const [pageCount, setPageCount] = useState<number | null>(null);
  const [pageRange, setPageRange] = useState("1");
  const [rotationAngle, setRotationAngle] = useState<90 | 180 | 270>(90);
  const [isDragging, setIsDragging] = useState(false);
  const [processing, setProcessing] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");
  const [successMsg, setSuccessMsg] = useState("");

  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const activeTool = TOOLS.find((t) => t.id === activeToolId) || TOOLS[0];

  const switchTool = (id: ToolId) => {
    setActiveToolId(id);
    setFiles([]);
    setPageCount(null);
    setPageRange("1");
    setErrorMsg("");
    setSuccessMsg("");
  };

  const inspectSinglePdf = async (file: File) => {
    try {
      const buffer = await file.arrayBuffer();
      const pdf = await PDFDocument.load(buffer, { ignoreEncryption: true });
      const total = pdf.getPageCount();
      setPageCount(total);
      setPageRange(total > 1 ? `1-${Math.min(2, total)}` : "1");
    } catch {
      setPageCount(null);
      setErrorMsg("Could not read PDF page count. Check that the file isn't password-locked.");
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
      setErrorMsg("Please select valid PDF (.pdf) files.");
      return;
    }

    if (activeTool.multiple) {
      setFiles((prev) => [...prev, ...validPdfs]);
    } else {
      const single = validPdfs[0];
      setFiles([single]);
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
    if (updated.length === 0) setPageCount(null);
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

  const triggerDownload = (bytes: Uint8Array, filename: string) => {
    const blob = new Blob([bytes as unknown as BlobPart], {
      type: "application/pdf",
    });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const handleProcess = async () => {
    if (files.length === 0) return;
    setProcessing(true);
    setErrorMsg("");
    setSuccessMsg("");

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
        triggerDownload(outBytes, "merged-document.pdf");
        setSuccessMsg(`Merged ${files.length} PDFs into merged-document.pdf!`);
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
        triggerDownload(outBytes, "images-converted.pdf");
        setSuccessMsg(`Converted ${files.length} image(s) into images-converted.pdf!`);
      } else if (activeTool.id === "split") {
        const buf = await files[0].arrayBuffer();
        const srcDoc = await PDFDocument.load(buf, { ignoreEncryption: true });
        const total = srcDoc.getPageCount();
        const selectedIndices = parsePageSelection(pageRange, total);

        const newPdf = await PDFDocument.create();
        const copied = await newPdf.copyPages(srcDoc, selectedIndices);
        copied.forEach((p) => newPdf.addPage(p));

        const outBytes = await newPdf.save();
        triggerDownload(outBytes, `extracted-${files[0].name}`);
        setSuccessMsg(`Extracted ${selectedIndices.length} page(s) successfully!`);
      } else if (activeTool.id === "rotate") {
        const buf = await files[0].arrayBuffer();
        const pdfDoc = await PDFDocument.load(buf, { ignoreEncryption: true });
        const pages = pdfDoc.getPages();
        pages.forEach((p) => {
          const current = p.getRotation().angle;
          p.setRotation(degrees((current + rotationAngle) % 360));
        });
        const outBytes = await pdfDoc.save();
        triggerDownload(outBytes, `rotated-${files[0].name}`);
        setSuccessMsg(`Rotated all ${pages.length} page(s) by ${rotationAngle}°!`);
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to process file.";
      setErrorMsg(msg);
    } finally {
      setProcessing(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 flex flex-col">
      <header className="bg-white border-b border-slate-200 sticky top-0 z-20">
        <div className="max-w-6xl mx-auto px-4 sm:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="h-9 w-9 rounded-xl bg-rose-600 text-white font-extrabold flex items-center justify-center shadow-sm">
              PDF
            </div>
            <span className="font-bold text-xl tracking-tight text-slate-900">
              PDF<span className="text-rose-600">Studio</span>
            </span>
          </div>

          <div className="flex items-center gap-3 text-xs font-medium text-slate-600">
            <span className="hidden sm:inline-flex items-center gap-1.5 rounded-full bg-emerald-50 border border-emerald-200 px-3 py-1 text-emerald-700">
              ● 100% Private • Files Never Leave Your Browser
            </span>
          </div>
        </div>
      </header>

      <main className="flex-1 max-w-5xl w-full mx-auto px-4 sm:px-8 py-10 space-y-8">
        <section className="text-center max-w-2xl mx-auto">
          <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-slate-900">
            Every PDF tool you need,{" "}
            <span className="text-rose-600">instant & free.</span>
          </h1>
          <p className="mt-3 text-sm sm:text-base text-slate-600">
            Merge files, convert images to PDF, extract pages, or rotate scans right
            inside your browser. No sign-up, no watermarks, and zero server uploads.
          </p>
        </section>

        <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {TOOLS.map((tool) => {
            const isSelected = tool.id === activeToolId;
            return (
              <button
                key={tool.id}
                type="button"
                onClick={() => switchTool(tool.id)}
                className={`text-left p-5 rounded-2xl border transition-all ${
                  isSelected
                    ? "bg-white border-rose-500 ring-2 ring-rose-500/20 shadow-md"
                    : "bg-white border-slate-200 hover:border-slate-300 hover:shadow-sm"
                }`}
              >
                <div className="flex items-center justify-between mb-3">
                  <span
                    className={`h-8 w-8 rounded-lg ${tool.accent} text-white text-xs font-bold flex items-center justify-center`}
                  >
                    {tool.id.slice(0, 3).toUpperCase()}
                  </span>
                  <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full bg-slate-100 text-slate-600">
                    {tool.badge}
                  </span>
                </div>
                <h2 className="font-bold text-slate-900 text-base">{tool.title}</h2>
                <p className="mt-1 text-xs text-slate-500 leading-relaxed">
                  {tool.tagline}
                </p>
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
              Processed locally on your device • Instant download
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

          {files.length > 0 && (
            <div className="mt-6">
              <button
                type="button"
                onClick={handleProcess}
                disabled={processing}
                className="w-full sm:w-auto px-8 py-3.5 bg-rose-600 hover:bg-rose-700 text-white font-bold text-sm rounded-xl shadow-sm transition disabled:opacity-50"
              >
                {processing ? "Processing in Browser..." : activeTool.actionLabel}
              </button>
            </div>
          )}
        </section>
      </main>

      <footer className="border-t border-slate-200 bg-white mt-12">
        <div className="max-w-6xl mx-auto px-4 sm:px-8 py-6 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-slate-500">
          <p>PDFStudio • Free Browser-Based Document Tools</p>
          <p>Zero Server Uploads • Powered Locally in Your Browser</p>
        </div>
      </footer>
    </div>
  );
}
