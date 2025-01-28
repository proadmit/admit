"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Card, CardContent } from "@/components/ui/card";
import { Loader2 } from "lucide-react";

interface UserInfo {
  name: string;
  gender: string;
  major: string;
}

interface RecommendationLetterFormProps {
  userInfo: UserInfo;
  isPremium: boolean;
}

export function RecommendationLetterForm({
  userInfo,
  isPremium,
}: RecommendationLetterFormProps) {
  const [isGenerating, setIsGenerating] = useState(false);
  const [generatedContent, setGeneratedContent] = useState("");
  const [formData, setFormData] = useState({
    recommenderName: "",
    position: "",
    duration: "",
  });

  // Generate years array for duration select
  const years = Array.from({ length: 12 }, (_, i) => i + 1);

  const handleGenerate = async () => {
    if (!isPremium) {
      toast.error("Please upgrade to premium to use AI generation");
      return;
    }

    if (!formData.recommenderName || !formData.position || !formData.duration) {
      toast.error("Please fill in recommender's name, position, and duration");
      return;
    }

    try {
      setIsGenerating(true);
      const requestData = {
        ...formData,
        studentName: userInfo.name,
        studentGender: userInfo.gender,
        studentMajor: userInfo.major,
      };

      console.log("Sending data to API:", requestData);

      const response = await fetch("/api/generate-recommendation", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(requestData),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to generate letter");
      }

      setGeneratedContent(data.letter);
      toast.success("Letter generated successfully");
    } catch (error: any) {
      console.error("Error in handleGenerate:", error);
      toast.error(error.message || "Failed to generate letter");
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardContent className="pt-6">
          <h2 className="text-xl font-bold mb-6">RECOMMENDATION LETTER</h2>
          <div className="grid gap-6">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium mb-2 block">
                  Recommender&apos;s Full Name*:
                </label>
                <Input
                  placeholder="Enter recommender's name"
                  value={formData.recommenderName}
                  onChange={(e) =>
                    setFormData((prev) => ({
                      ...prev,
                      recommenderName: e.target.value,
                    }))
                  }
                />
              </div>
              <div>
                <label className="text-sm font-medium mb-2 block">
                  Title/Position*:
                </label>
                <Input
                  placeholder="Enter position or title"
                  value={formData.position}
                  onChange={(e) =>
                    setFormData((prev) => ({
                      ...prev,
                      position: e.target.value,
                    }))
                  }
                />
              </div>
            </div>

            <div>
              <label className="text-sm font-medium mb-2 block">
                Duration of Relationship*:
              </label>
              <Select
                value={formData.duration}
                onValueChange={(value) =>
                  setFormData((prev) => ({ ...prev, duration: value }))
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select duration..." />
                </SelectTrigger>
                <SelectContent>
                  {years.map((year) => (
                    <SelectItem key={year} value={year.toString()}>
                      {year} {year === 1 ? "year" : "years"}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <Button
              onClick={handleGenerate}
              disabled={isGenerating || !isPremium}
              className="bg-[#7857FF] hover:bg-[#6544FF] text-white w-fit"
            >
              {isGenerating ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Generating...
                </>
              ) : (
                "GENERATE LETTER"
              )}
            </Button>

            {generatedContent && (
              <div className="mt-6">
                <label className="text-sm font-medium mb-2 block">
                  Generated Letter:
                </label>
                <Textarea
                  value={generatedContent}
                  readOnly
                  className="min-h-[300px]"
                />
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
