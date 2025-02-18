"use client";

import { useRouter } from "next/navigation";
import { z } from "zod";
import { useUser } from "@clerk/nextjs";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import countries from "world-countries";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { User, Loader2 } from "lucide-react";
import { useEffect, useState } from "react";

const personalInfoSchema = z.object({
  name: z.string().min(1, "Name is required"),
  surname: z.string().min(1, "Surname is required"),
  gender: z.enum(["Male", "Female", "Other"], {
    required_error: "Please select your gender",
  }),
  country: z.string().min(1, "Please select your country"),
  major: z.string().min(1, "Major is required"),
  achievements: z.string().optional(),
});

type PersonalInfoSchema = z.infer<typeof personalInfoSchema>;

const allCountries = countries.map((country) => ({
  code: country.cca2, // Country Code (e.g., "US", "GB")
  name: country.name.common, // Country Name (e.g., "United States", "United Kingdom")
})).sort((a, b) => a.name.localeCompare(b.name));


export default function PersonalInfoPage() {
  const router = useRouter();
  const { user, isLoaded } = useUser();
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (isLoaded && user) {
      console.log("New User Data:", {
        id: user.id,
        firstName: user.firstName,
        lastName: user.lastName,
        email: user.primaryEmailAddress,
        metadata: user.unsafeMetadata,
      });
    }
  }, [isLoaded, user]);

  // Redirect to dashboard if personal info is already completed
  // useEffect(() => {
  //   if (user?.unsafeMetadata?.hasCompletedPersonalInfo === true) {
  //     router.push("/dashboard");
  //   }
  // }, [user, router]);

  const form = useForm<PersonalInfoSchema>({
    resolver: zodResolver(personalInfoSchema),
    defaultValues: {
      name: "",
      surname: "",
      gender: undefined,
      country: "",
      major: "",
      achievements: "",
    },
  });

  const onSubmit = async (data: PersonalInfoSchema) => {
    setIsLoading(true);
    try {
      // Save to Clerk metadata
      await user?.update({
        unsafeMetadata: {
          ...data,
          hasCompletedPersonalInfo: true,
        },
      });

      console.log("Submitting data:", data);

      // Save to our database
      const response = await fetch("/api/personal-info", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(data),
      });

      const result = await response.json();

      if (!response.ok) {
        console.error("Error response:", result);
        throw new Error(result.error || "Failed to save user data");
      }

      console.log("Success response:", result);

      // Redirect to dashboard page
      router.push("/dashboard");
    } catch (error) {
      console.error("Failed to update personal info:", error);
      // You might want to show this error to the user using a toast or alert
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-white p-4">
      <div className="w-full max-w-[500px] rounded-[32px] border border-gray-200 bg-white p-8 shadow-sm">
        <div className="mb-6 flex items-center justify-center gap-2">
          <div className="rounded-full bg-[#7857FF] p-2">
            <User className="h-5 w-5 text-white" />
          </div>
          <h1 className="text-xl font-semibold text-[#7857FF]">
            PERSONAL INFO
          </h1>
        </div>
        <p className="mb-8 text-center text-sm text-gray-500">
          Fill out your info to make the results accurate
        </p>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-5">
            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-sm font-normal text-gray-600">
                      Name<span className="text-red-500">*</span>
                    </FormLabel>
                    <FormControl>
                      <Input
                        placeholder="Type..."
                        className="rounded-[12px] border-gray-200 bg-white px-4 py-2 text-sm focus:border-[#7857FF] focus:ring-0"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="surname"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-sm font-normal text-gray-600">
                      Surname<span className="text-red-500">*</span>
                    </FormLabel>
                    <FormControl>
                      <Input
                        placeholder="Type..."
                        className="rounded-[12px] border-gray-200 bg-white px-4 py-2 text-sm focus:border-[#7857FF] focus:ring-0"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="gender"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-sm font-normal text-gray-600">
                    Gender<span className="text-red-500">*</span>
                  </FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl>
                      <SelectTrigger className="rounded-[12px] border-gray-200 bg-white px-4 py-2 text-sm focus:border-[#7857FF] focus:ring-0">
                        <SelectValue placeholder="Select" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="Male">Male</SelectItem>
                      <SelectItem value="Female">Female</SelectItem>
                      <SelectItem value="Other">Other</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="country"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-sm font-normal text-gray-600">
                    Your country<span className="text-red-500">*</span>
                  </FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl>
                      <SelectTrigger className="rounded-[12px] border-gray-200 bg-white px-4 py-2 text-sm focus:border-[#7857FF] focus:ring-0">
                        <SelectValue placeholder="Select" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent className="max-h-60 overflow-y-auto">
                    {allCountries.map((country) => (
                        <SelectItem key={country.code} value={country.code}>
                          {country.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="major"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-sm font-normal text-gray-600">
                    Major<span className="text-red-500">*</span>
                  </FormLabel>
                  <FormControl>
                    <Input
                      placeholder="Type..."
                      className="rounded-[12px] border-gray-200 bg-white px-4 py-2 text-sm focus:border-[#7857FF] focus:ring-0"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="achievements"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-sm font-normal text-gray-600">
                    Achievements, Extracurriculars & Honors (Optional)
                  </FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="Type..."
                      className="min-h-[120px] rounded-[12px] border-gray-200 bg-white px-4 py-3 text-sm focus:border-[#7857FF] focus:ring-0"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <Button
              type="submit"
              disabled={isLoading}
              className="mt-6 w-full rounded-full bg-[#7857FF] py-2.5 text-base font-medium text-white hover:opacity-90 disabled:opacity-50"
            >
              {isLoading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Saving...
                </>
              ) : (
                "Continue"
              )}
            </Button>
          </form>
        </Form>
      </div>
    </div>
  );
}
