import Link from "next/link";

export function Footer() {
  return (
    <footer className="border-t py-6 text-center text-sm text-gray-600">
      <div className="mb-2">
        <Link href="https://instagram.com/admit.app" target="_blank">Instagram</Link>{" | "}
        <Link href="https://tiktok.com/@admit.app" target="_blank">TikTok</Link>{" | "}
        <Link href="https://t.me/AdmitApp" target="_blank">Telegram</Link>{" | "}
        <Link href="mailto:hello@admitapp.org">Email</Link>
      </div>
      <div>
        <Link href="/privacy-policy">Privacy Policy</Link>{" | "}
        <Link href="/terms-of-use">Terms of Use</Link>
      </div>
      <p className="mt-2">&copy; 2025 AdmitApp. All rights reserved.</p>
    </footer>
  );
}
