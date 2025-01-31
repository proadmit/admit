import { SignUp } from "@clerk/nextjs";
import { Metadata } from "next";

export const metadata: Metadata = {
  title: "Sign Up - NazranAdmit",
  description: "Create your NazranAdmit account",
};

export default function SignUpPage() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background">
      <SignUp
        redirectUrl="/personal-info"
        appearance={{
          elements: {
            rootBox: "mx-auto",
            card: "bg-background border-border shadow-sm",
            headerTitle: "text-foreground",
            headerSubtitle: "text-muted-foreground",
            socialButtonsBlockButton:
              "bg-background text-foreground border-border hover:bg-muted",
            formButtonPrimary:
              "bg-primary text-primary-foreground hover:bg-primary/90",
            footerActionLink: "text-primary hover:text-primary/90",
          },
        }}
      />
    </div>
  );
}
