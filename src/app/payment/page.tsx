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
import { Input } from "@/components/ui/input";
import { useUser } from "@clerk/nextjs";
import { cn } from "@/lib/utils";

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
  const { user } = useUser();
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [couponCode, setCouponCode] = useState("");
  const router = useRouter();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!stripe || !elements || !user) {
      toast.error("Payment system not initialized");
      return;
    }

    setIsProcessing(true);
    setError(null);

    try {
      // Log the user info first
      console.log("Starting payment process for user:", {
        clerkId: user.id,
        email: user.emailAddresses[0]?.emailAddress,
      });

      const { error: submitError } = await elements.submit();
      if (submitError) {
        throw submitError;
      }

      // Create payment intent with logging
      console.log("Creating payment intent for:", { priceId });
      const response = await fetch("/api/stripe/create-payment-intent", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          priceId,
          userId: user.id,
        }),
      });

      const data = await response.json();
      console.log("Payment intent response:", data);

      if (!response.ok) {
        throw new Error(data.error || "Failed to create payment intent");
      }

      toast.success("Processing payment...");

      // Confirm payment with logging
      console.log("Confirming payment...");
      const { error: confirmError, paymentIntent } =
        await stripe.confirmPayment({
          elements,
          clientSecret: data.clientSecret,
          confirmParams: {
            payment_method_data: {
              billing_details: {
                email: user.emailAddresses[0]?.emailAddress,
              },
            },
          },
          redirect: "if_required",
        });

      if (confirmError) {
        throw confirmError;
      }

      console.log("Payment confirmation result:", paymentIntent);

      if (paymentIntent.status === "succeeded") {
        toast.success("Payment successful! Updating your plan...");

        // Update plan with detailed logging
        console.log("Sending plan update request...");
        const updateResponse = await fetch("/api/update-plan", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            priceId,
            paymentIntentId: paymentIntent.id, // Add payment intent ID for tracking
          }),
        });

        const updateData = await updateResponse.json();
        console.log("Plan update response:", updateData);

        if (!updateResponse.ok) {
          throw new Error(updateData.error || "Failed to update plan");
        }

        // Verify the update immediately
        console.log("Verifying plan update...");
        const verifyResponse = await fetch("/api/subscription");
        const verifyData = await verifyResponse.json();
        console.log("Current subscription status:", verifyData);

        if (verifyData.plan === "free") {
          throw new Error("Plan update verification failed");
        }

        toast.success(`Successfully upgraded to ${updateData.plan} plan!`);
        router.push("/dashboard?success=true");
      }
    } catch (err: any) {
      console.error("Payment process error:", err);
      setError(err.message || "Payment failed. Please try again.");
      toast.error(err.message || "Payment failed. Please try again.");
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <PaymentElement />

      {/* Add coupon input */}
      <div className="mt-4">
        <label
          htmlFor="coupon"
          className="block text-sm font-medium text-gray-700 mb-1"
        >
          Have a coupon? (Optional)
        </label>
        <div className="flex gap-2">
          <input
            id="coupon"
            type="text"
            value={couponCode}
            onChange={(e) => setCouponCode(e.target.value)}
            placeholder="Enter coupon code"
            className="flex-1 rounded-md border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#47B5FF] focus:border-transparent"
          />
        </div>
      </div>

      {error && (
        <div className="text-red-500 text-sm bg-red-50 p-3 rounded-lg">
          {error}
        </div>
      )}

      <div className="flex gap-3">
        <button
          type="submit"
          disabled={isProcessing || !stripe || !elements}
          className="flex-1 bg-[#47B5FF] text-white rounded-full py-3 font-medium disabled:opacity-50 hover:bg-[#47B5FF]/90 transition-colors"
        >
          {isProcessing ? (
            <div className="flex items-center justify-center">
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              Processing...
            </div>
          ) : (
            "Pay now"
          )}
        </button>
        <button
          type="button"
          onClick={onClose}
          className="flex-1 bg-gray-100 text-gray-600 rounded-full py-3 font-medium hover:bg-gray-200 transition-colors"
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
    price: 0,
    displayPrice: "$0",
    period: "USD/month",
    priceId: "free",
    buttonText: "Your current plan",
    buttonClass: "bg-gray-200 text-gray-600 cursor-not-allowed",
    features: [
      "AI platform access",
      "Limited Personal Statement",
      "Limited Extracurricular Activities",
      "General Application",
    ],
  },
  {
    name: "Premium Plan",
    price: 10,
    displayPrice: "$10",
    period: "USD/month",
    priceId: PRICE_IDS.monthly,
    buttonText: "Upgrade to Premium",
    buttonClass: "bg-[#47B5FF] text-white hover:bg-[#47B5FF]/90",
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
    name: "Premium Plan for a year",
    price: 80,
    displayPrice: "$80",
    period: "USD/year",
    priceId: PRICE_IDS.yearly,
    buttonText: "Upgrade to Year Premium",
    buttonClass: "bg-[#47B5FF] text-white hover:bg-[#47B5FF]/90",
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

// Add price breakdown component
const PriceBreakdown = ({
  basePrice,
  discountPercentage = 0,
  discountAmount = 0,
}: {
  basePrice: number;
  discountPercentage?: number;
  discountAmount?: number;
}) => {
  // Calculate discount on base price only
  const discountValue =
    discountPercentage > 0
      ? (basePrice * discountPercentage) / 100
      : discountAmount;

  const finalTotal = basePrice - discountValue;

  return (
    <div className="space-y-3 border-t border-gray-200 pt-4">
      <div className="flex justify-between text-sm">
        <span className="text-gray-600">Base Price:</span>
        <span className="font-medium">${basePrice.toFixed(2)}</span>
      </div>
      {discountValue > 0 && (
        <div className="flex justify-between text-sm">
          <span className="text-green-600">
            Discount {discountPercentage > 0 ? `(${discountPercentage}%)` : ""}:
          </span>
          <span className="font-medium text-green-600">
            -${discountValue.toFixed(2)}
          </span>
        </div>
      )}
      <div className="flex justify-between border-t border-gray-200 pt-3 text-base">
        <span className="font-semibold">Total:</span>
        <span className="font-bold text-[#47B5FF]">
          ${finalTotal.toFixed(2)}
        </span>
      </div>
    </div>
  );
};

export default function PaymentPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [currentPlan, setCurrentPlan] = useState<string>("free");
  const [loading, setLoading] = useState(true);
  const [isLoading, setIsLoading] = useState<string | null>(null);
  const [selectedPlanId, setSelectedPlanId] = useState<string | null>(null);
  const [clientSecret, setClientSecret] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [couponCode, setCouponCode] = useState("");
  const [isValidatingCoupon, setIsValidatingCoupon] = useState(false);
  const [selectedPlan, setSelectedPlan] = useState<(typeof PLANS)[0] | null>(
    null
  );
  const [validCoupon, setValidCoupon] = useState<{
    discount: number;
    discountType: "percent" | "fixed";
    code: string;
  } | null>(null);

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

    // Check for success or canceled status
    if (searchParams?.get("success")) {
      toast.success("Payment successful! Your plan has been upgraded.");
      router.push("/dashboard");
    }
    if (searchParams?.get("canceled")) {
      toast.error("Payment canceled.");
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
      setIsLoading(priceId);
      setSelectedPlanId(priceId);
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

      setClientSecret(data.clientSecret);
    } catch (error: any) {
      console.error("Error creating checkout session:", error);
      setError(error.message || "Failed to start checkout process");
      toast.error(error.message || "Failed to start checkout process");
    } finally {
      setIsLoading(null);
    }
  };

  // Function to handle plan selection
  const handlePlanSelect = (plan: (typeof PLANS)[0]) => {
    setSelectedPlan(plan);
    setSelectedPlanId(plan.priceId);
  };

  // Modify validateCoupon function
  const validateCoupon = async () => {
    if (!couponCode.trim() || !selectedPlan) return;

    setIsValidatingCoupon(true);
    try {
      const response = await fetch("/api/stripe/validate-coupon", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          code: couponCode,
          planPrice: selectedPlan.price,
        }),
      });

      const data = await response.json();

      if (response.ok && data.valid) {
        setValidCoupon({
          discount: data.discount,
          discountType: data.discountType,
          code: couponCode,
        });
        toast.success(
          `Coupon applied: ${
            data.discountType === "percent"
              ? `${data.discount}% off`
              : `$${data.discount / 100} off`
          }`
        );
      } else {
        setValidCoupon(null);
        toast.error(data.message || "Invalid coupon code");
      }
    } catch (error) {
      console.error("Error validating coupon:", error);
      toast.error("Failed to validate coupon. Please try again.");
    } finally {
      setIsValidatingCoupon(false);
    }
  };

  if (loading) {
    return <div>Loading...</div>;
  }

  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold text-center mb-12">
        Upgrade your plan
      </h1>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {PLANS.map((plan) => (
          <div
            key={plan.priceId}
            className={cn(
              "rounded-[20px] border p-6 flex flex-col justify-between bg-white shadow-sm",
              selectedPlan?.priceId === plan.priceId &&
                "border-[#47B5FF] ring-1 ring-[#47B5FF]"
            )}
          >
            <div>
              <h2 className="text-xl font-semibold mb-2">{plan.name}</h2>
              <div className="flex items-baseline mb-6">
                <span className="text-3xl font-bold">{plan.displayPrice}</span>
                <span className="text-gray-500 ml-1">{plan.period}</span>
              </div>

              <ul className="space-y-3">
                {plan.features.map((feature, index) => (
                  <li key={index} className="flex items-start gap-2">
                    <svg
                      className="w-5 h-5 text-[#47B5FF] flex-shrink-0"
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
                    <span className="text-gray-600">{feature}</span>
                  </li>
                ))}
              </ul>
            </div>

            {plan.priceId === "free" ? (
              <button
                disabled
                className="mt-6 w-full py-3 px-4 rounded-full font-medium bg-gray-100 text-gray-500 cursor-not-allowed"
              >
                Your current plan
              </button>
            ) : (
              <button
                onClick={() => handlePlanSelect(plan)}
                disabled={
                  isLoading === plan.priceId || plan.priceId === currentPlan
                }
                className={cn(
                  "mt-6 w-full py-3 px-4 rounded-full font-medium",
                  plan.priceId === currentPlan
                    ? "bg-gray-100 text-gray-500 cursor-not-allowed"
                    : "bg-[#47B5FF] text-white hover:bg-[#47B5FF]/90 transition-colors"
                )}
              >
                {isLoading === plan.priceId ? (
                  <div className="flex items-center justify-center">
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Processing...
                  </div>
                ) : plan.priceId === currentPlan ? (
                  "Current Plan"
                ) : (
                  plan.buttonText
                )}
              </button>
            )}
          </div>
        ))}
      </div>

      {selectedPlan && selectedPlan.priceId !== "free" && (
        <div className="mt-8 max-w-2xl mx-auto">
          <div className="rounded-[20px] border bg-white p-6 shadow-sm">
            <h3 className="text-xl font-semibold mb-6">Order Summary</h3>

            {/* Coupon Input */}
            <div className="mb-6">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Have a coupon code?
              </label>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={couponCode}
                  onChange={(e) => setCouponCode(e.target.value)}
                  placeholder="Enter code"
                  className="flex-1 rounded-full border border-gray-300 px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#47B5FF] focus:border-transparent"
                />
                <Button
                  onClick={validateCoupon}
                  disabled={isValidatingCoupon || !couponCode.trim()}
                  className="rounded-full bg-[#47B5FF] text-white hover:bg-[#47B5FF]/90"
                >
                  {isValidatingCoupon ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    "Apply"
                  )}
                </Button>
              </div>
            </div>

            {/* Price Breakdown */}
            <PriceBreakdown
              basePrice={selectedPlan.price}
              discountPercentage={
                validCoupon?.discountType === "percent"
                  ? validCoupon.discount
                  : 0
              }
              discountAmount={
                validCoupon?.discountType === "fixed"
                  ? validCoupon.discount / 100
                  : 0
              }
            />

            <div className="mt-6 flex justify-end gap-4">
              <Button
                variant="outline"
                onClick={() => {
                  setSelectedPlan(null);
                  setSelectedPlanId(null);
                  setValidCoupon(null);
                  setCouponCode("");
                }}
                className="rounded-full"
              >
                Cancel
              </Button>
              <Button
                onClick={() => handleUpgrade(selectedPlan.priceId)}
                disabled={isLoading === selectedPlan.priceId}
                className="rounded-full bg-[#47B5FF] text-white hover:bg-[#47B5FF]/90"
              >
                {isLoading === selectedPlan.priceId ? (
                  <div className="flex items-center justify-center">
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Processing...
                  </div>
                ) : (
                  "Confirm Payment"
                )}
              </Button>
            </div>
          </div>
        </div>
      )}

      {clientSecret && selectedPlanId && (
        <div className="mt-8 max-w-2xl mx-auto p-6 border rounded-[20px] bg-white shadow-sm">
          <div className="text-center mb-6">
            <h3 className="text-xl font-semibold mb-2">
              Complete your upgrade
            </h3>
            <p className="text-gray-600">Enter your payment details below</p>
          </div>
          <Elements
            stripe={stripePromise}
            options={{
              clientSecret,
              appearance: {
                theme: "stripe",
                variables: {
                  colorPrimary: "#47B5FF",
                  borderRadius: "8px",
                },
              },
            }}
          >
            <CheckoutForm
              onClose={() => {
                setClientSecret(null);
                setSelectedPlanId(null);
                setError(null);
              }}
              priceId={selectedPlanId}
            />
          </Elements>
        </div>
      )}

      {error && <div className="mt-4 text-center text-red-500">{error}</div>}

      <div className="mt-8 text-center text-sm text-gray-500">
        Secure, 1-click checkout with Link
      </div>
    </div>
  );
}
