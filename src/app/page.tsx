
'use client';

import Image from "next/image";

export default function Page() {
  return (
    <div className="min-h-screen bg-white">
      <div className="container mx-auto p-10">
        {/* Header with Logo */}
        <div className="flex items-center justify-between mt-10 mb-20">
          <Image src="/admit.png" alt="Admit Logo" width={160} height={40} />
        </div>
        {/* Rest of the homepage content can go here */}
      </div>
    </div>
  );
}
