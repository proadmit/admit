import { auth } from "@clerk/nextjs";
import { redirect } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { UniversityLogos } from "@/components/university-logos";
import Image from "next/image";
import { BsArrowRight } from "react-icons/bs";
import { HiOutlineDocumentText } from "react-icons/hi";
import { IoPersonOutline } from "react-icons/io5";
import { HiOutlineMail } from "react-icons/hi";
import { RiFileTextLine } from "react-icons/ri";

export default async function HomePage() {
  const { userId } = auth();

  // If user is logged in, redirect to dashboard
  if (userId) {
    redirect("/dashboard");
  }

  return (
    <div className="min-h-screen bg-white">
      <div className="container mx-auto p-10">
        {/* Header with Logo and Sign In */}
        <div className="flex items-center justify-between mb-12">
          <div className="flex items-center space-x-3">
            <Image
              src="/admit.png"
              alt="Admit Avatar"
              width={48}
              height={48}
              priority
              className="object-cover"
            />
            <span className="text-4xl text-black/30 font-bold">admit</span>
          </div>
          <Link
            href="/auth/sign-in"
            className="bg-gradient-to-r from-[#608aff] to-[#ba7dff] hover:opacity-90 text-white px-6 py-2 rounded-full"
          >
            Sign In
          </Link>
        </div>

        {/* Main Content */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Left Column - Text Content */}
          <div className="space-y-8">
            <h1 className="text-5xl font-bold leading-tight">
              Craft your College Application in{" "}
              <span className="bg-gradient-to-r from-[#608aff] to-[#ba7dff] text-transparent bg-clip-text">
                5 minutes
              </span>
            </h1>
            <ul className="space-y-2 text-gray-500 text-lg">
              <li>• No AI Detection. Authentic & Standout Application</li>
              <li>• Trained on +400 successful IVY League Applications</li>
            </ul>
            <Button
              asChild
              className="bg-gradient-to-r from-[#608aff] to-[#ba7dff] hover:opacity-90 text-white px-8 py-5 text-xl rounded-full"
            >
              <Link href="/auth/sign-up" className="flex items-center gap-2">
                Get Started <BsArrowRight className="h-5 w-5" />
              </Link>
            </Button>
          </div>

          {/* Right Column - Feature Grid */}
          <div className="relative w-full max-w-[600px] mx-auto">
            {/* Feature Cards Grid */}
            <div className="grid grid-cols-2 gap-6 relative">
              <div className="bg-white rounded-[32px] p-8 shadow-lg">
                <h3 className="text-[#00000047] text-xl font-semibold mb-4">
                  PERSONAL STATEMENT
                </h3>
                <HiOutlineDocumentText className="w-8 h-8 text-[#00000047]" />
              </div>
              <div className="bg-white rounded-[32px] p-8 shadow-lg">
                <h3 className="text-[#00000047] text-xl font-semibold mb-4">
                  EXTRACURRICULAR ACTIVITIES
                </h3>
                <IoPersonOutline className="w-8 h-8 text-[#00000047]" />
              </div>
              <div className="bg-white rounded-[32px] p-8 shadow-lg">
                <h3 className="text-[#00000047] text-xl font-semibold mb-4">
                  RECOMMENDATION LETTERS
                </h3>
                <HiOutlineMail className="w-8 h-8 text-[#00000047]" />
              </div>
              <div className="bg-white rounded-[32px] p-8 shadow-lg">
                <h3 className="text-[#00000047] text-xl font-semibold mb-4">
                  SUPPLEMENTAL ESSAYS
                </h3>
                <RiFileTextLine className="w-8 h-8 text-[#00000047]" />
              </div>

              {/* AI Generate Button - Centered Overlay */}
              <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 z-10">
                <div className="bg-gradient-to-r from-[#608aff] to-[#ba7dff] hover:opacity-90 text-white px-8 py-3 rounded-full text-base font-medium shadow-lg">
                  <Link
                    href="/auth/sign-up"
                    className="flex items-center gap-2"
                  >
                    AI GENERATE
                    <BsArrowRight className="h-5 w-5" />
                  </Link>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* University Logos Section */}
        <div className="mt-16">
          <UniversityLogos />
        </div>
      </div>
    </div>
  );
}
