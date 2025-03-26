"use client";
import { useUser, useClerk } from "@clerk/nextjs";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { BsArrowRight } from "react-icons/bs";
import { HiOutlineDocumentText } from "react-icons/hi";
import { IoPersonOutline } from "react-icons/io5";
import { HiOutlineMail } from "react-icons/hi";
import { RiFileTextLine, RiFileCopyLine } from "react-icons/ri";
import { BiBuildingHouse } from "react-icons/bi";
import { cn } from "@/lib/utils";
import { CiRedo } from "react-icons/ci";
import { Loader2, Lock } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { User, Settings, LogOut } from "lucide-react";
import { useSubscription } from "@/hooks/use-subscription";
import { toast } from "@/components/ui/toast/use-toast";
import { CollegeListForm } from "@/components/college-list/form";
import { RecommendationForm } from "@/components/recommendation-letter/form";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Shimmer } from "@/components/ui/shimmer";

const PROMPTS = [
  {
    id: "1",
    text: "Some students have a background, identity, interest, or talent that is so meaningful they believe their application would be incomplete without it. If this sounds like you, then please share your story.",
  },
  {
    id: "2",
    text: "The lessons we take from obstacles we encounter can be fundamental to later success. Recount a time when you faced a challenge, setback, or failure. How did it affect you, and what did you learn from the experience?",
  },
  {
    id: "3",
    text: "Reflect on a time when you questioned or challenged a belief or idea. What prompted your thinking? What was the outcome?",
  },
  {
    id: "4",
    text: "Reflect on something that someone has done for you that has made you happy or thankful in a surprising way. How has this gratitude affected or motivated you?",
  },
  {
    id: "5",
    text: "Discuss an accomplishment, event, or realization that sparked a period of personal growth and a new understanding of yourself or others.",
  },
  {
    id: "6",
    text: "Describe a topic, idea, or concept you find so engaging that it makes you lose all track of time. Why does it captivate you? What or who do you turn to when you want to learn more?",
  },
  {
    id: "7",
    text: "Other",
  },
];

const LOCATIONS = [
  { id: "usa", name: "USA" },
  { id: "canada", name: "Canada" },
  { id: "uk", name: "United Kingdom" },
  { id: "europe", name: "Europe" },
  { id: "australia", name: "Australia" },
];

type QuestionnaireData = {
  academicInterests: string;
  significantExperience: string;
  personalGrowth: string;
  futureGoals: string;
  challengesOvercome: string;
};

