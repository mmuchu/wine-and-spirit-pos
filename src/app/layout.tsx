 // src/app/layout.tsx
import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { Sidebar } from "@/components/layout/Sidebar";
import { OrganizationProvider } from "@/lib/context/OrganizationContext";

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
      <body className={`${inter.className} bg-gray-100`}>
        <OrganizationProvider>
          <div className="flex min-h-screen">
            {/* Sidebar is fixed on the left */}
            <Sidebar />
            
            {/* Main Content Area - pushes right by width of sidebar (w-72) */}
            <main className="flex-1 lg:ml-72">
              {children}
            </main>
          </div>
        </OrganizationProvider>
      </body>
    </html>
  );
}