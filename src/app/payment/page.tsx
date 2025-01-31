"use client";

import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { getUserSubscription } from "./actions";
import { toast } from "sonner";
import { loadStripe } from "@stripe/stripe-js";
import {
  Elements,
  PaymentElement,
  useStripe,
  useElements,
} from "@stripe/react-stripe-js";
import { Button } from "@/components/ui/button";
import { Loader2 } from "lucide-react";

const stripePromise = loadStripe(
  process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY!
);

const PRICE_IDS = {
  monthly: process.env.NEXT_PUBLIC_STRIPE_MONTHLY_PRICE_ID!,
  yearly: process.env.NEXT_PUBLIC_STRIPE_YEARLY_PRICE_ID!,
} as const;

// Payment form component
function CheckoutForm({
  onClose,
  priceId,
}: {
  onClose: () => void;
  priceId: string;
}) {
  const stripe = useStripe();
  const elements = useElements();
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!stripe || !elements) return;

    setIsProcessing(true);
    setError(null);

    try {
      // Submit the payment form
      const { error: submitError } = await elements.submit();
      if (submitError) {
        throw submitError;
      }

      // Confirm the payment
      const { error: confirmError, paymentIntent } =
        await stripe.confirmPayment({
          elements,
          redirect: "if_required",
        });

      if (confirmError) {
        throw confirmError;
      }

      if (!paymentIntent) {
        throw new Error("Payment failed");
      }

      // Send confirmation to our API
      const response = await fetch("/api/stripe/confirm-payment", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          paymentIntentId: paymentIntent.id,
          priceId: priceId,
        }),
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || "Payment confirmation failed");
      }

      // Update local state with new subscription data
      if (data.success) {
        toast.success("Payment successful! Your plan has been upgraded.");
        router.refresh();
        router.push("/dashboard?success=true");
      }
    } catch (err: any) {
      console.error("Payment error:", err);
      setError(err.message || "Something went wrong");
      toast.error(err.message || "Payment failed");
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="mt-6 space-y-4">
      <PaymentElement />
      {error && <div className="text-red-500 text-sm">{error}</div>}
      <div className="flex gap-3">
        <button
          type="submit"
          disabled={isProcessing || !stripe || !elements}
          className="flex-1 bg-[#0A2FFF] text-white rounded-full py-3 font-medium disabled:opacity-50"
        >
          {isProcessing ? "Processing..." : "Subscribe"}
        </button>
        <button
          type="button"
          onClick={onClose}
          className="flex-1 bg-gray-100 text-gray-600 rounded-full py-3 font-medium hover:bg-gray-200"
        >
          Cancel
        </button>
      </div>
    </form>
  );
}

const PLANS = [
  {
    name: "Free Plan",
    price: "$0",
    period: "USD/month",
    priceId: "free",
    features: [
      "AI platform access",
      "Limited Personal Statement",
      "Limited Extracurricular Activities",
      "General Application",
    ],
  },
  {
    name: "Premium Plan",
    price: "$10",
    period: "USD/month",
    priceId: "price_monthly_test",
    features: [
      "AI platform access",
      "Unlimited Personal Statements",
      "Unlimited Supplemental Essays",
      "Extracurricular Activities with AI",
      "Advanced & Unique Application",
      "Recommendation Letters with AI",
      "Cancel anytime.",
    ],
  },
  {
    name: "Premium Plan\nfor a year",
    price: "$80",
    period: "USD/year",
    priceId: "price_yearly_test",
    features: [
      "A 33% Discount in yearly plan",
      "AI platform access",
      "Unlimited Personal Statements",
      "Unlimited Supplemental Essays",
      "Extracurricular Activities with AI",
      "Advanced & Unique Application",
      "Recommendation Letters with AI",
      "Cancel anytime.",
    ],
  },
];

