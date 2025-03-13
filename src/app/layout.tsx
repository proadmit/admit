import { ClerkProvider } from "@clerk/nextjs";
import { Toaster } from "react-hot-toast";
import { Inter } from "next/font/google";
import { QueryProvider } from "@/providers/query-provider";
import "./globals.css";

const inter = Inter({ subsets: ["latin"] });

export const metadata = {
  title: "Admit App - Dashboard",
  description: "Your AI-powered college admission companion",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <ClerkProvider>
      <html lang="en">
        <body className={inter.className}>
          <QueryProvider>
            {children}
            <Toaster position="top-center" />
          </QueryProvider>
        </body>
      </html>
    </ClerkProvider>
  );
}
