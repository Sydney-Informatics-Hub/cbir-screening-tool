import type { Metadata } from "next";
import "./globals.css";
import { Header } from "@/components/Header";
import { Toaster } from "@/components/ui/sonner";
import { Providers } from "@/contexts/Providers";
import AnalyticsScript from "@/components/AnalyticsScript";

export const metadata: Metadata = {
  title: "CBI-R Online Screening Tool",
  description: "Cambridge Behavioural Inventory-Revised Online Screening Tool for Clinicians",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="min-h-screen bg-slate-50">
        <Providers>
          <Header />
          <main className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
            {children}
          </main>
          <Toaster />
        </Providers>
        <AnalyticsScript />
      </body>
    </html>
  );
}