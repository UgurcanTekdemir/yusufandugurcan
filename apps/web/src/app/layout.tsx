import type { Metadata } from "next";
import "./globals.css";
import { QueryProvider } from "@/providers/query-provider";
import { Toaster } from "react-hot-toast";

export const metadata: Metadata = {
  title: "Yusuf and Dugurcan",
  description: "Next.js App",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>
        <QueryProvider>
          {children}
          <Toaster
            position="top-right"
            toastOptions={{
              style: {
                background: "#1f2937",
                color: "#f3f4f6",
                border: "1px solid #374151",
              },
              success: {
                iconTheme: {
                  primary: "#10b981",
                  secondary: "#f3f4f6",
                },
              },
              error: {
                iconTheme: {
                  primary: "#ef4444",
                  secondary: "#f3f4f6",
                },
              },
            }}
          />
        </QueryProvider>
      </body>
    </html>
  );
}
