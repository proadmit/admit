import { toast } from "@/components/ui/use-toast";

export const showToast = {
  error: (message: string) => {
    toast({
      variant: "destructive",
      title: "Error",
      description: message,
    });
  },
  success: (message: string) => {
    toast({
      title: "Success",
      description: message,
    });
  },
}; 