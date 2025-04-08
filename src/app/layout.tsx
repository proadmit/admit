import { ClerkProvider } from "@clerk/nextjs";
import { Toaster } from "react-hot-toast";
import { Toaster } from "@/components/ui/toast/toaster";
import Footer from "@/components/Footer";
import { Inter } from "next/font/google";
import { QueryProvider } from "@/providers/query-provider";
import "./globals.css";

const inter = Inter({ subsets: ["latin"] });

export const metadata = {
  title: "AdmitApp - Dashboard",
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
          <Footer />
        </body>
      </html>
    </ClerkProvider>
  );
}
