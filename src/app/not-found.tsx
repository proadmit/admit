import Link from "next/link";

export default function NotFound() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center">
      <h1 className="text-4xl font-bold">404 - Page Not Found</h1>
      <p className="mt-4 text-gray-600">The page you're looking for doesn't exist.</p>
      <Link 
        href="/"
        className="mt-6 rounded-full bg-blue-600 px-6 py-2 text-white hover:bg-blue-700"
      >
        Go Home
      </Link>
    </div>
  );
} 