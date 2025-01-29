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
import Image from "next/image";
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
      window.alert("Please select a prompt first");
      return;
    }

    try {
      setIsGenerating(true);
      const promptText =
        selectedPrompt === "7"
          ? customPrompt
          : PROMPTS.find((p) => p.id === selectedPrompt)?.text;

      const response = await fetch("/api/generate-personal-statement", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          prompt: promptText,
          customPrompt: selectedPrompt === "7" ? customPrompt : undefined,
        }),
      });

      if (!response.ok) {
        throw new Error("Failed to generate personal statement");
      }

      const data = await response.json();
      setGeneratedEssay(data.essay);
    } catch (error) {
      console.error("Error generating personal statement:", error);
      window.alert("Failed to generate personal statement. Please try again.");
    } finally {
      setIsGenerating(false);
    }
  };

  const handleRegenerate = () => {
    if (plan === "free") {
      router.push("/payment");
    } else {
      handleGenerate();
    }
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(generatedEssay);
    // TODO: Add toast notification
  };

  const handleGenerateActivities = async () => {
    try {
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

      if (!response.ok) {
        throw new Error("Failed to generate activities");
      }

      const data = await response.json();
      setActivities(data.activities);
    } catch (error) {
      console.error("Error generating activities:", error);
      window.alert("Failed to generate activities. Please try again.");
    } finally {
      setIsGenerating(false);
    }
  };

  const handleGenerateSupplementalEssay = async () => {
    try {
      setIsGeneratingSupplemental(true);
      const response = await fetch("/api/generate-essay", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(supplementalForm),
      });

      if (!response.ok) {
        throw new Error("Failed to generate essay");
      }

      const data = await response.json();
      setSupplementalEssay(data.essay);
    } catch (error) {
      console.error("Error generating essay:", error);
      window.alert("Failed to generate essay. Please try again.");
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

  return (
    <div className="container mx-auto p-4">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-2xl font-bold">Welcome, {userDisplayName}</h1>
          <p className="text-sm text-muted-foreground">
            Current Plan:{" "}
            <span className="font-medium capitalize">{currentPlan}</span>
            {isLoadingSubscription && <span className="ml-2">Loading...</span>}
          </p>
        </div>
        {currentPlan === "free" && (
          <Button onClick={() => router.push("/payment")} variant="default">
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
                    <Image
                      src="/assets/admit.png"
                      alt="Profile"
                      width={40}
                      height={40}
                      className="h-full w-full object-cover"
                    />
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
            href="mailto:hello@admit.uz"
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
              <div className="space-y-8">
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
                    <button
                      onClick={handleGenerate}
                      disabled={!selectedPrompt || isGenerating}
                      className="w-full sm:w-auto rounded-full bg-[#7C3AED] px-8 py-2 text-sm font-medium text-white transition-opacity hover:opacity-90 disabled:opacity-50 whitespace-nowrap"
                    >
                      {isGenerating ? "Generating..." : "GENERATE"}
                    </button>
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

                {selectedPrompt && !isGenerating && (
                  <div className="rounded-[24px] border border-[#E5E7EB] bg-white p-6">
                    <div className="mb-4 flex justify-end gap-2">
                      <button
                        onClick={handleCopy}
                        className="rounded-full hover:bg-[#F3F4F6] p-2 transition-colors"
                      >
                        <RiFileCopyLine className="h-5 w-5 text-[#6B7280]" />
                      </button>
                      <button
                        onClick={handleRegenerate}
                        className="rounded-full hover:bg-[#F3F4F6] p-2 transition-colors"
                      >
                        <svg
                          width="20"
                          height="20"
                          viewBox="0 0 20 20"
                          fill="none"
                          xmlns="http://www.w3.org/2000/svg"
                        >
                          <path
                            d="M4.5 2V5.5M4.5 5.5C6.5 3.5 9.5 3.5 11.5 5.5C13.5 7.5 13.5 10.5 11.5 12.5L4.5 19.5M4.5 5.5H1M15.5 18V14.5M15.5 14.5C13.5 16.5 10.5 16.5 8.5 14.5C6.5 12.5 6.5 9.5 8.5 7.5L15.5 0.5M15.5 14.5H19"
                            stroke="#6B7280"
                            strokeWidth="1.5"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                          />
                        </svg>
                      </button>
                    </div>
                    <div className="min-h-[300px] whitespace-pre-wrap text-base leading-relaxed text-black">
                      {generatedEssay ||
                        "Your generated essay will appear here..."}
                    </div>
                  </div>
                )}
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
                        <button
                          className="rounded-full bg-[#7C3AED] px-8 py-2 text-sm font-medium text-white opacity-50"
                          disabled
                        >
                          GENERATE
                        </button>
                      </div>
                    </div>

                    {/* Upgrade Overlay */}
                    <div className="absolute inset-0 flex flex-col items-center justify-center gap-4 bg-white/50">
                      <p className="text-center text-lg font-medium text-black">
                        Upgrade to Premium Plan to generate
                      </p>
                      <button
                        onClick={() => router.push("/payment")}
                        className="rounded-full bg-[#7C3AED] px-8 py-2 text-sm font-medium text-white transition-opacity hover:opacity-90"
                      >
                        Upgrade Now
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-6">
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
                    <button
                      onClick={handleGenerateSupplementalEssay}
                      disabled={
                        isGeneratingSupplemental ||
                        !supplementalForm.university ||
                        !supplementalForm.wordLimit ||
                        !supplementalForm.prompt
                      }
                      className="rounded-full bg-[#7C3AED] px-8 py-2 text-sm font-medium text-white transition-opacity hover:opacity-90 disabled:opacity-50"
                    >
                      {isGeneratingSupplemental ? "Generating..." : "GENERATE"}
                    </button>

                    {supplementalEssay && (
                      <div className="rounded-[24px] border border-[#E5E7EB] bg-white p-6">
                        <div className="mb-4 flex justify-end gap-2">
                          <button
                            onClick={() => {
                              navigator.clipboard.writeText(supplementalEssay);
                              window.alert("Essay copied to clipboard");
                            }}
                            className="rounded-full hover:bg-[#F3F4F6] p-2 transition-colors"
                          >
                            <RiFileCopyLine className="h-5 w-5 text-[#6B7280]" />
                          </button>
                          <button
                            onClick={handleGenerateSupplementalEssay}
                            className="rounded-full hover:bg-[#F3F4F6] p-2 transition-colors"
                          >
                            <svg
                              width="20"
                              height="20"
                              viewBox="0 0 20 20"
                              fill="none"
                              xmlns="http://www.w3.org/2000/svg"
                            >
                              <path
                                d="M4.5 2V5.5M4.5 5.5C6.5 3.5 9.5 3.5 11.5 5.5C13.5 7.5 13.5 10.5 11.5 12.5L4.5 19.5M4.5 5.5H1M15.5 18V14.5M15.5 14.5C13.5 16.5 10.5 16.5 8.5 14.5C6.5 12.5 6.5 9.5 8.5 7.5L15.5 0.5M15.5 14.5H19"
                                stroke="#6B7280"
                                strokeWidth="1.5"
                                strokeLinecap="round"
                                strokeLinejoin="round"
                              />
                            </svg>
                          </button>
                        </div>
                        <div className="min-h-[300px] whitespace-pre-wrap text-base leading-relaxed text-black">
                          {supplementalEssay}
                        </div>
                      </div>
                    )}
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
                      {isGenerating ? "Generating..." : "GENERATE"}
                    </button>
                  </div>

                  {activities.activity.length > 0 && (
                    <div className="space-y-6">
                      {/* Activity Section */}
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
                                !isPremium &&
                                  index >= 3 &&
                                  "blur-[2px] pointer-events-none"
                              )}
                            >
                              <div className="mb-4 flex justify-end gap-2">
                                <button className="rounded-full hover:bg-[#F3F4F6] p-2 transition-colors">
                                  <RiFileCopyLine className="h-5 w-5 text-[#6B7280]" />
                                </button>
                                <button
                                  onClick={() =>
                                    !isPremium && setShowUpgradeModal(true)
                                  }
                                  className="rounded-full hover:bg-[#F3F4F6] p-2 transition-colors"
                                >
                                  <svg
                                    width="20"
                                    height="20"
                                    viewBox="0 0 20 20"
                                    fill="none"
                                  >
                                    <path
                                      d="M4.5 2V5.5M4.5 5.5C6.5 3.5 9.5 3.5 11.5 5.5C13.5 7.5 13.5 10.5 11.5 12.5L4.5 19.5M4.5 5.5H1M15.5 18V14.5M15.5 14.5C13.5 16.5 10.5 16.5 8.5 14.5C6.5 12.5 6.5 9.5 8.5 7.5L15.5 0.5M15.5 14.5H19"
                                      stroke="#6B7280"
                                      strokeWidth="1.5"
                                      strokeLinecap="round"
                                      strokeLinejoin="round"
                                    />
                                  </svg>
                                </button>
                              </div>
                              <div className="whitespace-pre-wrap text-base leading-relaxed text-black">
                                {activity}
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>

                      {/* Creativity Section */}
                      <div className="space-y-4">
                        <div className="flex items-center justify-between">
                          <h3 className="text-xl font-medium text-black">
                            CREATIVITY
                          </h3>
                          <div className="text-2xl text-[#6B7280]">2</div>
                        </div>
                        <div className="relative">
                          {activities.creativity.map((activity, index) => (
                            <div
                              key={index}
                              className={cn(
                                "mb-4 rounded-[24px] border border-[#E5E7EB] bg-white p-6",
                                !isPremium &&
                                  index >= 3 &&
                                  "blur-[2px] pointer-events-none"
                              )}
                            >
                              <div className="mb-4 flex justify-end gap-2">
                                <button className="rounded-full hover:bg-[#F3F4F6] p-2 transition-colors">
                                  <RiFileCopyLine className="h-5 w-5 text-[#6B7280]" />
                                </button>
                                <button
                                  onClick={() =>
                                    !isPremium && setShowUpgradeModal(true)
                                  }
                                  className="rounded-full hover:bg-[#F3F4F6] p-2 transition-colors"
                                >
                                  <svg
                                    width="20"
                                    height="20"
                                    viewBox="0 0 20 20"
                                    fill="none"
                                  >
                                    <path
                                      d="M4.5 2V5.5M4.5 5.5C6.5 3.5 9.5 3.5 11.5 5.5C13.5 7.5 13.5 10.5 11.5 12.5L4.5 19.5M4.5 5.5H1M15.5 18V14.5M15.5 14.5C13.5 16.5 10.5 16.5 8.5 14.5C6.5 12.5 6.5 9.5 8.5 7.5L15.5 0.5M15.5 14.5H19"
                                      stroke="#6B7280"
                                      strokeWidth="1.5"
                                      strokeLinecap="round"
                                      strokeLinejoin="round"
                                    />
                                  </svg>
                                </button>
                              </div>
                              <div className="whitespace-pre-wrap text-base leading-relaxed text-black">
                                {activity}
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>

                      {/* Service Section */}
                      <div className="space-y-4">
                        <div className="flex items-center justify-between">
                          <h3 className="text-xl font-medium text-black">
                            SERVICE
                          </h3>
                          <div className="text-2xl text-[#6B7280]">3</div>
                        </div>
                        <div className="relative">
                          {activities.service.map((activity, index) => (
                            <div
                              key={index}
                              className={cn(
                                "mb-4 rounded-[24px] border border-[#E5E7EB] bg-white p-6",
                                !isPremium &&
                                  index >= 3 &&
                                  "blur-[2px] pointer-events-none"
                              )}
                            >
                              <div className="mb-4 flex justify-end gap-2">
                                <button className="rounded-full hover:bg-[#F3F4F6] p-2 transition-colors">
                                  <RiFileCopyLine className="h-5 w-5 text-[#6B7280]" />
                                </button>
                                <button
                                  onClick={() =>
                                    !isPremium && setShowUpgradeModal(true)
                                  }
                                  className="rounded-full hover:bg-[#F3F4F6] p-2 transition-colors"
                                >
                                  <svg
                                    width="20"
                                    height="20"
                                    viewBox="0 0 20 20"
                                    fill="none"
                                  >
                                    <path
                                      d="M4.5 2V5.5M4.5 5.5C6.5 3.5 9.5 3.5 11.5 5.5C13.5 7.5 13.5 10.5 11.5 12.5L4.5 19.5M4.5 5.5H1M15.5 18V14.5M15.5 14.5C13.5 16.5 10.5 16.5 8.5 14.5C6.5 12.5 6.5 9.5 8.5 7.5L15.5 0.5M15.5 14.5H19"
                                      stroke="#6B7280"
                                      strokeWidth="1.5"
                                      strokeLinecap="round"
                                      strokeLinejoin="round"
                                    />
                                  </svg>
                                </button>
                              </div>
                              <div className="whitespace-pre-wrap text-base leading-relaxed text-black">
                                {activity}
                              </div>
                            </div>
                          ))}

                          {!isPremium && (
                            <div className="absolute inset-0 flex items-center justify-center top-[200px]">
                              <div className="text-center">
                                <p className="text-lg font-medium text-black mb-4">
                                  Upgrade to Premium to unlock all activities
                                </p>
                                <button
                                  onClick={() => setShowUpgradeModal(true)}
                                  className="rounded-full bg-[#7C3AED] px-8 py-2 text-sm font-medium text-white transition-opacity hover:opacity-90"
                                >
                                  Upgrade Now
                                </button>
                              </div>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}

            {activeTab === "recommendation" && (
              <div className="space-y-4">
                <RecommendationForm isPremium={isPremium} />
              </div>
            )}

            {activeTab === "college-list" && (
              <div className="max-w-6xl mx-auto">
                <CollegeListForm isPremium={isPremium} />
              </div>
            )}
          </main>
        </div>

        <div className="mt-4 text-center text-sm text-[#9CA3AF]">
          © 2024 Admit.uz. All rights reserved
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
      </div>
    </div>
  );
}
