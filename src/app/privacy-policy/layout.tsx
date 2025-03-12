import Link from "next/link";
import Image from "next/image";
import { Footer } from "@/components/Footer";

export default function PrivacyPolicyLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex flex-col min-h-screen">
      <nav className="border-b bg-white">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <Link href="/" className="flex items-center space-x-3">
              <Image
                src="/admit.png"
                alt="Admit Logo"
                width={120}
                height={120}
                className="object-cover"
              />
            </Link>
            <Link
              href="/auth/sign-in"
              className="bg-gradient-to-r from-[#608aff] to-[#ba7dff] hover:opacity-90 text-white px-6 py-2 rounded-full"
            >
              Sign In
            </Link>
          </div>
        </div>
      </nav>
      <div className="flex-grow bg-gray-50">
        <main>{children}</main>
      </div>
      <Footer />
    </div>
  );
}
