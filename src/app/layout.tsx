 // src/app/layout.tsx
import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { OrganizationProvider } from "@/lib/context/OrganizationContext";
import { RoleProvider } from "@/lib/hooks/useRole";

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
          <RoleProvider>
            {children}
          </RoleProvider>
        </OrganizationProvider>
      </body>
    </html>
  );
}