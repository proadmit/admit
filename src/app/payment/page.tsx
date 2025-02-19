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
  const [couponCode, setCouponCode] = useState("");
  const router = useRouter();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!stripe || !elements) {
      toast.error("Payment system not initialized");
      return;
    }

    setIsProcessing(true);
    setError(null);

    try {
      // First validate coupon if provided
      if (couponCode.trim()) {
        console.log("⭐ Attempting to validate coupon:", {
          code: couponCode,
          length: couponCode.length,
          trimmed: couponCode.trim()
        });
        
        const couponResponse = await fetch("/api/stripe/validate-coupon", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ code: couponCode }),
        });

        const couponData = await couponResponse.json();
        console.log("⭐ Coupon validation response:", {
          status: couponResponse.status,
          ok: couponResponse.ok,
          data: couponData
        });

        if (!couponResponse.ok) {
          throw new Error(couponData.message || "Invalid coupon code");
        }
      }

      toast.loading("Processing your payment...");

      // Submit the payment form
      const { error: submitError } = await elements.submit();
      if (submitError) {
        throw submitError;
      }

      // Create payment intent with coupon
      const createIntentResponse = await fetch("/api/stripe/create-payment-intent", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          priceId,
          couponCode: couponCode.trim() || undefined,
        }),
      });

      if (!createIntentResponse.ok) {
        throw new Error("Failed to create payment intent");
      }

      const { clientSecret } = await createIntentResponse.json();

      // Confirm the payment
      const { error: paymentError, paymentIntent } = await stripe.confirmPayment({
        elements,
        clientSecret,
        redirect: "if_required",
      });

      if (paymentError) {
        throw paymentError;
      }

      if (!paymentIntent) {
        throw new Error("Payment failed - No payment intent returned");
      }

      if (paymentIntent.status === "succeeded") {
        toast.dismiss();
        toast.loading("Payment successful! Upgrading your plan...");

        // Update subscription in our database
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
          console.error("Subscription update failed:", data);
          throw new Error(
            data.details || data.error || "Failed to update subscription"
          );
        }

        toast.dismiss();
        toast.success("Your plan has been upgraded successfully!");

        // Redirect to dashboard after a short delay
        setTimeout(() => {
          router.push("/dashboard?success=true");
        }, 1500);
      } else {
        throw new Error(`Payment status: ${paymentIntent.status}`);
      }
    } catch (err: any) {
      console.error("Detailed payment error:", {
        error: err,
        message: err.message,
        stack: err.stack
      });
      toast.dismiss();
      console.error("Payment error:", err);
      setError(err.message || "Payment failed. Please try again.");
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <PaymentElement />
      
      {/* Add coupon input */}
      <div className="mt-4">
        <label htmlFor="coupon" className="block text-sm font-medium text-gray-700 mb-1">
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
      price: "$0",
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
      price: "$10",
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
      price: "$80",
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
  const [validCoupon, setValidCoupon] = useState<{
    discount: number;
    discountType: 'percent' | 'fixed';
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

  const validateCoupon = async () => {
    if (!couponCode.trim()) return;

    setIsValidatingCoupon(true);
    try {
      const response = await fetch("/api/stripe/validate-coupon", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code: couponCode }),
      });

      const data = await response.json();

      if (response.ok && data.valid) {
        setValidCoupon({
          discount: data.discount,
          discountType: data.discountType,
        });
        toast({
          title: "Success!",
          description: data.message || `Coupon applied: ${data.discountType === 'percent' ? 
            `${data.discount}% off` : 
            `$${data.discount/100} off`}`,
        });
      } else {
        setValidCoupon(null);
        toast({
          title: "Error",
          description: data.message || "Invalid coupon code",
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error("Error validating coupon:", error);
      toast({
        title: "Error",
        description: "Failed to validate coupon. Please try again.",
        variant: "destructive",
      });
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
            className="rounded-[20px] border p-6 flex flex-col justify-between bg-white shadow-sm"
          >
            <div>
              <h2 className="text-xl font-semibold mb-2">{plan.name}</h2>
              <div className="flex items-baseline mb-6">
                <span className="text-3xl font-bold">{plan.price}</span>
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
                onClick={() => handleUpgrade(plan.priceId)}
                disabled={
                  isLoading === plan.priceId || plan.priceId === currentPlan
                }
                className={`mt-6 w-full py-3 px-4 rounded-full font-medium ${
                  plan.priceId === currentPlan
                    ? "bg-gray-100 text-gray-500 cursor-not-allowed"
                    : "bg-[#47B5FF] text-white hover:bg-[#47B5FF]/90 transition-colors"
                }`}
              >
                {isLoading === plan.priceId ? (
                  <div className="flex items-center justify-center">
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Processing...
                  </div>
                ) : plan.priceId === currentPlan ? (
                  "Current Plan"
                ) : plan.period === "USD/month" ? (
                  "Upgrade to Premium"
                ) : (
                  "Upgrade to Year Premium"
                )}
              </button>
            )}
            </div>
          ))}
        </div>

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
