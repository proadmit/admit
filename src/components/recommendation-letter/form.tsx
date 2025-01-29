"use client";

import { useState, useEffect } from "react";
import { useUser } from "@clerk/nextjs";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Loader2 } from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

interface RecommendationFormProps {
  isPremium: boolean;
}

interface RecommendationLetter {
  recommenderName: string;
  position: string;
  duration: string;
  status: "pending" | "completed" | "rejected";
  content: string;
}

interface UserMetadata {
  name?: string;
  surname?: string;
  gender?: string;
  major?: string;
}

export function RecommendationForm({ isPremium }: RecommendationFormProps) {
  const { user } = useUser();
  const [isGenerating, setIsGenerating] = useState(false);
  const [letters, setLetters] = useState<RecommendationLetter[]>([]);
  const [userInfo, setUserInfo] = useState<UserMetadata>({});

  const [formData, setFormData] = useState({
    recommenderName: "",
    position: "",
    duration: "",
  });

  // Generate years array for duration select
  const years = Array.from({ length: 12 }, (_, i) => (i + 1).toString());

  // Fetch user metadata on component mount
  useEffect(() => {
    if (user?.unsafeMetadata) {
      const metadata = user.unsafeMetadata as UserMetadata;
      setUserInfo({
        name: metadata.name || "",
        surname: metadata.surname || "",
        gender: metadata.gender || "",
        major: metadata.major || "",
      });
    }
  }, [user]);

  const handleGenerateLetter = async () => {
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
      setLetters([]); // Clear previous results

      const authCheck = await fetch("/api/subscription");
      if (!authCheck.ok) {
        if (authCheck.status === 401) {
          toast.error("Please sign in to use this feature");
          return;
        }
      }

      const requestData = {
        ...formData,
        studentName: `${userInfo.name} ${userInfo.surname}`.trim(),
        studentGender: userInfo.gender,
        studentMajor: userInfo.major,
      };

      const response = await fetch("/api/generate-recommendation", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(requestData),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(
          errorData.error || "Failed to generate recommendation letter"
        );
      }

      const data = await response.json();
      setLetters([data.letter]);
      toast.success("Recommendation letter generated successfully");
    } catch (error: any) {
      console.error("Error in handleGenerateLetter:", error);
      toast.error(error.message || "Failed to generate recommendation letter");
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <Card className="bg-white rounded-lg shadow-sm">
      <CardContent className="p-6">
        <div className="space-y-6">
          <div className="inline-block rounded-lg bg-gray-100 px-3 py-1">
            <span className="text-sm font-medium text-gray-800">
              RECOMMENDATION LETTER
            </span>
          </div>

          {/* User Info Display */}
          <div className="bg-gray-50 p-4 rounded-lg">
            <h3 className="text-sm font-medium text-gray-700 mb-2">
              Your Information:
            </h3>
            <div className="grid grid-cols-3 gap-4 text-sm">
              <div>
                <span className="text-gray-500">Name:</span>
                <span className="ml-2 text-gray-900">{`${userInfo.name || ""} ${
                  userInfo.surname || ""
                }`}</span>
              </div>
              <div>
                <span className="text-gray-500">Major:</span>
                <span className="ml-2 text-gray-900">
                  {userInfo.major || "Not specified"}
                </span>
              </div>
              <div>
                <span className="text-gray-500">Gender:</span>
                <span className="ml-2 text-gray-900">
                  {userInfo.gender || "Not specified"}
                </span>
              </div>
            </div>
          </div>

          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium text-gray-700">
                Recommender's Full Name:
              </label>
              <Input
                placeholder="Enter recommender's full name"
                value={formData.recommenderName}
                onChange={(e) =>
                  setFormData((prev) => ({
                    ...prev,
                    recommenderName: e.target.value,
                  }))
                }
                className="mt-1"
              />
            </div>

            <div>
              <label className="text-sm font-medium text-gray-700">
                Position/Title:
              </label>
              <Input
                placeholder="Enter recommender's position or title"
                value={formData.position}
                onChange={(e) =>
                  setFormData((prev) => ({
                    ...prev,
                    position: e.target.value,
                  }))
                }
                className="mt-1"
              />
            </div>

            <div>
              <label className="text-sm font-medium text-gray-700">
                Duration of Relationship:
              </label>
              <Select
                value={formData.duration}
                onValueChange={(value) =>
                  setFormData((prev) => ({ ...prev, duration: value }))
                }
              >
                <SelectTrigger className="mt-1">
                  <SelectValue placeholder="Select duration..." />
                </SelectTrigger>
                <SelectContent>
                  {years.map((year) => (
                    <SelectItem key={year} value={year}>
                      {year} {parseInt(year) === 1 ? "year" : "years"}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="flex justify-end">
              <Button
                onClick={handleGenerateLetter}
                disabled={isGenerating || !isPremium}
                className="bg-[#7857FF] hover:bg-[#6544FF] text-white rounded-full px-8"
              >
                {isGenerating ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Generating...
                  </>
                ) : (
                  "GENERATE"
                )}
              </Button>
            </div>
          </div>

          {letters.length > 0 && (
            <div className="mt-6">
              <div className="overflow-x-auto border rounded-lg">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Recommender</TableHead>
                      <TableHead>Position</TableHead>
                      <TableHead>Duration</TableHead>
                      <TableHead>Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {letters.map((letter, index) => (
                      <TableRow key={index}>
                        <TableCell className="font-medium">
                          {letter.recommenderName}
                        </TableCell>
                        <TableCell>{letter.position}</TableCell>
                        <TableCell>
                          {letter.duration}{" "}
                          {parseInt(letter.duration) === 1 ? "year" : "years"}
                        </TableCell>
                        <TableCell>
                          <span
                            className={`inline-block px-2 py-1 rounded-full text-xs font-semibold ${
                              letter.status === "pending"
                                ? "bg-yellow-100 text-yellow-800"
                                : letter.status === "completed"
                                ? "bg-green-100 text-green-800"
                                : "bg-red-100 text-red-800"
                            }`}
                          >
                            {letter.status}
                          </span>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
              {letters[0]?.content && (
                <div className="mt-4 p-4 bg-gray-50 rounded-lg">
                  <h3 className="text-sm font-medium text-gray-700 mb-2">
                    Generated Letter:
                  </h3>
                  <div className="whitespace-pre-wrap text-sm text-gray-600">
                    {letters[0].content}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
