 // src/app/layout.tsx
import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { Sidebar } from "@/components/layout/Sidebar";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Kenyan Spirit POS",
  description: "Point of Sale System",
  icons: {
    icon: "/icon.svg",
  },
  manifest: "/manifest.json",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="h-full">
      <body className={`${inter.className} h-full bg-gray-50`}>
        <Sidebar />
        {/* THE IMPORTANT PART: lg:pl-72 adds space for the sidebar */}
        <main className="lg:pl-72 min-h-screen">
          {children}
        </main>
      </body>
    </html>
  );
}