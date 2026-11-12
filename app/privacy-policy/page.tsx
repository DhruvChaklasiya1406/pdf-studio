import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Privacy Policy | PDFStudio",
  description: "Learn how PDFStudio processes PDF and image files 100% locally in your browser without server uploads.",
};

export default function PrivacyPolicyPage() {
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
            <h1 className="text-3xl font-extrabold text-slate-900">Privacy Policy</h1>
            <p className="text-xs text-slate-400 mt-1">Last updated: November 2026</p>
          </div>

          <section className="space-y-2 text-sm text-slate-600 leading-relaxed">
            <h2 className="text-base font-bold text-slate-900">1. Zero-Upload File Processing</h2>
            <p>
              PDFStudio processes all PDF documents and images directly inside your web browser
              using client-side JavaScript. Your files are never uploaded to, stored on, or
              inspected by our servers.
            </p>
          </section>

          <section className="space-y-2 text-sm text-slate-600 leading-relaxed">
            <h2 className="text-base font-bold text-slate-900">2. Personal Information</h2>
            <p>
              We do not require account registration, names, or email addresses to use any PDF
              conversion, merging, splitting, or rotation tool on this website.
            </p>
          </section>

          <section className="space-y-2 text-sm text-slate-600 leading-relaxed">
            <h2 className="text-base font-bold text-slate-900">3. Advertising & Cookies</h2>
            <p>
              To keep PDFStudio free, we may display third-party advertisements (such as Google
              AdSense). Third-party vendors, including Google, use cookies to serve ads based on
              a user&apos;s prior visits to this or other websites. You may opt out of personalized
              advertising by visiting Google&apos;s Ads Settings.
            </p>
          </section>

          <section className="space-y-2 text-sm text-slate-600 leading-relaxed">
            <h2 className="text-base font-bold text-slate-900">4. Contact</h2>
            <p>
              If you have privacy questions, reach us anytime via our{" "}
              <Link href="/contact" className="text-rose-600 font-semibold hover:underline">
                Contact page
              </Link>.
            </p>
          </section>
        </div>
      </main>
    </div>
  );
}
