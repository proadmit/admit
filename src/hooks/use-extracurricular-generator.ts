import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

export function useExtracurricularGenerator() {
  const [isGenerating, setIsGenerating] = useState(false);
  const router = useRouter();

  const generateExtracurricular = async (prompt: string) => {
    try {
      setIsGenerating(true);

      const response = await fetch("/api/generate-extracurricular", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ prompt }),
      });

      const data = await response.json();

      if (!response.ok) {
        if (response.status === 403 && data.requiresUpgrade) {
          toast.error("You've reached your free generation limit. Upgrade to Premium for unlimited generations!");
          router.push("/payment");
          return null;
        }
        throw new Error(data.error || "Failed to generate content");
      }

      return data.content;
    } catch (error: any) {
      toast.error(error.message || "Failed to generate content");
      return null;
    } finally {
      setIsGenerating(false);
    }
  };

  return {
    generateExtracurricular,
    isGenerating,
  };
} 