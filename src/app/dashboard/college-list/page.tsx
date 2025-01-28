"use client";

import { useSubscription } from "@/hooks/use-subscription";
import { CollegeListForm } from "@/components/college-list/form";

export default function CollegeListPage() {
  const { isPremium } = useSubscription();

  return (
    <div className="max-w-6xl mx-auto px-4 py-8">
      <CollegeListForm isPremium={isPremium} />
    </div>
  );
}
