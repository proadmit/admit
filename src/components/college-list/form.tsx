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
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

interface CollegeListFormProps {
  isPremium: boolean;
}

interface University {
  name: string;
  level: "Reach" | "Target" | "Safety";
  deadline: string;
  requirements: string;
  applicationLink: string;
  scholarshipLink: string;
}

const locations = [
  "USA",
  "Canada",
  "UK",
  "Australia",
  "Europe",
  "Asia",
  "Global",
];

export function CollegeListForm({ isPremium }: CollegeListFormProps) {
  const [isGenerating, setIsGenerating] = useState(false);
  const [universities, setUniversities] = useState<University[]>([]);
  const [formData, setFormData] = useState({
    major: "",
    academicResults: "",
    location: "",
  });

  const handleGenerateList = async () => {
    if (!isPremium) {
      toast.error("Please upgrade to premium to use AI generation");
      return;
    }

    if (!formData.major || !formData.academicResults || !formData.location) {
      toast.error("Please fill in all required fields");
      return;
    }

    try {
      setIsGenerating(true);
      setUniversities([]); // Clear previous results

      // Check authentication first
      const authCheck = await fetch("/api/subscription");
      if (!authCheck.ok) {
        if (authCheck.status === 401) {
          toast.error("Please sign in to use this feature");
          return;
        }
      }

      const response = await fetch("/api/generate-college-list", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(formData),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to generate college list");
      }

      const data = await response.json();

      if (
        !data.universities ||
        !Array.isArray(data.universities) ||
        data.universities.length === 0
      ) {
        throw new Error("No universities were generated");
      }

      // Sort universities by level (Reach, Target, Safety)
      const sortedUniversities = [...data.universities].sort((a, b) => {
        const order = { Reach: 1, Target: 2, Safety: 3 };
        return (
          order[a.level as keyof typeof order] -
          order[b.level as keyof typeof order]
        );
      });

      setUniversities(sortedUniversities);
      toast.success("College list generated successfully");
    } catch (error: any) {
      console.error("Error in handleGenerateList:", error);
      toast.error(error.message || "Failed to generate college list");
    } finally {
      setIsGenerating(false);
    }
  };

  const getLevelColor = (level: string) => {
    switch (level) {
      case "Reach":
        return "text-red-600 font-semibold";
      case "Target":
        return "text-yellow-600 font-semibold";
      case "Safety":
        return "text-green-600 font-semibold";
      default:
        return "";
    }
  };

  return (
    <Card className="bg-white rounded-lg shadow-sm">
      <CardContent className="p-6">
        <div className="space-y-6">
          {/* Header */}
          <div className="inline-block rounded-lg bg-gray-100 px-3 py-1">
            <span className="text-sm font-medium text-gray-800">
              COLLEGE LIST
            </span>
          </div>

          {/* Form Fields */}
          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium text-gray-700">
                Major:
              </label>
              <Input
                placeholder="Type..."
                value={formData.major}
                onChange={(e) =>
                  setFormData((prev) => ({
                    ...prev,
                    major: e.target.value,
                  }))
                }
                className="mt-1"
              />
            </div>

            <div>
              <label className="text-sm font-medium text-gray-700">
                Location:
              </label>
              <Select
                value={formData.location}
                onValueChange={(value) =>
                  setFormData((prev) => ({ ...prev, location: value }))
                }
              >
                <SelectTrigger className="mt-1">
                  <SelectValue placeholder="Select..." />
                </SelectTrigger>
                <SelectContent>
                  {locations.map((location) => (
                    <SelectItem key={location} value={location}>
                      {location}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <label className="text-sm font-medium text-gray-700">
                Your Academic Results:
              </label>
              <Input
                placeholder="GPA, IELTS, SAT, etc."
                value={formData.academicResults}
                onChange={(e) =>
                  setFormData((prev) => ({
                    ...prev,
                    academicResults: e.target.value,
                  }))
                }
                className="mt-1"
              />
            </div>

            <div className="flex justify-end">
              <Button
                onClick={handleGenerateList}
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

          {/* Results Table */}
          {universities.length > 0 && (
            <div className="mt-6 overflow-x-auto border rounded-lg">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>University</TableHead>
                    <TableHead>Level</TableHead>
                    <TableHead>Deadline</TableHead>
                    <TableHead>Requirements</TableHead>
                    <TableHead>Links</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {universities.map((university, index) => (
                    <TableRow key={index}>
                      <TableCell className="font-medium">
                        {university.name}
                      </TableCell>
                      <TableCell className={getLevelColor(university.level)}>
                        {university.level}
                      </TableCell>
                      <TableCell>{university.deadline}</TableCell>
                      <TableCell>{university.requirements}</TableCell>
                      <TableCell>
                        <div className="space-x-2">
                          <a
                            href={university.applicationLink}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-[#7857FF] hover:underline"
                          >
                            Apply
                          </a>
                          <span className="text-gray-300">|</span>
                          <a
                            href={university.scholarshipLink}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-[#7857FF] hover:underline"
                          >
                            Scholarship
                          </a>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
