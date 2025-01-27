"use client";

import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import Image from "next/image";

export function AdmitLogo() {
  return (
    <div className="flex items-center gap-2">
      <Avatar className="h-10 w-10">
        <AvatarImage
          src="/assets/@admit.png"
          alt="ADMIT Logo"
          className="object-cover"
        />
        <AvatarFallback className="bg-primary/10">
          <span className="text-lg">A</span>
        </AvatarFallback>
      </Avatar>
      <span className="text-2xl font-semibold">Admit</span>
    </div>
  );
}
