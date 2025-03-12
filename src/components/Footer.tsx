import Link from "next/link";
import { FaInstagram, FaTelegram } from "react-icons/fa6";
import { FaTiktok } from "react-icons/fa";
import { MdEmail } from "react-icons/md";

export function Footer() {
  return (
    <footer className="border-t">
      <div className="container mx-auto px-4 py-6">
        <div className="flex flex-col items-center justify-center space-y-4">
          <div className="flex items-center space-x-4">
            <Link
              href="https://instagram.com/admit.app"
              target="_blank"
              className="text-gray-600 hover:text-gray-900"
            >
              <FaInstagram className="w-5 h-5" />
            </Link>
            <Link
              href="https://tiktok.com/@admit.app"
              target="_blank"
              className="text-gray-600 hover:text-gray-900"
            >
              <FaTiktok className="w-5 h-5" />
            </Link>
            <Link
              href="https://t.me/AdmitApp"
              target="_blank"
              className="text-gray-600 hover:text-gray-900"
            >
              <FaTelegram className="w-5 h-5" />
            </Link>
            <Link
              href="mailto:hello@admitapp.org"
              className="text-gray-600 hover:text-gray-900"
            >
              <MdEmail className="w-5 h-5" />
            </Link>
          </div>
          <div className="text-sm text-gray-600">
            ©2025 AdmitApp. All rights reserved |{" "}
            <Link href="/privacy-policy" className="hover:text-gray-900">
              Privacy Policy
            </Link>{" "}
            |{" "}
            <Link href="/terms-of-use" className="hover:text-gray-900">
              Terms of Use
            </Link>
          </div>
        </div>
      </div>
    </footer>
  );
}
