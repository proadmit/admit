"use client";

import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { RiMenu4Line } from "react-icons/ri";
import { HiOutlineDocumentText } from "react-icons/hi";
import { MdOutlineSportsBasketball } from "react-icons/md";
import { AiOutlineMail } from "react-icons/ai";
import { RiFileTextLine, RiDashboardLine } from "react-icons/ri";
import { BiBuildingHouse } from "react-icons/bi";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";

const links = [
  {
    href: "/dashboard",
    label: "Dashboard",
    icon: RiDashboardLine,
  },
  {
    href: "/dashboard/personal-statement",
    label: "Personal Statement",
    icon: HiOutlineDocumentText,
  },
  {
    href: "/dashboard/supplemental-essays",
    label: "Supplemental Essays",
    icon: RiFileTextLine,
  },
  {
    href: "/dashboard/recommendation-letters",
    label: "Recommendation Letters",
    icon: AiOutlineMail,
  },
  {
    href: "/dashboard/extracurricular",
    label: "Extracurricular",
    icon: MdOutlineSportsBasketball,
  },
  {
    href: "/dashboard/college-list",
    label: "College List",
    icon: BiBuildingHouse,
  },
];

export function MobileNav() {
  const pathname = usePathname();

  return (
    <Sheet>
      <SheetTrigger asChild>
        <Button variant="ghost" size="icon" className="md:hidden">
          <RiMenu4Line className="h-5 w-5" />
          <span className="sr-only">Toggle menu</span>
        </Button>
      </SheetTrigger>
      <SheetContent side="left" className="w-[300px] sm:w-[400px]">
        <Link href="/" className="flex items-center">
          <span className="font-bold">Admituz</span>
        </Link>
        <nav className="mt-8 flex flex-col space-y-3">
          {links.map((link) => {
            const Icon = link.icon;
            return (
              <Link
                key={link.href}
                href={link.href}
                className={cn(
                  "flex items-center gap-2 transition-colors hover:text-foreground/80",
                  pathname === link.href
                    ? "text-foreground"
                    : "text-foreground/60"
                )}
              >
                <Icon className="h-5 w-5" />
                {link.label}
              </Link>
            );
          })}
        </nav>
      </SheetContent>
    </Sheet>
  );
}
