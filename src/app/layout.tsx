import type { Metadata } from "next";
import "./globals.css";
import { QueryProvider } from "@/providers/query-provider";
import { Toaster } from "@/components/ui/sonner";
import { NavHeader } from "@/components/nav-header";
import { RouteProgress } from "@/components/route-progress";
import { BackToTop } from "@/components/back-to-top";
import { Footer } from "@/components/footer";
import { Manrope, IBM_Plex_Mono } from "next/font/google";

export const metadata: Metadata = {
  title: "AI Travel Planner",
  description: "Generate personalized travel itineraries with AI",
};

const fontSans = Manrope({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  display: "swap",
  variable: "--font-geist-sans",
});

const fontMono = IBM_Plex_Mono({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  display: "swap",
  variable: "--font-geist-mono",
});

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={`${fontSans.variable} ${fontMono.variable}`}>
      <body suppressHydrationWarning className="antialiased">
        <QueryProvider>
          <RouteProgress />
          <NavHeader />
          {children}
          <Footer />
          <BackToTop />
        </QueryProvider>
        <Toaster />
      </body>
    </html>
  );
}
