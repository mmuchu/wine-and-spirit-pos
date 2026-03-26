import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { OrganizationProvider } from "@/lib/context/OrganizationContext";
import { Sidebar } from "@/components/layout/Sidebar";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Kenyan Spirit POS",
  description: "Point of Sale System",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className={inter.className}>
        <OrganizationProvider>
          <Sidebar />
          <main className="ml-72 min-h-screen bg-gray-50">
            {children}
          </main>
        </OrganizationProvider>
      </body>
    </html>
  );
}