export default function PaymentPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [currentPlan, setCurrentPlan] = useState<string>("free");
  const [loading, setLoading] = useState(true);
  const [isProcessing, setIsProcessing] = useState(false);
  const [selectedPlanId, setSelectedPlanId] = useState<string | null>(null);
  const [clientSecret, setClientSecret] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    async function loadSubscription() {
      try {
        const subscription = await getUserSubscription();
        if (subscription) {
          setCurrentPlan(subscription.priceId);
          // If user has an active subscription, show their current plan details
          if (subscription.status === "active") {
            const endDate = new Date(subscription.currentPeriodEnd);
            toast.info(
              `Your current plan is valid until ${endDate.toLocaleDateString()}`
            );
          }
        }
      } catch (error) {
        console.error("Error loading subscription:", error);
        toast.error("Failed to load subscription details");
      } finally {
        setLoading(false);
      }
    }

    loadSubscription();

    // Check for success/canceled params
    const success = searchParams.get("success");
    const canceled = searchParams.get("canceled");

    if (success) {
      toast.success("Successfully upgraded your plan!");
      router.push("/dashboard");
    }

    if (canceled) {
      toast.error("Payment canceled. Please try again.");
    }
  }, [searchParams, router]);

  async function handleCancel() {
    try {
      setIsProcessing(true);

      const response = await fetch("/api/stripe/cancel-subscription", {
        method: "POST",
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to cancel subscription");
      }

      toast.success(
        "Subscription cancelled successfully. Your plan has been reverted to free plan."
      );
      window.location.reload();
    } catch (error: any) {
      console.error("Error cancelling subscription:", error);
      toast.error(
        error.message || "Failed to cancel subscription. Please try again."
      );
    } finally {
      setIsProcessing(false);
    }
  }

  const handleUpgrade = async (priceId: string) => {
    try {
      setIsLoading(true);
      const response = await fetch("/api/stripe/create-checkout", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          priceId,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to create checkout session");
      }

      window.location.href = data.url;
    } catch (error) {
      console.error("Error:", error);
      toast.error("Failed to process payment");
    } finally {
      setIsLoading(false);
    }
  };

  if (loading) {
    return <div>Loading...</div>;
  }

  return (
    <div className="min-h-screen bg-white px-4 py-12 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-7xl">
        {process.env.NODE_ENV === "development" && (
          <div className="mb-8 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
            <h2 className="text-lg font-semibold text-yellow-800 mb-2">
              🧪 Test Mode
            </h2>
            <p className="text-sm text-yellow-700 mb-2">
              Use these test card numbers:
            </p>
            <ul className="text-sm text-yellow-700 space-y-1">
              <li>Success: 4242 4242 4242 4242</li>
              <li>Decline: 4000 0000 0000 0002</li>
              <li>Use any future date for expiry (e.g., 12/25)</li>
              <li>Use any 3 digits for CVC</li>
            </ul>
          </div>
        )}

        <h1 className="text-center text-4xl font-bold text-black mb-16">
          Upgrade your plan
        </h1>

        {/* Show cancel button if user has active subscription */}
        {currentPlan !== "free" && (
          <div className="text-center mb-8">
            <button
              onClick={handleCancel}
              disabled={isProcessing}
              className="inline-flex items-center px-6 py-3 border border-red-500 text-red-500 rounded-full hover:bg-red-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 transition-colors"
            >
              {isProcessing ? (
                "Cancelling..."
              ) : (
                <>
                  <svg
                    className="mr-2 h-5 w-5"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M6 18L18 6M6 6l12 12"
                    />
                  </svg>
                  Cancel Current Subscription
                </>
              )}
            </button>
          </div>
        )}

        <div className="relative">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-0">
            {PLANS.map((plan) => (
              <div key={plan.priceId} className="relative">
                <div className="h-full rounded-none first:rounded-l-[32px] last:rounded-r-[32px] border border-[#E5E7EB] bg-white p-8">
                  <div className="mb-8">
                    <h3 className="text-2xl font-semibold text-black whitespace-pre-line">
                      {plan.name}
                    </h3>
                    <div className="mt-4 flex items-baseline">
                      <span className="text-4xl font-bold text-black">
                        {plan.price}
                      </span>
                      <span className="ml-1 text-sm text-[#6B7280]">
                        {plan.period}
                      </span>
                    </div>
                  </div>

                  {currentPlan === plan.priceId ? (
                    <button
                      disabled
                      className="w-full rounded-full bg-[#E5E7EB] px-6 py-3 text-base font-medium text-[#6B7280] mb-8"
                    >
                      Your current plan
                    </button>
                  ) : (
                    <Button
                      className="w-full"
                      onClick={() => handleUpgrade(plan.priceId)}
                      disabled={isLoading}
                    >
                      {isLoading ? (
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      ) : null}
                      {plan.priceId === "free"
                        ? "Downgrade to Free"
                        : plan.period === "USD/month"
                        ? "Upgrade to Premium"
                        : "Upgrade to Year Premium"}
                    </Button>
                  )}

                  <ul className="space-y-4">
                    {plan.features.map((feature, index) => (
                      <li key={index} className="flex items-start">
                        <svg
                          className="mr-3 h-5 w-5 flex-shrink-0 text-[#0A2FFF] mt-0.5"
                          fill="none"
                          viewBox="0 0 24 24"
                          stroke="currentColor"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M5 13l4 4L19 7"
                          />
                        </svg>
                        <span className="text-[#6B7280] text-base">
                          {feature}
                        </span>
                      </li>
                    ))}
                  </ul>
                </div>

                {selectedPlanId === plan.priceId && clientSecret && (
                  <div className="absolute left-1/2 transform -translate-x-1/2 mt-4 w-full max-w-md z-10">
                    <div className="rounded-[20px] border border-[#E5E7EB] bg-white p-6 shadow-lg mx-4">
                      <div className="text-center mb-4">
                        <h4 className="text-lg font-medium text-gray-900">
                          Complete your upgrade
                        </h4>
                        <p className="text-sm text-gray-500">
                          Enter your payment details below
                        </p>
                      </div>
                      <Elements
                        stripe={stripePromise}
                        options={{
                          clientSecret,
                          appearance: {
                            theme: "stripe",
                            variables: {
                              colorPrimary: "#0A2FFF",
                              borderRadius: "8px",
                              colorBackground: "#ffffff",
                              colorText: "#1a1f36",
                              colorDanger: "#df1b41",
                              spacingUnit: "4px",
                              fontFamily:
                                "system-ui, -apple-system, sans-serif",
                            },
                            rules: {
                              ".Label": {
                                marginBottom: "8px",
                                color: "#6b7280",
                              },
                              ".Input": {
                                padding: "12px",
                                border: "1px solid #e5e7eb",
                                borderRadius: "8px",
                              },
                            },
                          },
                        }}
                      >
                        <CheckoutForm
                          onClose={() => {
                            setSelectedPlanId(null);
                            setClientSecret(null);
                          }}
                          priceId={plan.priceId}
                        />
                      </Elements>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>

        <div className="mt-8 text-center text-sm text-[#9CA3AF]">
          © 2024 Admit.uz. All rights reserved
        </div>
      </div>
    </div>
  );
}
