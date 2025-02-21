import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

export type QuestionnaireData = {
  academicInterests: string;
  significantExperience: string;
  personalGrowth: string;
  futureGoals: string;
  challengesOvercome: string;
};

export type UserInfo = {
  gender?: string;
  country?: string;
  major?: string;
  academics?: string;
};

export function usePersonalStatementGenerator() {
  const [isGenerating, setIsGenerating] = useState(false);
  const router = useRouter();

  const generatePersonalStatement = async (
    prompt: string,
    customPrompt: string,
    questionnaireData: QuestionnaireData,
    userInfo: UserInfo
  ) => {
    try {
      setIsGenerating(true);

      const response = await fetch("/api/generate-personal-statement", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          prompt,
          customPrompt,
          questionnaireData,
          userInfo,
        }),
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

      return data.essay;
    } catch (error: any) {
      toast.error(error.message || "Failed to generate personal statement");
      return null;
    } finally {
      setIsGenerating(false);
    }
  };

  return {
    generatePersonalStatement,
    isGenerating,
  };
} 