import type { Metadata } from "next";
import { cookies } from "next/headers";
import { Fraunces, Plus_Jakarta_Sans, Cairo } from "next/font/google";
import "./globals.css";
import { LanguageProvider } from "@/lib/i18n";
import { LANG_COOKIE, type Lang } from "@/lib/lang";

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
  title: "Al Nuzha Electrical Repairs — AC & Refrigerator Services Abu Dhabi",
  description: "Professional AC and refrigerator repair, maintenance and installation in Abu Dhabi. Same-day service, certified technicians, transparent pricing.",
  icons: {
    icon: "/favicon.ico",
    apple: "/apple-icon.png",
  },
};

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  // read the language cookie on the server so dir/lang are correct in the first paint
  const cookieLang = (await cookies()).get(LANG_COOKIE)?.value;
  const lang: Lang = cookieLang === "ar" ? "ar" : "en";

  return (
    <html lang={lang} dir={lang === "ar" ? "rtl" : "ltr"}>
      <body className={`${fraunces.variable} ${plusJakartaSans.variable} ${cairo.variable}`}>
        <LanguageProvider initialLang={lang}>{children}</LanguageProvider>
      </body>
    </html>
  );
}
