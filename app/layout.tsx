import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "QueueCare — Hospital Queue & Appointment Prioritization System",
  description: "Intelligent Hospital & Clinic Queue Management System",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="h-full antialiased">
      <body className="min-h-full flex flex-col font-sans bg-slate-50 text-slate-800">
        {children}
      </body>
    </html>
  );
}
