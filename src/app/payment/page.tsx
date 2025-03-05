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
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { CheckCircle, XCircle } from "lucide-react";

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
  plan,
  setCurrentPlan,
  setSubscriptionDetails,
}: {
  onClose: () => void;
  priceId: string;
  plan: (typeof PLANS)[0];
  setCurrentPlan: (plan: string) => void;
  setSubscriptionDetails: (details: any) => void;
}) {
  const stripe = useStripe();
  const elements = useElements();
  const { user } = useUser();
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [couponCode, setCouponCode] = useState("");
  const [isValidatingCoupon, setIsValidatingCoupon] = useState(false);
  const [showConfirmation, setShowConfirmation] = useState(false);
  const [validCoupon, setValidCoupon] = useState<{
    id: string;
    discount: number;
    discountType: "percent" | "fixed";
  } | null>(null);
  const [validationTimeout, setValidationTimeout] =
    useState<NodeJS.Timeout | null>(null);
  const router = useRouter();

  // Debounced coupon validation
  useEffect(() => {
    if (validationTimeout) {
      clearTimeout(validationTimeout);
    }

    if (couponCode.trim()) {
      const timeout = setTimeout(() => {
        setIsValidatingCoupon(true);
        validateCoupon(couponCode);
      }, 1000); // 1 seconds delay
      setValidationTimeout(timeout);
    } else {
      setIsValidatingCoupon(false);
      setValidCoupon(null);
      setError(null);
    }

    return () => {
      if (validationTimeout) {
        clearTimeout(validationTimeout);
      }
    };
  }, [couponCode]);

  const validateCoupon = async (code: string) => {
    try {
      const response = await fetch("/api/stripe/validate-coupon", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ code }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || "Invalid coupon code");
      }

      if (data.valid) {
        setValidCoupon({
          id: data.couponId,
          discount: data.discount,
          discountType: data.discountType,
        });
        setError(null);
        toast.success("Coupon applied successfully!");
      } else {
        setValidCoupon(null);
        throw new Error("Invalid coupon code");
      }
    } catch (err: any) {
      setValidCoupon(null);
      setError(err.message);
      toast.error(err.message);
    } finally {
      setIsValidatingCoupon(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!stripe || !elements || !user) {
      toast.error("Payment system not initialized");
      return;
    }

    const { error: submitError } = await elements.submit();
    if (submitError) {
      setError(submitError.message || "Error submitting payment form");
      return;
    }

    // Show confirmation dialog
    setShowConfirmation(true);
  };

  const handleConfirmPayment = async () => {
    if (!stripe || !elements || !user) return;

    setIsProcessing(true);
    setError(null);

    try {
      // Create payment intent with coupon if valid
      const response = await fetch("/api/stripe/create-payment-intent", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          priceId,
          couponId: validCoupon?.id,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to create payment intent");
      }

      // Confirm payment
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

      if (paymentIntent.status === "succeeded") {
        try {
          // Update subscription
          const updateResponse = await fetch("/api/stripe/confirm-payment", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              priceId,
              paymentIntentId: paymentIntent.id,
              subscriptionId: data.subscriptionId,
            }),
          });

          const updateData = await updateResponse.json();

          if (!updateResponse.ok) {
            throw new Error(
              updateData.error || "Failed to update subscription"
            );
          }

          toast.success(`Successfully upgraded to ${plan.name}!`);

          try {
            // Refresh subscription details before redirecting
            const subscription = await getUserSubscription();
            if (subscription) {
              setCurrentPlan(
                subscription.plan === "yearly"
                  ? PRICE_IDS.yearly
                  : subscription.plan === "monthly"
                  ? PRICE_IDS.monthly
                  : "free"
              );
              setSubscriptionDetails({
                status: subscription.status,
                currentPeriodEnd: subscription.currentPeriodEnd,
                currentPeriodStart: subscription.currentPeriodStart,
                cancelAtPeriodEnd: subscription.cancelAtPeriodEnd,
                planType: subscription.planType,
                isYearly: subscription.plan === "yearly",
                plan: subscription.plan,
              });
            }
          } catch (refreshError) {
            console.error(
              "Error refreshing subscription details:",
              refreshError
            );
            // Continue with redirect even if refresh fails
          }

          // Redirect after successful payment
          router.push("/dashboard?success=true");
        } catch (updateError) {
          console.error("Error updating subscription:", updateError);
          // Still show success since payment went through
          toast.success(
            `Payment successful! Please refresh the page to see updated details.`
          );
          router.push("/dashboard?success=true");
        }
      }
    } catch (err: any) {
      console.error("Error confirming payment:", err);
      toast.error(err.message || "Failed to confirm payment");
    } finally {
      setIsProcessing(false);
      setShowConfirmation(false);
    }
  };

  return (
    <>
      <form onSubmit={handleSubmit} className="space-y-6">
        <PaymentElement />

        <div className="space-y-4">
          <div className="space-y-2">
            <Label>Coupon Code</Label>
            <div className="relative">
              <Input
                type="text"
                placeholder="Enter coupon code"
                value={couponCode}
                onChange={(e) => setCouponCode(e.target.value)}
                className={cn(
                  "pr-10",
                  validCoupon &&
                    "border-green-500 focus-visible:ring-green-500",
                  error && "border-red-500 focus-visible:ring-red-500"
                )}
                disabled={isValidatingCoupon}
              />
              <div className="absolute right-3 top-1/2 -translate-y-1/2">
                {isValidatingCoupon && (
                  <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-gray-900" />
                )}
                {validCoupon && !isValidatingCoupon && (
                  <CheckCircle className="h-5 w-5 text-green-500" />
                )}
                {error && !isValidatingCoupon && (
                  <XCircle className="h-5 w-5 text-red-500" />
                )}
              </div>
            </div>
            {validCoupon && (
              <p className="text-sm text-green-600">
                {validCoupon.discountType === "percent"
                  ? `${validCoupon.discount}% discount applied`
                  : `$${validCoupon.discount / 100} discount applied`}
              </p>
            )}
            {error && <p className="text-sm text-red-500">{error}</p>}
          </div>
        </div>

        <div className="flex gap-3">
          <Button
            type="submit"
            disabled={
              isProcessing || !stripe || !elements || isValidatingCoupon
            }
            className="flex-1 bg-[#47B5FF] text-white"
          >
            {isProcessing ? (
              <div className="flex items-center justify-center">
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Processing...
              </div>
            ) : isValidatingCoupon ? (
              "Validating coupon..."
            ) : (
              "Continue to payment"
            )}
          </Button>
          <Button
            type="button"
            onClick={onClose}
            variant="outline"
            className="flex-1"
          >
            Cancel
          </Button>
        </div>
      </form>

      <Dialog open={showConfirmation} onOpenChange={setShowConfirmation}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Confirm Payment</DialogTitle>
            <DialogDescription>
              Please review your payment details
            </DialogDescription>
          </DialogHeader>

          <div className="py-4">
            <PriceBreakdown
              basePrice={plan.price}
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
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setShowConfirmation(false)}
              disabled={isProcessing}
            >
              Cancel
            </Button>
            <Button
              onClick={handleConfirmPayment}
              disabled={isProcessing}
              className="bg-[#47B5FF] text-white"
            >
              {isProcessing ? (
                <div className="flex items-center justify-center">
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Processing...
                </div>
              ) : (
                "Confirm Payment"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
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

function formatDate(dateString: string) {
  return new Date(dateString).toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}

function SubscriptionDetails({
  subscription,
  onCancel,
  isCancelling,
}: {
  subscription: any;
  onCancel: () => void;
  isCancelling: boolean;
}) {
  const isCanceled = subscription?.cancelAtPeriodEnd;
  const endDate = subscription?.currentPeriodEnd
    ? formatDate(subscription.currentPeriodEnd)
    : null;
  const startDate = subscription?.currentPeriodStart
    ? formatDate(subscription.currentPeriodStart)
    : null;

  return (
    <div className="mb-8 p-6 bg-white rounded-lg shadow-sm border">
      <div className="flex justify-between items-start mb-4">
        <h2 className="text-xl font-semibold">Current Plan Details</h2>
        {subscription?.status === "active" &&
          !isCanceled &&
          subscription?.plan !== "free" && (
            <Button
              onClick={onCancel}
              disabled={isCancelling}
              variant="outline"
              className="text-red-600 hover:text-red-700 hover:bg-red-50"
            >
              {isCancelling ? (
                <div className="flex items-center">
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Cancelling...
                </div>
              ) : (
                "Cancel Plan"
              )}
            </Button>
          )}
      </div>
      <div className="space-y-3">
        <div className="flex justify-between items-center">
          <span className="text-gray-600">Plan Type:</span>
          <span className="font-medium">
            {subscription?.plan === "yearly"
              ? "Premium Plan (Yearly)"
              : subscription?.plan === "monthly"
              ? "Premium Plan (Monthly)"
              : "Free Plan"}
          </span>
        </div>
        <div className="flex justify-between items-center">
          <span className="text-gray-600">Status:</span>
          <span
            className={cn(
              "font-medium",
              isCanceled ? "text-yellow-600" : "text-green-600"
            )}
          >
            {isCanceled ? "Canceling" : "Active"}
          </span>
        </div>
        {startDate && (
          <div className="flex justify-between items-center">
            <span className="text-gray-600">Started On:</span>
            <span className="font-medium">{startDate}</span>
          </div>
        )}
        {endDate && (
          <div className="flex justify-between items-center">
            <span className="text-gray-600">
              {isCanceled ? "Access Until" : "Renews On"}:
            </span>
            <span className="font-medium">{endDate}</span>
          </div>
        )}
        {isCanceled && (
          <p className="text-sm text-yellow-600 mt-4">
            Your subscription will remain active until {endDate}, after which it
            will revert to the free plan.
          </p>
        )}
      </div>
    </div>
  );
}

export default function PaymentPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [currentPlan, setCurrentPlan] = useState<string>("free");
  const [loading, setLoading] = useState(true);
  const [isLoading, setIsLoading] = useState<string | null>(null);
  const [selectedPlan, setSelectedPlan] = useState<(typeof PLANS)[0] | null>(
    null
  );
  const [clientSecret, setClientSecret] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [subscriptionDetails, setSubscriptionDetails] = useState<any>(null);
  const [isCancelling, setIsCancelling] = useState(false);

  useEffect(() => {
    async function loadSubscription() {
      try {
        const subscription = await getUserSubscription();
        if (subscription) {
          console.log("Loaded subscription:", {
            subscription,
            yearlyPriceId: PRICE_IDS.yearly,
            monthlyPriceId: PRICE_IDS.monthly,
            currentPriceId: subscription.priceId,
            plan: subscription.plan,
          });

          // Set current plan based on the subscription's plan type
          if (subscription.plan === "yearly") {
            setCurrentPlan(PRICE_IDS.yearly);
          } else if (subscription.plan === "monthly") {
            setCurrentPlan(PRICE_IDS.monthly);
          } else {
            setCurrentPlan("free");
          }

          // Set full subscription details
          setSubscriptionDetails({
            status: subscription.status,
            currentPeriodEnd: subscription.currentPeriodEnd,
            currentPeriodStart: subscription.currentPeriodStart,
            cancelAtPeriodEnd: subscription.cancelAtPeriodEnd,
            planType: subscription.planType,
            isYearly: subscription.plan === "yearly",
            plan: subscription.plan,
          });

          // Show toast with correct plan type
          if (subscription.status === "active") {
            const endDate = new Date(subscription.currentPeriodEnd);
            toast.info(
              `Your ${
                subscription.plan === "yearly"
                  ? "Premium Plan (Yearly)"
                  : "Premium Plan (Monthly)"
              } is valid until ${endDate.toLocaleDateString()}`
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

    if (searchParams?.get("success")) {
      toast.success("Payment successful! Your plan has been upgraded.");
      router.push("/dashboard");
    }
    if (searchParams?.get("canceled")) {
      toast.error("Payment canceled.");
    }
  }, [searchParams, router]);

  const handleUpgrade = async (plan: (typeof PLANS)[0]) => {
    try {
      setIsLoading(plan.priceId);
      const response = await fetch("/api/stripe/create-checkout", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          priceId: plan.priceId,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to create checkout session");
      }

      setClientSecret(data.clientSecret);
      setSelectedPlan(plan);
    } catch (error: any) {
      console.error("Error creating checkout session:", error);
      setError(error.message || "Failed to start checkout process");
      toast.error(error.message || "Failed to start checkout process");
    } finally {
      setIsLoading(null);
    }
  };

  const handleCancelSubscription = async () => {
    try {
      setIsCancelling(true);

      const response = await fetch("/api/stripe/cancel-subscription", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to cancel subscription");
      }

      toast.success(data.message || "Your subscription has been cancelled");

      // Refresh subscription details
      const subscription = await getUserSubscription();
      if (subscription) {
        setCurrentPlan(
          subscription.plan === "yearly"
            ? PRICE_IDS.yearly
            : subscription.plan === "monthly"
            ? PRICE_IDS.monthly
            : "free"
        );
        setSubscriptionDetails({
          status: subscription.status,
          currentPeriodEnd: subscription.currentPeriodEnd,
          currentPeriodStart: subscription.currentPeriodStart,
          cancelAtPeriodEnd: subscription.cancelAtPeriodEnd,
          planType: subscription.planType,
          isYearly: subscription.plan === "yearly",
          plan: subscription.plan,
        });
      }
    } catch (error) {
      console.error("Error cancelling subscription:", error);
      toast.error(
        error instanceof Error ? error.message : "Failed to cancel subscription"
      );
    } finally {
      setIsCancelling(false);
    }
  };

  if (loading) {
    return <div>Loading...</div>;
  }

  return (
    <div className="container max-w-5xl mx-auto p-6 space-y-8">
      {subscriptionDetails && (
        <SubscriptionDetails
          subscription={subscriptionDetails}
          onCancel={handleCancelSubscription}
          isCancelling={isCancelling}
        />
      )}
      <h1 className="text-3xl font-bold text-center mb-12">
        {currentPlan === "free" ? "Upgrade your plan" : "Available Plans"}
      </h1>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {PLANS.map((plan) => {
          // Determine if this is the current plan
          const isCurrentPlan =
            (plan.priceId === PRICE_IDS.monthly &&
              currentPlan === PRICE_IDS.monthly) ||
            (plan.priceId === PRICE_IDS.yearly &&
              currentPlan === PRICE_IDS.yearly) ||
            (plan.priceId === "free" && currentPlan === "free");

          console.log("Plan comparison:", {
            planPriceId: plan.priceId,
            currentPlan,
            isCurrentPlan,
            yearlyMatch:
              plan.priceId === PRICE_IDS.yearly &&
              currentPlan === PRICE_IDS.yearly,
            monthlyMatch:
              plan.priceId === PRICE_IDS.monthly &&
              currentPlan === PRICE_IDS.monthly,
            planName: plan.name,
          });

          return (
            <div
              key={plan.priceId}
              className={cn(
                "rounded-[20px] border p-6 flex flex-col justify-between bg-white shadow-sm",
                isCurrentPlan && "border-[#47B5FF] ring-1 ring-[#47B5FF]",
                selectedPlan?.priceId === plan.priceId &&
                  "border-[#47B5FF] ring-1 ring-[#47B5FF]"
              )}
            >
              <div>
                <h2 className="text-xl font-semibold mb-2">{plan.name}</h2>
                <div className="flex items-baseline mb-6">
                  <span className="text-3xl font-bold">
                    {plan.displayPrice}
                  </span>
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

              <button
                onClick={() => !isCurrentPlan && handleUpgrade(plan)}
                disabled={isLoading === plan.priceId || isCurrentPlan}
                className={cn(
                  "mt-6 w-full py-3 px-4 rounded-full font-medium transition-colors",
                  isCurrentPlan
                    ? "bg-green-100 text-green-700 cursor-not-allowed"
                    : plan.priceId === "free"
                    ? "bg-gray-100 text-gray-500 cursor-not-allowed"
                    : "bg-[#47B5FF] text-white hover:bg-[#47B5FF]/90"
                )}
              >
                {isLoading === plan.priceId ? (
                  <div className="flex items-center justify-center">
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Processing...
                  </div>
                ) : isCurrentPlan ? (
                  "Current Plan"
                ) : plan.priceId === "free" ? (
                  "Free Plan"
                ) : (
                  plan.buttonText
                )}
              </button>
            </div>
          );
        })}
      </div>

      {clientSecret && selectedPlan && (
        <div className="mt-8 max-w-2xl mx-auto p-6 border rounded-[20px] bg-white shadow-sm">
          <div className="text-center mb-6">
            <h3 className="text-xl font-semibold mb-2">
              Complete your upgrade to {selectedPlan.name}
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
                setSelectedPlan(null);
                setError(null);
              }}
              priceId={selectedPlan.priceId}
              plan={selectedPlan}
              setCurrentPlan={setCurrentPlan}
              setSubscriptionDetails={setSubscriptionDetails}
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
