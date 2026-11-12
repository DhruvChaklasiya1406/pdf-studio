import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Terms of Use | PDFStudio",
  description: "Terms and conditions for using PDFStudio browser-based document utilities.",
};

export default function TermsPage() {
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
            <h1 className="text-3xl font-extrabold text-slate-900">Terms of Use</h1>
            <p className="text-xs text-slate-400 mt-1">Last updated: November 2026</p>
          </div>

          <section className="space-y-2 text-sm text-slate-600 leading-relaxed">
            <h2 className="text-base font-bold text-slate-900">1. Acceptable Use</h2>
            <p>
              PDFStudio provides free browser-based tools to merge, split, rotate, and convert
              PDF and image files for personal, educational, and commercial workflows. You agree
              to process only files that you own or have legal permission to modify.
            </p>
          </section>

          <section className="space-y-2 text-sm text-slate-600 leading-relaxed">
            <h2 className="text-base font-bold text-slate-900">2. Disclaimer of Warranties</h2>
            <p>
              All tools are provided &ldquo;as is&rdquo; without warranties of any kind. Always keep
              a backup copy of important original documents before modifying or extracting pages.
            </p>
          </section>

          <section className="space-y-2 text-sm text-slate-600 leading-relaxed">
            <h2 className="text-base font-bold text-slate-900">3. Changes to Service</h2>
            <p>
              We may add, update, or improve tools and these terms at any time to enhance browser
              performance and usability.
            </p>
          </section>
        </div>
      </main>
    </div>
  );
}