export default function DashboardPage() {
  const router = useRouter();
  const { user, isLoaded: isUserLoaded } = useUser();
  const { signOut } = useClerk();
  const {
    subscription,
    isLoading: isLoadingSubscription,
    plan,
    isPremium,
  } = useSubscription();
  const [activeTab, setActiveTab] = useState("personal-statement");
  const [userName, setUserName] = useState("");
  const [selectedPrompt, setSelectedPrompt] = useState("");
  const [customPrompt, setCustomPrompt] = useState("");
  const [generatedEssay, setGeneratedEssay] = useState("");
  const [isGenerating, setIsGenerating] = useState(false);
  const [showUpgradeModal, setShowUpgradeModal] = useState(false);
  const [activities, setActivities] = useState<{
    activity: string[];
    creativity: string[];
    service: string[];
  }>({
    activity: [],
    creativity: [],
    service: [],
  });
  const [recommenderDetails, setRecommenderDetails] = useState({
    fullName: "",
    title: "",
    duration: "",
  });
  const [mounted, setMounted] = useState(false);
  const [supplementalEssay, setSupplementalEssay] = useState("");
  const [isGeneratingSupplemental, setIsGeneratingSupplemental] =
    useState(false);
  const [supplementalForm, setSupplementalForm] = useState({
    university: "",
    wordLimit: "",
    prompt: "",
  });
  const [showQuestionnaire, setShowQuestionnaire] = useState(false);
  const [questionnaireData, setQuestionnaireData] = useState<QuestionnaireData>(
    {
      academicInterests: "",
      significantExperience: "",
      personalGrowth: "",
      futureGoals: "",
      challengesOvercome: "",
    }
  );
  const [generationAttempts, setGenerationAttempts] = useState(0);
  const [isGeneratingEssay, setIsGeneratingEssay] = useState(false);
  const [isGeneratingExtracurricular, setIsGeneratingExtracurricular] =
    useState(false);
  const [isGeneratingCollegeList, setIsGeneratingCollegeList] = useState(false);
  const [isGeneratingRecommendation, setIsGeneratingRecommendation] =
    useState(false);
  const [extracurricularAttempts, setExtracurricularAttempts] = useState(0);

  // Add function to prevent copying for free users
  const preventCopy = (
    e:
      | React.ClipboardEvent<HTMLDivElement>
      | React.MouseEvent<HTMLDivElement>
      | React.KeyboardEvent<HTMLDivElement>
  ) => {
    if (plan === "free") {
      e.preventDefault();
      toast({
        title: "Premium Feature",
        description: "Upgrade to Premium to copy activities",
        variant: "destructive",
      });
      router.push("/payment");
    }
  };

  // Add function to handle copy button click
  const handleCopyActivity = (text: string) => {
    if (plan === "free") {
      toast({
        title: "Premium Feature",
        description: "Upgrade to Premium to copy activities",
        variant: "destructive",
      });
      router.push("/payment");
      return;
    }

    navigator.clipboard.writeText(text);
    toast({
      title: "Success",
      description: "Copied to clipboard",
    });
  };

  // Handle mounting
  useEffect(() => {
    setMounted(true);
    return () => setMounted(false);
  }, []);

  // Handle auth redirect
  useEffect(() => {
    if (isUserLoaded && !user) {
      router.push("/sign-in");
    }
  }, [isUserLoaded, user, router]);

  // Handle user metadata
  useEffect(() => {
    if (mounted && user?.unsafeMetadata) {
      const metadata = user.unsafeMetadata as {
        name?: string;
        surname?: string;
      };
      const fullName = [metadata?.name, metadata?.surname]
        .filter(Boolean)
        .join(" ");
      setUserName(fullName || user?.fullName || "");
    }
  }, [user, mounted]);

  const handlePromptSelect = (value: string) => {
    setSelectedPrompt(value);
    if (value !== "7") {
      setCustomPrompt("");
    }
  };

  const handleGenerate = async () => {
    if (!selectedPrompt) {
      toast({
        title: "Error",
        description: "Please select a prompt first",
        variant: "destructive",
      });
      return;
    }

    setIsGenerating(true);

    try {
      // Check if this is a second attempt for free users
      if (plan === "free" && generationAttempts > 0) {
        toast({
          title: "Upgrade Required",
          description:
            "You've reached your free generation limit. Upgrade to Premium for unlimited generations!",
          variant: "destructive",
        });
        router.push("/payment");
        return;
      }

      // Show questionnaire to gather more information
      setShowQuestionnaire(true);
    } catch (error) {
      console.error("Error generating personal statement:", error);
      toast({
        title: "Error",
        description: "Failed to generate personal statement. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsGenerating(false);
    }
  };

  const handleGenerateWithQuestionnaire = async () => {
    try {
      setIsGenerating(true);
      setShowQuestionnaire(false);

      const promptText =
        selectedPrompt === "7"
          ? customPrompt
          : PROMPTS.find((p) => p.id === selectedPrompt)?.text;

      // Include user's personal info and questionnaire data
      const response = await fetch("/api/generate-personal-statement", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          prompt: promptText,
          customPrompt: selectedPrompt === "7" ? customPrompt : undefined,
          questionnaireData,
          userInfo: {
            gender: user?.unsafeMetadata?.gender,
            country: user?.unsafeMetadata?.country,
            major: user?.unsafeMetadata?.major,
            academics: user?.unsafeMetadata?.academics,
          },
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        if (response.status === 403 && data.requiresUpgrade) {
          toast({
            title: "Upgrade Required",
            description:
              "You've reached your free generation limit. Upgrade to Premium for unlimited generations!",
            variant: "destructive",
          });
          router.push("/payment");
          return;
        }
        throw new Error(data.error || "Failed to generate personal statement");
      }

      setGeneratedEssay(data.essay);
      setGenerationAttempts((prev) => prev + 1);

      toast({
        title: "Success",
        description: "Personal statement generated successfully!",
      });
    } catch (error: any) {
      console.error("Error generating personal statement:", error);
      toast({
        title: "Error",
        description:
          error.message ||
          "Failed to generate personal statement. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsGenerating(false);
    }
  };

  const handleRegenerate = () => {
    if (plan === "free" && generationAttempts > 0) {
      toast({
        title: "Upgrade Required",
        description: "Upgrade to premium to regenerate!",
        variant: "destructive",
      });
      router.push("/payment");
      return;
    }
    handleGenerate();
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(generatedEssay);
    toast({
      title: "Success",
      description: "Copied to clipboard!",
    });
  };

  const handleClear = () => {
    setSelectedPrompt("");
    setCustomPrompt("");
    setGeneratedEssay("");
    setGenerationAttempts(0); // Reset generation attempts
    setQuestionnaireData({
      academicInterests: "",
      significantExperience: "",
      personalGrowth: "",
      futureGoals: "",
      challengesOvercome: "",
    });
  };

  const handleGenerateActivities = async () => {
    try {
      // Check if free user has reached their limit
      if (plan === "free" && extracurricularAttempts > 0) {
        toast({
          title: "Upgrade Required",
          description:
            "You've reached your free generation limit. Upgrade to Premium for unlimited generations!",
          variant: "destructive",
        });
        router.push("/payment");
        return;
      }

      setIsGenerating(true);
      const response = await fetch("/api/generate-activities", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          major: user?.unsafeMetadata?.major || "Undecided",
          gender: user?.unsafeMetadata?.gender || "Not specified",
          country: user?.unsafeMetadata?.country || "Not specified",
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        if (response.status === 403 && data.requiresUpgrade) {
          toast({
            title: "Upgrade Required",
            description:
              "You've reached your free generation limit. Upgrade to Premium for unlimited generations!",
            variant: "destructive",
          });
          router.push("/payment");
          return;
        }
        throw new Error(data.error || "Failed to generate activities");
      }

      setActivities(data.activities);
      setExtracurricularAttempts((prev) => prev + 1);

      toast({
        title: "Success",
        description: "Activities generated successfully!",
      });
    } catch (error) {
      console.error("Error generating activities:", error);
      toast({
        title: "Error",
        description: "Failed to generate activities. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsGenerating(false);
    }
  };

  // Add a regenerate function for extracurricular activities
  const handleRegenerateActivities = () => {
    if (plan === "free" && extracurricularAttempts > 0) {
      toast({
        title: "Upgrade Required",
        description: "Upgrade to premium to regenerate!",
        variant: "destructive",
      });
      router.push("/payment");
      return;
    }
    handleGenerateActivities();
  };

  const handleGenerateSupplementalEssay = async () => {
    try {
      setIsGeneratingSupplemental(true);

      // Check if this is a second attempt for free users
      if (plan === "free" && generationAttempts > 0) {
        toast({
          title: "Upgrade Required",
          description:
            "You've reached your free generation limit. Upgrade to Premium for unlimited generations!",
          variant: "destructive",
        });
        router.push("/payment");
        return;
      }

      const response = await fetch("/api/generate-essay", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          ...supplementalForm,
          questionnaireData,
          userInfo: {
            gender: user?.unsafeMetadata?.gender,
            country: user?.unsafeMetadata?.country,
            major: user?.unsafeMetadata?.major,
            academics: user?.unsafeMetadata?.academics,
          },
        }),
      });

      if (!response.ok) {
        if (response.status === 403) {
          const data = await response.json();
          if (data.requiresUpgrade) {
            toast({
              title: "Upgrade Required",
              description:
                "You've reached your free generation limit. Upgrade to Premium for unlimited generations!",
              variant: "destructive",
            });
            router.push("/payment");
            return;
          }
        }
        throw new Error("Failed to generate essay");
      }

      const data = await response.json();
      setGeneratedEssay(data.essay);
      setGenerationAttempts((prev) => prev + 1);

      toast({
        title: "Success",
        description: "Supplemental essay generated successfully!",
      });
    } catch (error) {
      console.error("Error generating essay:", error);
      toast({
        title: "Error",
        description: "Failed to generate essay. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsGeneratingSupplemental(false);
    }
  };

  const handleTabClick = (tab: string) => {
    setActiveTab(tab);
  };

  const tabs = [
    {
      id: "personal-statement",
      label: "PERSONAL STATEMENT",
      icon: HiOutlineDocumentText,
    },
    {
      id: "supplemental-essays",
      label: "SUPPLEMENTAL ESSAYS",
      icon: RiFileTextLine,
    },
    {
      id: "extracurricular",
      label: "EXTRACURRICULAR ACTIVITIES",
      icon: IoPersonOutline,
    },
    {
      id: "recommendation",
      label: "RECOMMENDATION LETTERS",
      icon: HiOutlineMail,
    },
    {
      id: "college-list",
      label: "COLLEGE LIST",
      icon: BiBuildingHouse,
    },
  ];

  const getPlanButton = () => {
    if (isLoadingSubscription) {
      return (
        <button className="rounded-full bg-[#7C3AED] px-6 py-2 text-sm font-medium text-white opacity-50">
          Loading...
        </button>
      );
    }

    return (
      <button
        onClick={() => router.push("/payment")}
        className="rounded-full bg-[#7C3AED] px-6 py-2 text-sm font-medium text-white hover:opacity-90 transition-opacity"
      >
        {plan === "free"
          ? "Free Plan"
          : plan === "monthly"
          ? "Monthly Plan"
          : "Yearly Plan"}
      </button>
    );
  };

  // Don't render anything until mounted and user is loaded
  if (!mounted || !isUserLoaded || !user) {
    return null;
  }

  const userDisplayName = user?.firstName || user?.fullName || "User";
  const userEmail = user?.primaryEmailAddress?.emailAddress || "";
  const currentPlan = plan || "Free Plan";

  // Add this CSS class for premium content
  const premiumContentClass = cn(
    "relative",
    !isPremium && "select-none" // Prevent text selection for free users
  );

  // Add this component for premium content overlay
  const PremiumOverlay = () => (
    <div
      className="absolute inset-0 bg-gradient-to-b from-transparent to-white/90 flex items-end justify-center pb-8"
      onClick={() => router.push("/payment")}
    >
      <Button
        className="bg-gradient-to-r from-[#608aff] to-[#ba7dff] text-white px-8 py-2 rounded-full"
        onClick={() => router.push("/payment")}
      >
        Upgrade to Copy
      </Button>
    </div>
  );

  return (
    <div className="container mx-auto p-4">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-2xl font-bold">
            Admit App Dashboard
          </h1>
          <p className="text-sm ">
            Current Plan:{" "}
            <span className="font-medium capitalize">{currentPlan}</span>
            {isLoadingSubscription && <span className="ml-2">Loading...</span>}
          </p>
        </div>
        {currentPlan === "free" && (
          <Button
            onClick={() => router.push("/payment")}
            className="hover:bg-[#773aed] bg-[#6544FF]"
          >
            Upgrade to Premium
          </Button>
        )}
      </div>
      <div className="flex min-h-screen flex-col bg-white p-6 md:p-8">
        {/* Header */}
        <div className="mb-8 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="flex flex-wrap items-center gap-4">
            <div className="h-10 w-10 overflow-hidden rounded-full bg-black">
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" className="relative h-10 w-10 p-0">
                    <Avatar className="h-8 w-8">
                      <AvatarImage
                        src={user?.imageUrl}
                        alt={user?.fullName || "User avatar"}
                      />
                      <AvatarFallback>
                        {user?.unsafeMetadata?.name?.[0]?.toUpperCase() || ""}
                        {user?.unsafeMetadata?.surname?.[0]?.toUpperCase() ||
                          ""}
                      </AvatarFallback>
                    </Avatar>
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent className="w-56" align="end" forceMount>
                  <DropdownMenuLabel className="font-normal">
                    <div className="flex flex-col space-y-1">
                      <p className="text-sm font-medium leading-none">
                        {user?.fullName || "User"}
                      </p>
                      <p className="text-xs leading-none text-muted-foreground">
                        {user?.primaryEmailAddress?.emailAddress || ""}
                      </p>
                    </div>
                  </DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  <DropdownMenuGroup>
                    <DropdownMenuItem
                      onClick={() => router.push("/dashboard/account")}
                    >
                      <User className="mr-2 h-4 w-4" />
                      <span>Profile</span>
                    </DropdownMenuItem>
                    <DropdownMenuItem
                      onClick={() => router.push("/dashboard/account")}
                    >
                      <Settings className="mr-2 h-4 w-4" />
                      <span>Settings</span>
                    </DropdownMenuItem>
                  </DropdownMenuGroup>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem
                    className="text-red-600 focus:text-red-600"
                    onClick={() => signOut(() => router.push("/"))}
                  >
                    <LogOut className="mr-2 h-4 w-4" />
                    <span>Log out</span>
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
            <button className="rounded-full bg-[#7C3AED] px-6 py-2 text-sm font-medium text-white">
              {userName || user?.fullName || "User"}
            </button>
            {getPlanButton()}
          </div>
          <a
            href="mailto:hello@AdmitApp.org"
            className="rounded-full bg-[#E5E7EB] px-6 py-2 text-sm font-medium text-[#6B7280] hover:bg-[#D1D5DB] transition-colors inline-block text-center sm:text-left"
          >
            SUPPORT
          </a>
        </div>

        <div className="flex flex-1 flex-col lg:flex-row gap-8 rounded-[32px] bg-[#F3F4F6] p-4 sm:p-6">
          {/* Sidebar */}
          <aside className="w-full lg:w-[320px] space-y-3">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => handleTabClick(tab.id)}
                className={cn(
                  "flex w-full items-center justify-between rounded-2xl p-4 text-left transition-colors",
                  activeTab === tab.id
                    ? "bg-white text-black shadow-sm"
                    : "text-[#9CA3AF] hover:bg-white/50"
                )}
              >
                <div className="flex items-center gap-3">
                  <tab.icon className="h-5 w-5" />
                  <span className="text-sm font-medium">{tab.label}</span>
                </div>
                <BsArrowRight className="h-4 w-4" />
              </button>
            ))}
          </aside>

          {/* Main Content */}
          <main className="flex-1 rounded-[32px] bg-white p-4 sm:p-6 md:p-8">
            {activeTab === "personal-statement" && (
              <div className="space-y-4">
                <div className="rounded-full bg-[#F3F4F6] px-6 py-2 text-sm font-medium text-black w-fit">
                  PERSONAL STATEMENT
                </div>

                <div className="space-y-6">
                  <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
                    <span className="text-sm font-medium text-black whitespace-nowrap">
                      Choose essay prompt:
                    </span>
                    <div className="relative flex-1 w-full sm:max-w-[500px]">
                      <Select
                        onValueChange={handlePromptSelect}
                        value={selectedPrompt}
                      >
                        <SelectTrigger className="w-full rounded-full border-[#E5E7EB] bg-white h-10 pr-8 relative cursor-pointer hover:border-[#7C3AED] transition-colors">
                          {selectedPrompt ? (
                            <div className="absolute inset-0 flex items-center px-4">
                              <p className="text-sm text-black line-clamp-1 pr-6">
                                {selectedPrompt === "7"
                                  ? "Write your own prompt"
                                  : PROMPTS.find((p) => p.id === selectedPrompt)
                                      ?.text}
                              </p>
                            </div>
                          ) : (
                            <SelectValue
                              placeholder="Select a prompt"
                              className="text-[#6B7280]"
                            />
                          )}
                          <div className="absolute right-3 top-1/2 -translate-y-1/2">
                            <svg
                              width="12"
                              height="12"
                              viewBox="0 0 12 12"
                              fill="none"
                              xmlns="http://www.w3.org/2000/svg"
                              className="text-[#6B7280]"
                            >
                              <path
                                d="M2.5 4.5L6 8L9.5 4.5"
                                stroke="currentColor"
                                strokeWidth="1.5"
                                strokeLinecap="round"
                                strokeLinejoin="round"
                              />
                            </svg>
                          </div>
                        </SelectTrigger>
                        <SelectContent
                          className="relative w-[var(--radix-select-trigger-width)] overflow-hidden rounded-xl border border-[#E5E7EB] bg-white shadow-lg animate-in fade-in-0 zoom-in-95"
                          position="popper"
                          sideOffset={4}
                          align="start"
                        >
                          <div className="max-h-[300px] overflow-y-auto py-1">
                            {PROMPTS.map((prompt) => (
                              <SelectItem
                                key={prompt.id}
                                value={prompt.id}
                                className="relative flex w-full cursor-pointer select-none items-center rounded-lg px-4 py-3 text-sm text-[#6B7280] outline-none transition-colors hover:bg-[#F3F4F6] hover:text-black data-[state=checked]:text-[#7C3AED] data-[state=checked]:bg-[#F3F4F6]"
                              >
                                <span className="line-clamp-2">
                                  {prompt.id === "7"
                                    ? "Write your own prompt"
                                    : prompt.text}
                                </span>
                              </SelectItem>
                            ))}
                          </div>
                        </SelectContent>
                      </Select>
                    </div>
                    <Button
                      onClick={handleGenerate}
                      disabled={!selectedPrompt || isGenerating}
                      className="w-full sm:w-auto rounded-full bg-[#7C3AED] px-8 py-2 text-sm font-medium text-white transition-opacity hover:opacity-90 disabled:opacity-50 whitespace-nowrap"
                    >
                      {isGenerating ? (
                        <div className="flex items-center gap-2">
                          <Loader2 className="h-4 w-4 animate-spin" />
                          Generating...
                        </div>
                      ) : (
                        "GENERATE"
                      )}
                    </Button>
                  </div>

                  {selectedPrompt === "7" && (
                    <div className="w-full sm:max-w-[500px]">
                      <Textarea
                        placeholder="Type your custom prompt here..."
                        value={customPrompt}
                        onChange={(e) => setCustomPrompt(e.target.value)}
                        className="min-h-[120px] rounded-[12px] border-[#E5E7EB] bg-white p-4 text-black placeholder:text-[#9CA3AF] focus:border-[#7C3AED] focus:ring-1 focus:ring-[#7C3AED] transition-colors"
                      />
                    </div>
                  )}
                </div>

                 {/* Essay Display Section */}
                 {isGenerating ? (
                      <div className="rounded-[24px] border border-[#E5E7EB] bg-white p-6">
                        <div className="mb-4 flex justify-end gap-2">
                          <div className="rounded-full bg-[#F3F4F6] p-2">
                            <RiFileCopyLine className="h-5 w-5 text-[#6B7280] opacity-50" />
                          </div>
                          <div className="rounded-full bg-[#F3F4F6] p-2">
                            <CiRedo className="h-5 w-5 text-[#6B7280] opacity-50" />
                          </div>
                        </div>
                        <Shimmer className="h-[300px] rounded-lg" />
                      </div>
                    ) : generatedEssay ? (
                      <div className="rounded-[24px] border border-[#E5E7EB] bg-white p-6">
                        <div className="mb-4 flex justify-end gap-2">
                          <button
                            onClick={() => {
                              navigator.clipboard.writeText(generatedEssay);
                              toast({
                                title: "Success",
                                description: "Essay copied to clipboard",
                              });
                            }}
                            className="rounded-full hover:bg-[#F3F4F6] p-2 transition-colors"
                          >
                            <RiFileCopyLine className="h-5 w-5 text-[#6B7280]" />
                          </button>
                          <button
                            onClick={() => setShowQuestionnaire(true)}
                            className="rounded-full hover:bg-[#F3F4F6] p-2 transition-colors"
                          >
                            <CiRedo className="h-5 w-5 text-[#6B7280]" />
                          </button>
                        </div>
                        <div className="min-h-[300px] whitespace-pre-wrap text-base leading-relaxed text-black">
                          {generatedEssay}
                        </div>
                      </div>
                    ) : null}
                    
              </div>
            )}

            {activeTab === "supplemental-essays" && (
              <div className="space-y-8">
                <div className="rounded-full bg-[#F3F4F6] px-6 py-2 text-sm font-medium text-black w-fit">
                  SUPPLEMENTAL ESSAY
                </div>

                {plan === "free" ? (
                  <div className="relative">
                    {/* Blurred Content */}
                    <div className="blur-[2px] pointer-events-none">
                      <div className="space-y-6">
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                          <div className="space-y-2">
                            <span className="text-sm font-medium text-black">
                              Major:
                            </span>
                            <div className="rounded-full bg-[#F3F4F6] px-6 py-2 text-sm text-black">
                              {user?.unsafeMetadata?.major || "N/A"}
                            </div>
                          </div>
                          <div className="space-y-2">
                            <span className="text-sm font-medium text-black">
                              Gender:
                            </span>
                            <div className="rounded-full bg-[#F3F4F6] px-6 py-2 text-sm text-black">
                              {user?.unsafeMetadata?.gender || "N/A"}
                            </div>
                          </div>
                          <div className="space-y-2">
                            <span className="text-sm font-medium text-black">
                              Country:
                            </span>
                            <div className="rounded-full bg-[#F3F4F6] px-6 py-2 text-sm text-black">
                              {user?.unsafeMetadata?.country || "N/A"}
                            </div>
                          </div>
                        </div>

                        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-6">
                          <div className="w-full sm:w-[300px] space-y-2">
                            <span className="text-sm font-medium text-black">
                              University Name:
                            </span>
                            <Input
                              className="w-full rounded-full border-[#E5E7EB] bg-white h-10"
                              placeholder="Type..."
                              disabled
                            />
                          </div>
                          <div className="w-full sm:w-[200px] space-y-2">
                            <span className="text-sm font-medium text-black">
                              Word Limit:
                            </span>
                            <Input
                              className="w-full rounded-full border-[#E5E7EB] bg-white h-10"
                              placeholder="Type..."
                              disabled
                            />
                          </div>
                        </div>
                        <div className="space-y-2">
                          <span className="text-sm font-medium text-black">
                            Type the Question/Prompt:
                          </span>
                          <Input
                            className="w-full rounded-full border-[#E5E7EB] bg-white h-10"
                            placeholder="Type..."
                            disabled
                          />
                        </div>
                        <div className="flex justify-end">
                          <Button
                            className="rounded-full bg-[#7C3AED] text-white opacity-50"
                            disabled
                          >
                            Generate
                          </Button>
                        </div>
                      </div>
                    </div>

                    {/* Upgrade Overlay */}
                    <div className="absolute inset-0 z-10 flex items-center justify-center bg-white/60 backdrop-blur-[2px]">
                      <div className="text-center">
                        <Lock className="w-12 h-12 text-[#7857FF] mx-auto mb-4" />
                        <p className="text-lg font-medium text-black mb-4">
                          Upgrade to Premium to generate supplemental essays
                        </p>
                        <Button
                          onClick={() => router.push("/payment")}
                          className="rounded-full bg-[#7857FF] hover:bg-[#6544FF] text-white px-8"
                        >
                          Upgrade Now
                        </Button>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-6">
                    {/* User Information Display */}
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                      <div className="space-y-2">
                        <span className="text-sm font-medium text-black">
                          Major:
                        </span>
                        <div className="rounded-full bg-[#F3F4F6] px-6 py-2 text-sm text-black">
                          {user?.unsafeMetadata?.major || "N/A"}
                        </div>
                      </div>
                      <div className="space-y-2">
                        <span className="text-sm font-medium text-black">
                          Gender:
                        </span>
                        <div className="rounded-full bg-[#F3F4F6] px-6 py-2 text-sm text-black">
                          {user?.unsafeMetadata?.gender || "N/A"}
                        </div>
                      </div>
                      <div className="space-y-2">
                        <span className="text-sm font-medium text-black">
                          Country:
                        </span>
                        <div className="rounded-full bg-[#F3F4F6] px-6 py-2 text-sm text-black">
                          {user?.unsafeMetadata?.country || "N/A"}
                        </div>
                      </div>
                    </div>

                    <div className="flex flex-col sm:flex-row items-start sm:items-center gap-6">
                      <div className="w-full sm:w-[300px] space-y-2">
                        <span className="text-sm font-medium text-black">
                          University Name:
                        </span>
                        <Input
                          value={supplementalForm.university}
                          onChange={(e) =>
                            setSupplementalForm({
                              ...supplementalForm,
                              university: e.target.value,
                            })
                          }
                          className="w-full rounded-full border-[#E5E7EB] bg-white h-10 hover:border-[#7C3AED] transition-colors focus:border-[#7C3AED] focus:ring-1 focus:ring-[#7C3AED]"
                          placeholder="Type..."
                        />
                      </div>
                      <div className="w-full sm:w-[200px] space-y-2">
                        <span className="text-sm font-medium text-black">
                          Word Limit:
                        </span>
                        <Input
                          value={supplementalForm.wordLimit}
                          onChange={(e) =>
                            setSupplementalForm({
                              ...supplementalForm,
                              wordLimit: e.target.value,
                            })
                          }
                          className="w-full rounded-full border-[#E5E7EB] bg-white h-10 hover:border-[#7C3AED] transition-colors focus:border-[#7C3AED] focus:ring-1 focus:ring-[#7C3AED]"
                          placeholder="Type..."
                        />
                      </div>
                    </div>
                    <div className="space-y-2">
                      <span className="text-sm font-medium text-black">
                        Type the Question/Prompt:
                      </span>
                      <Input
                        value={supplementalForm.prompt}
                        onChange={(e) =>
                          setSupplementalForm({
                            ...supplementalForm,
                            prompt: e.target.value,
                          })
                        }
                        className="w-full rounded-full border-[#E5E7EB] bg-white h-10 hover:border-[#7C3AED] transition-colors focus:border-[#7C3AED] focus:ring-1 focus:ring-[#7C3AED]"
                        placeholder="Type..."
                      />
                    </div>

                    {/* Generate Button Section */}
                    <div className="flex justify-end">
                      <Button
                        onClick={() => {
                          if (
                            !supplementalForm.university ||
                            !supplementalForm.wordLimit ||
                            !supplementalForm.prompt
                          ) {
                            toast({
                              title: "Error",
                              description: "Please fill in all fields first",
                              variant: "destructive",
                            });
                            return;
                          }
                          setShowQuestionnaire(true);
                        }}
                        className="rounded-full bg-[#7C3AED] text-white hover:opacity-90"
                      >
                        Generate
                      </Button>
                    </div>

                    {/* Essay Display Section */}
                    {isGeneratingSupplemental ? (
                      <div className="rounded-[24px] border border-[#E5E7EB] bg-white p-6">
                        <div className="mb-4 flex justify-end gap-2">
                          <div className="rounded-full bg-[#F3F4F6] p-2">
                            <RiFileCopyLine className="h-5 w-5 text-[#6B7280] opacity-50" />
                          </div>
                          <div className="rounded-full bg-[#F3F4F6] p-2">
                            <CiRedo className="h-5 w-5 text-[#6B7280] opacity-50" />
                          </div>
                        </div>
                        <Shimmer className="h-[300px] rounded-lg" />
                      </div>
                    ) : supplementalEssay ? (
                      <div className="rounded-[24px] border border-[#E5E7EB] bg-white p-6">
                        <div className="mb-4 flex justify-end gap-2">
                          <button
                            onClick={() => {
                              navigator.clipboard.writeText(supplementalEssay);
                              toast({
                                title: "Success",
                                description: "Essay copied to clipboard",
                              });
                            }}
                            className="rounded-full hover:bg-[#F3F4F6] p-2 transition-colors"
                          >
                            <RiFileCopyLine className="h-5 w-5 text-[#6B7280]" />
                          </button>
                          <button
                            onClick={() => setShowQuestionnaire(true)}
                            className="rounded-full hover:bg-[#F3F4F6] p-2 transition-colors"
                          >
                            <CiRedo className="h-5 w-5 text-[#6B7280]" />
                          </button>
                        </div>
                        <div className="min-h-[300px] whitespace-pre-wrap text-base leading-relaxed text-black">
                          {supplementalEssay}
                        </div>
                      </div>
                    ) : null}
                  </div>
                )}
              </div>
            )}

            {activeTab === "extracurricular" && (
              <div className="space-y-8">
                <div className="rounded-full bg-[#F3F4F6] px-6 py-2 text-sm font-medium text-black w-fit">
                  EXTRACURRICULAR ACTIVITIES
                </div>

                <div className="space-y-6">
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    <div className="space-y-2">
                      <span className="text-sm font-medium text-black">
                        Major:
                      </span>
                      <div className="rounded-full bg-[#F3F4F6] px-6 py-2 text-sm text-black">
                        {user?.unsafeMetadata?.major || "N/A"}
                      </div>
                    </div>
                    <div className="space-y-2">
                      <span className="text-sm font-medium text-black">
                        Gender:
                      </span>
                      <div className="rounded-full bg-[#F3F4F6] px-6 py-2 text-sm text-black">
                        {user?.unsafeMetadata?.gender || "N/A"}
                      </div>
                    </div>
                    <div className="space-y-2">
                      <span className="text-sm font-medium text-black">
                        Country:
                      </span>
                      <div className="rounded-full bg-[#F3F4F6] px-6 py-2 text-sm text-black">
                        {user?.unsafeMetadata?.country || "N/A"}
                      </div>
                    </div>
                  </div>
                  <div className="flex justify-end">
                    <button
                      onClick={handleGenerateActivities}
                      disabled={isGenerating}
                      className="rounded-full bg-[#7C3AED] px-8 py-2 text-sm font-medium text-white transition-opacity hover:opacity-90 disabled:opacity-50 whitespace-nowrap"
                    >
                      {isGenerating ? (
                        <div className="flex items-center gap-2">
                          <Loader2 className="h-4 w-4 animate-spin" />
                          Generating...
                        </div>
                      ) : (
                        "GENERATE"
                      )}
                    </button>
                  </div>

                  {isGenerating ? (
                    // Shimmer loading state for all three sections
                    <div className="space-y-6">
                      {/* Activity Section Shimmer */}
                      <div className="space-y-4">
                        <div className="flex items-center justify-between">
                          <h3 className="text-xl font-medium text-black">
                            ACTIVITY
                          </h3>
                          <div className="text-2xl text-[#6B7280]">1</div>
                        </div>
                        <div className="rounded-[24px] border border-[#E5E7EB] bg-white p-6">
                          <Shimmer className="min-h-[200px]" />
                        </div>
                      </div>

                      {/* Creativity Section Shimmer */}
                      <div className="space-y-4">
                        <div className="flex items-center justify-between">
                          <h3 className="text-xl font-medium text-black">
                            CREATIVITY
                          </h3>
                          <div className="text-2xl text-[#6B7280]">2</div>
                        </div>
                        <div className="rounded-[24px] border border-[#E5E7EB] bg-white p-6">
                          <Shimmer className="min-h-[200px]" />
                        </div>
                      </div>

                      {/* Service Section Shimmer */}
                      <div className="space-y-4">
                        <div className="flex items-center justify-between">
                          <h3 className="text-xl font-medium text-black">
                            SERVICE
                          </h3>
                          <div className="text-2xl text-[#6B7280]">3</div>
                        </div>
                        <div className="rounded-[24px] border border-[#E5E7EB] bg-white p-6">
                          <Shimmer className="min-h-[200px]" />
                        </div>
                      </div>
                    </div>
                  ) : activities.activity.length > 0 ? (
                    <div className="space-y-6">
                      {/* Activity Section - Visible to all */}
                      <div className="space-y-4">
                        <div className="flex items-center justify-between">
                          <h3 className="text-xl font-medium text-black">
                            ACTIVITY
                          </h3>
                          <div className="text-2xl text-[#6B7280]">1</div>
                        </div>
                        <div className="relative">
                          {activities.activity.map((activity, index) => (
                            <div
                              key={index}
                              className={cn(
                                "mb-4 rounded-[24px] border border-[#E5E7EB] bg-white p-6",
                                plan === "free" && "select-none"
                              )}
                              onCopy={preventCopy}
                              onCut={preventCopy}
                              onMouseDown={preventCopy}
                              onKeyDown={preventCopy}
                            >
                              <div className="mb-4 flex justify-end gap-2">
                                <button
                                  onClick={() => handleCopyActivity(activity)}
                                  className="rounded-full hover:bg-[#F3F4F6] p-2 transition-colors"
                                >
                                  <RiFileCopyLine className="h-5 w-5 text-[#6B7280]" />
                                </button>
                                <button
                                  onClick={handleRegenerateActivities}
                                  className="rounded-full hover:bg-[#F3F4F6] p-2 transition-colors"
                                >
                                  <CiRedo className="h-5 w-5 text-[#6B7280]" />
                                </button>
                              </div>
                              <div
                                className={cn(
                                  "prose prose-lg max-w-none whitespace-pre-wrap text-base leading-relaxed text-black",
                                  plan === "free" && "select-none"
                                )}
                              >
                                {activity
                                  .split("\n")
                                  .map((paragraph, pIndex) => (
                                    <p key={pIndex} className="mb-4 last:mb-0">
                                      {paragraph}
                                    </p>
                                  ))}
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>

                      {/* Creativity Section - Blurred for free users */}
                      <div className="space-y-4 relative">
                        <div className="flex items-center justify-between">
                          <h3 className="text-xl font-medium text-black">
                            CREATIVITY
                          </h3>
                          <div className="text-2xl text-[#6B7280]">2</div>
                        </div>
                        <div
                          className={cn(
                            "relative",
                            plan === "free" && "blur-[2px] pointer-events-none"
                          )}
                        >
                          {activities.creativity.map((activity, index) => (
                            <div
                              key={index}
                              className="mb-4 rounded-[24px] border border-[#E5E7EB] bg-white p-6"
                            >
                              <div className="mb-4 flex justify-end gap-2">
                                <button className="rounded-full hover:bg-[#F3F4F6] p-2 transition-colors">
                                  <RiFileCopyLine className="h-5 w-5 text-[#6B7280]" />
                                </button>
                                <button
                                  onClick={handleRegenerateActivities}
                                  className="rounded-full hover:bg-[#F3F4F6] p-2 transition-colors"
                                >
                                  <CiRedo className="h-5 w-5 text-[#6B7280]" />
                                </button>
                              </div>
                              <div className="prose prose-lg max-w-none whitespace-pre-wrap text-base leading-relaxed text-black">
                                {activity
                                  .split("\n")
                                  .map((paragraph, pIndex) => (
                                    <p key={pIndex} className="mb-4 last:mb-0">
                                      {paragraph}
                                    </p>
                                  ))}
                              </div>
                            </div>
                          ))}
                        </div>
                        {plan === "free" && (
                          <div className="absolute inset-0 z-10 flex items-center justify-center bg-white/60 backdrop-blur-[2px]">
                            <div className="text-center">
                              <Lock className="w-12 h-12 text-[#7857FF] mx-auto mb-4" />
                              <p className="text-lg font-medium text-black mb-4">
                                Upgrade to Premium to unlock Creativity
                                activities
                              </p>
                              <Button
                                onClick={() => router.push("/payment")}
                                className="rounded-full bg-[#7857FF] hover:bg-[#6544FF] text-white px-8"
                              >
                                Upgrade Now
                              </Button>
                            </div>
                          </div>
                        )}
                      </div>

                      {/* Service Section - Blurred for free users */}
                      <div className="space-y-4 relative">
                        <div className="flex items-center justify-between">
                          <h3 className="text-xl font-medium text-black">
                            SERVICE
                          </h3>
                          <div className="text-2xl text-[#6B7280]">3</div>
                        </div>
                        <div
                          className={cn(
                            "relative",
                            plan === "free" && "blur-[2px] pointer-events-none"
                          )}
                        >
                          {activities.service.map((activity, index) => (
                            <div
                              key={index}
                              className="mb-4 rounded-[24px] border border-[#E5E7EB] bg-white p-6"
                            >
                              <div className="mb-4 flex justify-end gap-2">
                                <button className="rounded-full hover:bg-[#F3F4F6] p-2 transition-colors">
                                  <RiFileCopyLine className="h-5 w-5 text-[#6B7280]" />
                                </button>
                                <button
                                  onClick={handleRegenerateActivities}
                                  className="rounded-full hover:bg-[#F3F4F6] p-2 transition-colors"
                                >
                                  <CiRedo className="h-5 w-5 text-[#6B7280]" />
                                </button>
                              </div>
                              <div className="prose prose-lg max-w-none whitespace-pre-wrap text-base leading-relaxed text-black">
                                {activity
                                  .split("\n")
                                  .map((paragraph, pIndex) => (
                                    <p key={pIndex} className="mb-4 last:mb-0">
                                      {paragraph}
                                    </p>
                                  ))}
                              </div>
                            </div>
                          ))}
                        </div>
                        {plan === "free" && (
                          <div className="absolute inset-0 z-10 flex items-center justify-center bg-white/60 backdrop-blur-[2px]">
                            <div className="text-center">
                              <Lock className="w-12 h-12 text-[#7857FF] mx-auto mb-4" />
                              <p className="text-lg font-medium text-black mb-4">
                                Upgrade to Premium to unlock Service activities
                              </p>
                              <Button
                                onClick={() => router.push("/payment")}
                                className="rounded-full bg-[#7857FF] hover:bg-[#6544FF] text-white px-8"
                              >
                                Upgrade Now
                              </Button>
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  ) : null}
                </div>
              </div>
            )}

            {activeTab === "recommendation" && (
              <div className="space-y-8">
                <div className="rounded-full bg-[#F3F4F6] px-6 py-2 text-sm font-medium text-black w-fit">
                  RECOMMENDATION LETTERS
                </div>

                {plan === "free" ? (
                  <div className="relative">
                    {/* Blurred Content */}
                    <div className="blur-[2px] pointer-events-none">
                      <div className="space-y-6">
                        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-6">
                          <div className="w-full sm:w-[300px] space-y-2">
                            <span className="text-sm font-medium text-black">
                              Recommender's Name:
                            </span>
                            <Input
                              className="w-full rounded-full border-[#E5E7EB] bg-white h-10"
                              placeholder="Type..."
                              disabled
                            />
                          </div>
                          <div className="w-full sm:w-[200px] space-y-2">
                            <span className="text-sm font-medium text-black">
                              Title/Position:
                            </span>
                            <Input
                              className="w-full rounded-full border-[#E5E7EB] bg-white h-10"
                              placeholder="Type..."
                              disabled
                            />
                          </div>
                        </div>
                        <div className="space-y-2">
                          <span className="text-sm font-medium text-black">
                            Relationship Duration:
                          </span>
                          <Input
                            className="w-full rounded-full border-[#E5E7EB] bg-white h-10"
                            placeholder="Type..."
                            disabled
                          />
                        </div>
                        <button
                          className="rounded-full bg-[#7C3AED] px-8 py-2 text-sm font-medium text-white opacity-50"
                          disabled
                        >
                          GENERATE
                        </button>
                      </div>
                    </div>

                    {/* Upgrade Overlay */}
                    <div className="absolute inset-0 bg-white/60 backdrop-blur-[2px] z-10 flex flex-col items-center justify-center">
                      <div className="bg-white p-6 rounded-lg shadow-lg text-center max-w-md">
                        <Lock className="w-12 h-12 text-[#7857FF] mx-auto mb-4" />
                        <h3 className="text-xl font-semibold mb-2">
                          Premium Feature
                        </h3>
                        <p className="text-gray-600 mb-4">
                          Upgrade to Premium to generate AI-powered
                          recommendation letters
                        </p>
                        <Button
                          asChild
                          className="bg-[#7857FF] hover:bg-[#6544FF] text-white rounded-full px-8"
                        >
                          <Link href="/payment">Upgrade Now</Link>
                        </Button>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-4">
                    <RecommendationForm isPremium={isPremium} />
                  </div>
                )}
              </div>
            )}

            {activeTab === "college-list" && (
              <div className="max-w-6xl mx-auto">
                {isGeneratingCollegeList ? (
                  <div className="rounded-[24px] border border-[#E5E7EB] bg-white p-8">
                    <div className="flex flex-col items-center justify-center min-h-[300px]">
                      <div className="flex flex-col items-center space-y-4">
                        <Loader2 className="h-8 w-8 animate-spin text-[#7857FF]" />
                        <div className="text-center space-y-2">
                          <p className="text-lg font-medium text-gray-900">
                            Building Your College List
                          </p>
                          <p className="text-sm text-gray-500">
                            Analyzing your profile to find the best college
                            matches...
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className={premiumContentClass}>
                    <CollegeListForm
                      isPremium={isPremium}
                      isGenerating={isGeneratingCollegeList}
                      setIsGenerating={setIsGeneratingCollegeList}
                    />
                    {!isPremium && <PremiumOverlay />}
                  </div>
                )}
              </div>
            )}
          </main>
        </div>

        {/* Upgrade Modal */}
        {showUpgradeModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
            <div className="w-[400px] rounded-[24px] bg-white p-8 text-center shadow-lg">
              <h3 className="mb-4 text-xl font-semibold text-black">
                Upgrade to Premium Plan
              </h3>
              <p className="mb-6 text-[#6B7280]">
                Upgrade to Premium Plan to generate more essays and unlock
                additional features.
              </p>
              <div className="flex justify-center gap-4">
                <button
                  onClick={() => setShowUpgradeModal(false)}
                  className="rounded-full border border-[#E5E7EB] bg-white px-6 py-2.5 text-sm font-medium text-[#6B7280] transition-colors hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  onClick={() => {
                    // TODO: Add upgrade logic
                    setShowUpgradeModal(false);
                  }}
                  className="rounded-full bg-[#7C3AED] px-6 py-2.5 text-sm font-medium text-white transition-opacity hover:opacity-90"
                >
                  Upgrade Now
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Questionnaire Dialog */}
        <Dialog open={showQuestionnaire} onOpenChange={setShowQuestionnaire}>
          <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-hidden flex flex-col">
            <DialogHeader className="px-2">
              <DialogTitle className="text-xl font-semibold">
                Help us personalize your supplemental essay
              </DialogTitle>
            </DialogHeader>

            {/* Scrollable content area */}
            <div className="flex-1 overflow-y-auto px-2 py-4 custom-scrollbar">
              <div className="space-y-6">
                <div className="space-y-4">
                  {/* Question 1 */}
                  <div className="bg-white rounded-lg p-4">
                    <label className="text-sm font-medium text-black mb-2 block">
                      What are your main academic interests and why do they
                      fascinate you?
                    </label>
                    <Textarea
                      value={questionnaireData.academicInterests}
                      onChange={(e) =>
                        setQuestionnaireData({
                          ...questionnaireData,
                          academicInterests: e.target.value,
                        })
                      }
                      className="min-h-[100px] rounded-[12px] border-[#E5E7EB] focus:border-[#7C3AED] focus:ring-1 focus:ring-[#7C3AED] transition-colors"
                      placeholder="Describe your academic interests..."
                    />
                  </div>

                  {/* Question 2 */}
                  <div className="bg-white rounded-lg p-4">
                    <label className="text-sm font-medium text-black mb-2 block">
                      What's the most significant experience that has shaped who
                      you are?
                    </label>
                    <Textarea
                      value={questionnaireData.significantExperience}
                      onChange={(e) =>
                        setQuestionnaireData({
                          ...questionnaireData,
                          significantExperience: e.target.value,
                        })
                      }
                      className="min-h-[100px] rounded-[12px] border-[#E5E7EB] focus:border-[#7C3AED] focus:ring-1 focus:ring-[#7C3AED] transition-colors"
                      placeholder="Share your experience..."
                    />
                  </div>

                  {/* Question 3 */}
                  <div className="bg-white rounded-lg p-4">
                    <label className="text-sm font-medium text-black mb-2 block">
                      How have you grown as a person in the last few years?
                    </label>
                    <Textarea
                      value={questionnaireData.personalGrowth}
                      onChange={(e) =>
                        setQuestionnaireData({
                          ...questionnaireData,
                          personalGrowth: e.target.value,
                        })
                      }
                      className="min-h-[100px] rounded-[12px] border-[#E5E7EB] focus:border-[#7C3AED] focus:ring-1 focus:ring-[#7C3AED] transition-colors"
                      placeholder="Describe your personal growth..."
                    />
                  </div>

                  {/* Question 4 */}
                  <div className="bg-white rounded-lg p-4">
                    <label className="text-sm font-medium text-black mb-2 block">
                      What are your future goals and aspirations?
                    </label>
                    <Textarea
                      value={questionnaireData.futureGoals}
                      onChange={(e) =>
                        setQuestionnaireData({
                          ...questionnaireData,
                          futureGoals: e.target.value,
                        })
                      }
                      className="min-h-[100px] rounded-[12px] border-[#E5E7EB] focus:border-[#7C3AED] focus:ring-1 focus:ring-[#7C3AED] transition-colors"
                      placeholder="Share your goals..."
                    />
                  </div>

                  {/* Question 5 */}
                  <div className="bg-white rounded-lg p-4">
                    <label className="text-sm font-medium text-black mb-2 block">
                      What challenges have you overcome and what did you learn
                      from them?
                    </label>
                    <Textarea
                      value={questionnaireData.challengesOvercome}
                      onChange={(e) =>
                        setQuestionnaireData({
                          ...questionnaireData,
                          challengesOvercome: e.target.value,
                        })
                      }
                      className="min-h-[100px] rounded-[12px] border-[#E5E7EB] focus:border-[#7C3AED] focus:ring-1 focus:ring-[#7C3AED] transition-colors"
                      placeholder="Describe the challenges..."
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Fixed footer with buttons */}
            <div className="border-t border-gray-200 bg-white px-2 py-4 mt-4">
              <div className="flex justify-end gap-4">
                <Button
                  variant="outline"
                  onClick={() => setShowQuestionnaire(false)}
                  className="rounded-full"
                >
                  Cancel
                </Button>
                <Button
                  onClick={async () => {
                    setShowQuestionnaire(false);
                    setIsGeneratingSupplemental(true);
                    try {
                      await handleGenerateSupplementalEssay();
                    } finally {
                      setIsGeneratingSupplemental(false);
                    }
                  }}
                  disabled={isGeneratingSupplemental}
                  className="rounded-full bg-[#7C3AED] text-white hover:opacity-90"
                >
                  {isGeneratingSupplemental ? (
                    <div className="flex items-center gap-2">
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Generating...
                    </div>
                  ) : (
                    "Generate Essay"
                  )}
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}
