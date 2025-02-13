import { useUser } from "@clerk/nextjs";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useSearchParams } from "next/navigation";
import { useEffect } from "react";

export function useSubscription() {
  const { user } = useUser();
  const searchParams = useSearchParams();
  const queryClient = useQueryClient();

  const { data: subscription, isLoading, refetch } = useQuery({
    queryKey: ["subscription"],
    queryFn: async () => {
      const response = await fetch("/api/subscription");
      if (!response.ok) {
        throw new Error("Failed to fetch subscription");
      }
      return response.json();
    },
    enabled: !!user,
    staleTime: 0, // Always fetch fresh data
  });

  // Refetch subscription when payment is successful
  useEffect(() => {
    if (searchParams?.get("success") === "true") {
      refetch();
    }
  }, [searchParams, refetch]);

  return {
    subscription,
    isLoading,
    plan: subscription?.plan || "free",
    isPremium: true, // Always return true to make features available for all users
    updatedAt: subscription?.updatedAt,
    refetchSubscription: refetch,
  };
} 