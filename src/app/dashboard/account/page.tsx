"use client";

import { useUser, useClerk } from "@clerk/nextjs";
import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { toast } from "@/components/ui/toast/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Loader2 } from "lucide-react";

export default function AccountPage() {
  const router = useRouter();
  const { user, isLoaded } = useUser();
  const clerk = useClerk();
  const [isUpdating, setIsUpdating] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [formData, setFormData] = useState({
    firstName: user?.firstName || "",
    lastName: user?.lastName || "",
  });
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Update form data when user data is loaded
  useEffect(() => {
    if (isLoaded && user) {
      console.log("Initial user data:", {
        firstName: user.firstName,
        lastName: user.lastName,
        fullName: user.fullName,
        metadata: user.unsafeMetadata,
      });

      setFormData({
        firstName: user.unsafeMetadata?.name || "",
        lastName: user.unsafeMetadata?.surname || "",
      });
    }
  }, [isLoaded, user]);

  if (!isLoaded) {
    return (
      <div className="flex h-[450px] w-full items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  const handleUpdateProfile = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!user) {
      toast({
        title: "Error",
        description: "User not found. Please try logging in again.",
        variant: "destructive",
      });
      return;
    }

    try {
      setIsUpdating(true);

      const firstName = formData.firstName.trim();
      const lastName = formData.lastName.trim();

      // Validate input
      if (!firstName || !lastName) {
        toast({
          title: "Error",
          description: "First name and last name are required",
          variant: "destructive",
        });
        return;
      }

      // Get current metadata
      const currentMetadata = user.unsafeMetadata || {};

      // Prepare update data
      const updateData = {
        unsafeMetadata: {
          ...currentMetadata,
          name: firstName,
          surname: lastName,
          hasCompletedPersonalInfo: true,
        },
      };

      console.log("Updating with data:", updateData);

      // Attempt update with retry logic
      let retryCount = 0;
      const maxRetries = 3;

      while (retryCount < maxRetries) {
        try {
          await user.update(updateData);
          console.log("Update successful");

          toast({
            title: "Success",
            description: "Profile updated successfully",
          });

          router.refresh();
          break;
        } catch (updateError: any) {
          console.error(
            `Update attempt ${retryCount + 1} failed:`,
            updateError
          );

          if (retryCount === maxRetries - 1) {
            throw updateError; // Throw on last retry
          }

          retryCount++;
          await new Promise((resolve) => setTimeout(resolve, 1000)); // Wait 1s before retry
        }
      }
    } catch (error: any) {
      console.error("Error updating profile:", {
        error,
        message: error.message,
        status: error.status,
        data: error.data,
      });

      toast({
        title: "Error",
        description:
          "Failed to update profile. Please check your internet connection and try again.",
        variant: "destructive",
      });
    } finally {
      setIsUpdating(false);
    }
  };

  const handleDeleteAccount = async () => {
    if (
      !window.confirm(
        "Are you sure you want to delete your account? This action cannot be undone."
      )
    ) {
      return;
    }

    setIsDeleting(true);

    try {
      await user?.delete();
      router.push("/");
      toast({
        title: "Success",
        description: "Account deleted successfully",
      });
    } catch (error) {
      console.error("Error deleting account:", error);
      toast({
        title: "Error",
        description: "Failed to delete account. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsDeleting(false);
    }
  };

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user) return;

    try {
      // Check file type
      if (!file.type.startsWith("image/")) {
        toast({
          title: "Error",
          description: "Please select an image file",
          variant: "destructive",
        });
        return;
      }

      // Check file size (max 5MB)
      if (file.size > 5 * 1024 * 1024) {
        toast({
          title: "Error",
          description: "Image must be less than 5MB",
          variant: "destructive",
        });
        return;
      }

      await user.setProfileImage({ file });

      toast({
        title: "Success",
        description: "Profile picture updated successfully",
      });

      router.refresh();
    } catch (error) {
      console.error("Error updating profile image:", error);
      toast({
        title: "Error",
        description: "Failed to update profile picture. Please try again.",
        variant: "destructive",
      });
    }
  };

  const handlePasswordReset = async () => {
    try {
      if (!user?.emailAddresses?.[0]?.emailAddress) {
        toast({
          title: "Error",
          description: "No email address found",
          variant: "destructive",
        });
        return;
      }

      await clerk.signOut();

      router.push(
        `/auth/sign-in?reset_password=${user.emailAddresses[0].emailAddress}`
      );

      toast({
        title: "Success",
        description: "You will be redirected to reset your password",
      });
    } catch (error) {
      console.error("Error requesting password reset:", error);
      toast({
        title: "Error",
        description: "Failed to initiate password reset. Please try again.",
        variant: "destructive",
      });
    }
  };

  return (
    <div className="container max-w-4xl py-8">
      <h1 className="text-3xl font-bold mb-8">Account Settings</h1>

      <div className="grid gap-8">
        {/* Profile Section */}
        <Card>
          <CardHeader>
            <CardTitle>Profile</CardTitle>
            <CardDescription>Manage your profile information</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="mb-6">
              <div className="flex items-center gap-4">
                <Avatar className="h-20 w-20">
                  <AvatarImage
                    src={user?.imageUrl}
                    alt={user?.fullName || ""}
                  />
                  <AvatarFallback>
                    {user?.firstName?.charAt(0)}
                    {user?.lastName?.charAt(0)}
                  </AvatarFallback>
                </Avatar>
                <div>
                  <input
                    type="file"
                    ref={fileInputRef}
                    className="hidden"
                    accept="image/*"
                    onChange={handleFileSelect}
                  />
                  <Button
                    variant="outline"
                    onClick={() => fileInputRef.current?.click()}
                  >
                    Change Avatar
                  </Button>
                  {user?.imageUrl && (
                    <Button
                      variant="ghost"
                      className="text-red-500 hover:text-red-600 ml-2"
                      onClick={() => user.setProfileImage({ file: null })}
                    >
                      Remove
                    </Button>
                  )}
                </div>
              </div>
            </div>

            <form onSubmit={handleUpdateProfile} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="firstName">First Name</Label>
                  <Input
                    id="firstName"
                    name="firstName"
                    value={formData.firstName}
                    onChange={(e) =>
                      setFormData({ ...formData, firstName: e.target.value })
                    }
                    required
                    className="w-full rounded-lg border p-2"
                    disabled={isUpdating}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="lastName">Last Name</Label>
                  <Input
                    id="lastName"
                    name="lastName"
                    value={formData.lastName}
                    onChange={(e) =>
                      setFormData({ ...formData, lastName: e.target.value })
                    }
                    required
                    className="w-full rounded-lg border p-2"
                    disabled={isUpdating}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  value={user?.primaryEmailAddress?.emailAddress || ""}
                  disabled
                />
              </div>

              <Button
                type="submit"
                disabled={isUpdating}
                className="w-full rounded-lg bg-blue-600 px-4 py-2 text-white hover:bg-blue-700"
              >
                {isUpdating ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Updating...
                  </>
                ) : (
                  "Update Profile"
                )}
              </Button>
            </form>
          </CardContent>
        </Card>

        {/* Security Section */}
        <Card>
          <CardHeader>
            <CardTitle>Security</CardTitle>
            <CardDescription>
              Manage your account security settings
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <Button
              variant="outline"
              onClick={handlePasswordReset}
              className="w-full sm:w-auto"
            >
              Reset Password
            </Button>
          </CardContent>
        </Card>

        {/* Danger Zone */}
        <Card className="border-destructive">
          <CardHeader>
            <CardTitle className="text-destructive">Danger Zone</CardTitle>
            <CardDescription>
              Permanently delete your account and all associated data
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button
              variant="destructive"
              onClick={handleDeleteAccount}
              disabled={isDeleting}
            >
              {isDeleting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Delete Account
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
