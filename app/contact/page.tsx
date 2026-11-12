import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Contact & Support | PDFStudio",
  description: "Get in touch with the PDFStudio team for feedback, bug reports, or new tool requests.",
};

export default function ContactPage() {
  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 flex flex-col">
      <header className="bg-white border-b border-slate-200">
        <div className="max-w-4xl mx-auto px-4 sm:px-8 h-16 flex items-center justify-between">
          <Link href="/" className="font-bold text-xl tracking-tight text-slate-900">
            PDF<span className="text-rose-600">Studio</span>
          </Link>
          <Link href="/" className="text-xs font-semibold text-slate-600 hover:text-rose-600">
            ← Back to PDF Tools
          </Link>
        </div>
      </header>

      <main className="flex-1 max-w-4xl w-full mx-auto px-4 sm:px-8 py-12">
        <div className="bg-white rounded-3xl border border-slate-200 p-6 sm:p-10 space-y-6">
          <div>
            <h1 className="text-3xl font-extrabold text-slate-900">Contact Us</h1>
            <p className="text-sm text-slate-600 mt-2">
              Have a feature request, browser compatibility report, or partnership inquiry? We
              usually reply within 1–2 business days.
            </p>
          </div>

          <div className="p-5 rounded-2xl bg-slate-50 border border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <p className="text-xs font-bold uppercase tracking-wider text-slate-500">
                Support Email
              </p>
              <p className="text-base font-bold text-slate-900 mt-0.5">
                support@pdfstudio.tools
              </p>
            </div>
            <a
              href="mailto:support@pdfstudio.tools?subject=PDFStudio%20Inquiry"
              className="inline-flex items-center justify-center px-5 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold transition"
            >
              Send Email →
            </a>
          </div>
        </div>
      </main>
    </div>
  );
}
