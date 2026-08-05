import type { Metadata } from "next";
import { Fraunces, Plus_Jakarta_Sans, Cairo } from "next/font/google";
import "./globals.css";
import { LanguageProvider } from "@/lib/i18n";

const fraunces = Fraunces({
  subsets: ["latin"],
  variable: "--font-display",
  weight: ["400", "600", "700", "800", "900"],
});

const plusJakartaSans = Plus_Jakarta_Sans({
  subsets: ["latin"],
  variable: "--font-body",
  weight: ["300", "400", "500", "600", "700", "800"],
});

const cairo = Cairo({
  subsets: ["arabic", "latin"],
  variable: "--font-arabic",
  weight: ["300", "400", "500", "600", "700", "800"],
});

export const metadata: Metadata = {
  title: "Al-Nuzha Technician — AC & Refrigerator Services Dubai",
  description: "Professional AC and refrigerator repair, maintenance and installation in Dubai. Same-day service, certified technicians, transparent pricing.",
  icons: {
    icon: "/favicon.ico",
    apple: "/apple-icon.png",
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        {/* Prevent RTL flash by reading localStorage before React hydrates */}
        <script dangerouslySetInnerHTML={{ __html: `(function(){var l=localStorage.getItem('alnuzha_lang');if(l==='ar'){document.documentElement.dir='rtl';document.documentElement.lang='ar';}})();` }} />
      </head>
      <body className={`${fraunces.variable} ${plusJakartaSans.variable} ${cairo.variable}`}>
        <LanguageProvider>{children}</LanguageProvider>
      </body>
    </html>
  );
}
