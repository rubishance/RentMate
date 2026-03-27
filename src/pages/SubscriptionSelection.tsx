import { useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  motion,
  useMotionValue,
  useMotionTemplate,
  animate,
} from "framer-motion";
import { Check, Loader2, ArrowRight } from "lucide-react";
import { GlassCard } from "../components/common/GlassCard";
import { useTranslation } from "../hooks/useTranslation";
import { useAuth } from "../contexts/AuthContext";
import { supabase } from "../lib/supabase";
import { Button } from "../components/ui/Button";
import { isNativePlatform } from "../utils/platform";
import { toast } from "sonner";

interface Plan {
  id: string;
  name: string;
  price: number;
  priceYearly: number;
  description: string;
  features: { text: string }[];
  extendedFeatures?: { text: string }[];
  cta: string;
  buttonVariant:
    | "outline"
    | "primary"
    | "secondary"
    | "ghost"
    | "link"
    | "destructive"
    | "jewel"
    | "aurora"
    | undefined;
  popular?: boolean;
  bgImage?: string;
}

interface PlanCardProps {
  plan: Plan;
  index: number;
  isSelected: boolean;
  billingCycle: "monthly" | "yearly";
  isRtl: boolean;
  loading: boolean;
  onSelect: (id: string) => void;
}

function PlanCard({
  plan,
  index,
  isSelected,
  billingCycle,
  isRtl,
  loading,
  onSelect,
}: PlanCardProps) {
  const mouseX = useMotionValue(0);
  const mouseY = useMotionValue(0);
  const smokeRadius = useMotionValue(0);

  function handleMouseEnter(e: React.MouseEvent<HTMLDivElement>) {
    const { left, top } = e.currentTarget.getBoundingClientRect();
    mouseX.set(e.clientX - left);
    mouseY.set(e.clientY - top);

    // Expand gradually like smoke
    animate(smokeRadius, 1000, { duration: 1.5, ease: "easeOut" });
  }

  function handleMouseLeave() {
    // Contract smoke
    animate(smokeRadius, 0, { duration: 0.8, ease: "easeInOut" });
  }

  function handleMouseMove({
    currentTarget,
    clientX,
    clientY,
  }: React.MouseEvent<HTMLDivElement>) {
    const { left, top } = currentTarget.getBoundingClientRect();
    mouseX.set(clientX - left);
    mouseY.set(clientY - top);
  }

  const bgImgUrl = plan.bgImage || "/plan-bg.jpg";

  return (
    <motion.div
      initial={{ opacity: 0, y: 30 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.4 + index * 0.1, type: "spring", bounce: 0.4 }}
      className="h-full flex"
      onMouseMove={handleMouseMove}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
    >
      <GlassCard
        className={`group relative flex-1 flex flex-col transition-all duration-500 overflow-hidden ${plan.popular ? "border-primary/50 ring-4 ring-primary/10 scale-[1.02] md:scale-105 z-10" : "border-border/50 hover:scale-[1.02]"}`}
      >
        {/* Static Background Layer (Low visibility) */}
        <div className="absolute inset-0 z-0 pointer-events-none rounded-2xl overflow-hidden">
          <div
            className="absolute inset-0 bg-cover bg-center opacity-30 dark:opacity-40"
            style={{ backgroundImage: `url('${bgImgUrl}')` }}
          />
          <div className="absolute inset-0 bg-gradient-to-b from-background/95 via-background/90 to-background/95 dark:from-[#0a0a0a]/95 dark:via-[#0a0a0a]/85 dark:to-[#0a0a0a]/95" />
          {plan.popular && (
            <div className="absolute inset-0 bg-primary/10 dark:bg-primary/20 mix-blend-overlay opacity-30" />
          )}
        </div>

        {/* Animated Smoke Reveal Layer */}
        <motion.div
          className="absolute inset-0 z-0 pointer-events-none rounded-2xl overflow-hidden"
          style={{
            maskImage: useMotionTemplate`radial-gradient(${smokeRadius}px circle at ${mouseX}px ${mouseY}px, black 0%, rgba(0,0,0,0.5) 50%, transparent 100%)`,
            WebkitMaskImage: useMotionTemplate`radial-gradient(${smokeRadius}px circle at ${mouseX}px ${mouseY}px, black 0%, rgba(0,0,0,0.5) 50%, transparent 100%)`,
          }}
        >
          <div
            className="absolute inset-0 bg-cover bg-center opacity-90 dark:opacity-100 scale-105 transition-transform duration-[10s] ease-out group-hover:scale-110"
            style={{ backgroundImage: `url('${bgImgUrl}')` }}
          />
          <div className="absolute inset-0 bg-gradient-to-b from-background/80 via-background/60 to-background/80 dark:from-[#0a0a0a]/80 dark:via-[#0a0a0a]/50 dark:to-[#0a0a0a]/80" />
          {plan.popular && (
            <div className="absolute inset-0 bg-primary/20 dark:bg-primary/30 mix-blend-overlay" />
          )}
        </motion.div>

        {/* Content Layer */}
        <div className="relative z-10 flex flex-col flex-1 p-8">
          {plan.popular ? (
            <div className="flex justify-center mb-6">
              <span className="bg-primary text-primary-foreground text-sm font-black px-4 py-1.5 rounded-full shadow-sm uppercase tracking-widest border border-primary/20">
                {isRtl ? "מומלץ" : "RECOMMENDED"}
              </span>
            </div>
          ) : (
            <div className="flex justify-center mb-6">
              <span className="text-sm px-4 py-1.5 invisible border border-transparent">
                spacer
              </span>
            </div>
          )}

          <div className="flex flex-col items-center justify-center mb-6 text-center">
            <h3
              className={`text-2xl font-black tracking-tight ${plan.id === "investor" ? "text-[#D4AF37] drop-shadow-sm font-serif italic tracking-normal" : "font-mono text-foreground"}`}
              style={
                plan.id === "investor"
                  ? { fontFamily: '"Playfair Display", serif' }
                  : {}
              }
            >
              {plan.name}
            </h3>
          </div>

          <div className="mb-6 flex flex-col items-center text-center">
            <div className="flex items-baseline gap-1 justify-center">
              <span className="text-4xl md:text-5xl font-black text-foreground">
                ₪
                {billingCycle === "monthly"
                  ? plan.price
                  : Math.round(plan.priceYearly / 12)}
              </span>
              <span className="text-muted-foreground font-semibold text-sm">
                {isRtl ? "/חודש" : "/mo"}
              </span>
            </div>
            <p className="text-sm font-medium text-muted-foreground mt-2 px-1">
              {billingCycle === "monthly"
                ? isRtl
                  ? "בחיוב חודשי"
                  : "Billed monthly"
                : isRtl
                  ? `חיוב שנתי של ₪${plan.priceYearly}`
                  : `Billed yearly at ₪${plan.priceYearly}`}
            </p>
          </div>

          <p className="text-base font-medium text-muted-foreground mb-8 min-h-[40px] text-center">
            {plan.description}
          </p>

          <div className="space-y-4 mb-8 flex-1">
            <p className="text-sm font-bold uppercase tracking-widest text-muted-foreground mb-4">
              {isRtl ? "כולל:" : "INCLUDES:"}
            </p>
            {plan.features.map((feature, fIdx) => (
              <div key={fIdx} className="flex items-start gap-3">
                <div
                  className={`p-1 rounded-full shrink-0 mt-0.5 ${plan.id === "investor" ? "bg-[#D4AF37]/20 text-[#D4AF37]" : plan.popular ? "bg-primary/20 text-primary" : "bg-muted-foreground/20 text-muted-foreground"}`}
                >
                  <Check className="w-3.5 h-3.5" strokeWidth={3} />
                </div>
                <span className="text-base font-semibold text-foreground/90">
                  {feature.text}
                </span>
              </div>
            ))}

            {/* Removed extended features from here */}
          </div>

          <Button
            variant={plan.buttonVariant === "aurora" ? "primary" : plan.buttonVariant}
            size="lg"
            className="w-full font-bold h-12 mt-auto"
            disabled={loading}
            onClick={() => onSelect(plan.id)}
          >
            {isSelected ? (
              <Loader2 className="w-5 h-5 animate-spin mx-auto" />
            ) : (
              <span className="flex items-center gap-2 justify-center">
                {plan.cta}
                {plan.buttonVariant === "primary" && (
                  <ArrowRight
                    className={`w-4 h-4 ${isRtl ? "rotate-180" : ""}`}
                  />
                )}
              </span>
            )}
          </Button>
        </div>
      </GlassCard>
    </motion.div>
  );
}

export function SubscriptionSelection() {
  const navigate = useNavigate();
  const { lang } = useTranslation();
  const { user, refreshProfile } = useAuth();
  const isRtl = lang === "he";

  const [billingCycle, setBillingCycle] = useState<"monthly" | "yearly">(
    "monthly",
  );
  const [loading, setLoading] = useState(false);
  const [selectedPlanId, setSelectedPlanId] = useState<string | null>(null);

  // If user already has a distinct plan that is not 'free' from a previous selection,
  // we could potentially redirect them. For now, we enforce this as the step they must complete.

  const plans = [
    {
      id: "free",
      name: "Free",
      price: 0,
      priceYearly: 0,
      description: isRtl
        ? "טעימה מהניהול החכם. מסלול התחלתי לבעלי נכס בודד שרוצים לעשות סדר בבלאגן."
        : "Introduction to smart management for single-unit owners who want order.",
      features: [
        { text: isRtl ? "ניהול חכם של נכס 1" : "Smart management of 1 Asset" },
        {
          text: isRtl
            ? "פענוח חוזה ראשון חינם ב-AI"
            : "1 AI-powered document scan free",
        },
        {
          text: isRtl
            ? "מעקב בסיסי אחר פניות, הכנסות והוצאות"
            : "Basic income, expense & ticket tracking",
        },
        {
          text: isRtl
            ? "תזכורות אוטומטיות לחידוש חוזה"
            : "Automated contract reminders",
        },
      ],
      extendedFeatures: [
        {
          text: isRtl
            ? "ניהול נכס מתקדם בתצוגה אחת"
            : "Advanced single-view property management",
        },
        {
          text: isRtl
            ? "מעקב הכנסות והוצאות לפי נכס"
            : "Income/Expense Tracking per Asset",
        },
        {
          text: isRtl
            ? "מחשבון הצמדות מדד בסיסי"
            : "Basic Indexation Calculator",
        },
        {
          text: isRtl
            ? "התראות מערכת בסיסיות למיילים"
            : "Basic Email System Alerts",
        },
      ],
      cta: isRtl ? "התחל בחינם" : "Start for Free",
      popular: false,
      color: "text-slate-500",
      bg: "bg-background/50",
      buttonVariant: "primary" as const,
    },
    {
      id: "pro",
      name: "Pro",
      price: 49,
      priceYearly: 348,
      description: isRtl
        ? "שקט נפשי מוחלט. אוטומציה שחוסכת לך שעות עבודה חודשיות ועוזרת למנוע טעויות של אלפי שקלים במחיר של 2 כוסות קפה בחודש."
        : "Total peace of mind. Save monthly hours and prevent costly mistakes for the price of 2 cups of coffee.",
      features: [
        {
          text: isRtl ? "ניהול של עד 3 נכסים במקביל" : "Manage up to 3 Assets",
        },
        {
          text: isRtl
            ? "מזעור סיכונים: סריקת חוזים ב-AI ללא הגבלה"
            : "Risk Mitigation: Unlimited AI Contract Scans",
        },
        {
          text: isRtl
            ? "סינון דיירים ופרוטוקולי חתימה דיגיטליים לשקט נפשי"
            : "Tenant screening & digital protocols for peace of mind",
        },
        {
          text: isRtl
            ? "ניהול תזרים צ'קים ואחסון ענן מאובטח"
            : "Checks management & secure storage",
        },
      ],
      extendedFeatures: [
        {
          text: isRtl
            ? "כל הפיצ'רים של תוכנית Basic"
            : "All Basic Plan Features",
        },
        {
          text: isRtl
            ? "יצירת פרוטוקול כניסה/עזיבה בחתימה דיגיטלית מלאה הכוללת תיעוד"
            : "Full Digital Move-in/Move-out Protocols with documentation",
        },
        {
          text: isRtl
            ? "מחשבון מדד מתקדם ושליחת הודעות חישוב מפורטות לשוכר בלחיצת כפתור"
            : "Advanced indexation calculator & sending detailed reports to tenants at the click of a button",
        },
        {
          text: isRtl
            ? "מערכת סינון שוכרים וטפסי קליטה מהירים"
            : "Fast Tenant Screening & Application Flow",
        },
        {
          text: isRtl
            ? "מעקב וניהול מתקדם של תזרים צ'קים דחויים"
            : "Advanced Post-dated Checks Flow Management",
        },
        {
          text: isRtl
            ? "גיבוי ענן מאובטח לכל המסמכים והסרטונים של הנכס"
            : "Secure Cloud Backup for All Docs & Videos",
        },
        {
          text: isRtl
            ? "גישה מלאה לספרייה המשפטית העדכנית"
            : "Full Access to Updated Legal Library",
        },
        {
          text: isRtl
            ? "התראות חכמות למימוש אופציה ועדכון שכר דירה"
            : "Smart alerts for extending options & rent updates",
        },
      ],
      cta: isRtl ? "בחר Pro" : "Select Pro",
      popular: true,
      color: "text-primary", // Blue branding
      bg: "bg-primary/10 dark:bg-primary/20",
      buttonVariant: "primary" as const,
    },
    {
      id: "investor",
      name: "Investor",
      price: 119,
      priceYearly: 1188,
      description: isRtl
        ? "מעטפת פרימיום למשקיעים רציניים. אנחנו נעשה את העבודה הקשה ואת הנהלת החשבונות בשבילך."
        : "Premium suite for serious investors. We do the heavy lifting and accounting.",
      features: [
        {
          text: isRtl
            ? "ניהול של פורטפוליו עד 10 נכסים"
            : "Manage Portfolio up to 10 Assets",
        },
        {
          text: isRtl
            ? "הכל כולל הכל מתוכנית ה-Pro"
            : "Everything included in the Pro Plan",
        },
        {
          text: isRtl
            ? 'תמיכת VIP אישית בוואטסאפ מול מומחי נדל"ן'
            : "Personal VIP WhatsApp Support",
        },
        {
          text: isRtl
            ? "מוכנות מלאה למס: דוחות מס אוטומטיים לרואה חשבון"
            : "Tax Ready: Automated Reports for CPA",
        },
      ],
      extendedFeatures: [
        { text: isRtl ? "כל הפיצ'רים של תוכנית Pro" : "All Pro Plan Features" },
        {
          text: isRtl
            ? "הפקת דוחות מס בלחיצת כפתור לשקיפות מול רואה החשבון"
            : "Generate Tax Reports in 1-Click for CPA",
        },
        {
          text: isRtl
            ? "ניהול משולב לפורטפוליו ומספר רב של נכסים"
            : "Integrated Multi-Asset Portfolio Management",
        },
        {
          text: isRtl
            ? "טיפול בתקלות בעדיפות עליונה מול אנשי מקצוע"
            : "Top Priority Support Queuing for Professionals",
        },
        {
          text: isRtl
            ? "גישה מוקדמת (Beta) לפיצ'רים עתידיים לפני כולם"
            : "Early Access (Beta) to Future Features",
        },
      ],
      cta: isRtl ? "בחר Investor" : "Select Investor",
      popular: false,
      color: "text-[#D4AF37]",
      bg: "bg-[#D4AF37]/10 dark:bg-[#D4AF37]/20",
      buttonVariant: "primary" as const,
      bgImage: "/premium-plan-bg.jpg",
    },
  ];

  const handleSelectPlan = async (planId: string) => {
    if (isNativePlatform() && planId !== 'free') {
      toast.info(isRtl ? "רכישות באפליקציה (IAP) לפרימיום יתווספו בקרוב!" : "Premium In-App Purchases are coming soon! (Capacitor IAP Stub)");
      return;
    }

    setSelectedPlanId(planId);
    setLoading(true);

    try {
      if (user) {
        // Update user metadata in Supabase Auth
        const { error: updateError } = await supabase.auth.updateUser({
          data: { plan_id: planId },
        });

        // Update the public profile table layout
        const { error: profileError } = await supabase
          .from('user_profiles')
          .update({ plan_id: planId })
          .eq('id', user.id);

        if (updateError || profileError) throw updateError || profileError;

        // Refresh local context profile in the background so it doesn't block navigation
        refreshProfile();
      }

      // In the future this might redirect to a Payment Gateway if it's a paid plan.
      // For now, we head to the dashboard.
      navigate("/dashboard");
    } catch (error) {
      console.error("Error selecting plan:", error);
      // Revert state on error
      setSelectedPlanId(null);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      className={`min-h-screen bg-background dark:bg-[#0a0a0a] py-12 px-4 flex flex-col items-center justify-center ${isRtl ? "text-right font-hebrew" : "text-left font-english"}`}
      dir={isRtl ? "rtl" : "ltr"}
    >
      <div className="max-w-6xl w-full space-y-12 animate-in fade-in slide-in-from-bottom-8 duration-700 pb-12">
        {/* Header Section */}
        <div className="text-center space-y-4 max-w-2xl mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
          >
            <h1 className="text-3xl sm:text-4xl md:text-5xl font-black tracking-tight text-foreground">
              {isRtl ? "בחר את המסלול שלך" : "Choose Your Plan"}
            </h1>
          </motion.div>
          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="text-lg text-muted-foreground"
          >
            {isRtl
              ? "כדי לסיים את ההרשמה ולהתחיל להשתמש במערכת, בחר את המסלול שמתאים לך."
              : "To complete your registration, select the plan that fits your needs best."}
          </motion.p>

          {/* Billing Toggle Header - Segmented Control */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="pt-8 flex justify-center"
          >
            <div className="p-1.5 bg-muted/60 dark:bg-muted/10 border border-border/50 rounded-full inline-flex relative shadow-inner">
              <button
                onClick={() => setBillingCycle("monthly")}
                className={`relative px-6 py-2 rounded-full text-base font-bold transition-all duration-300 z-10 ${billingCycle === "monthly" ? "text-foreground" : "text-muted-foreground hover:text-foreground"}`}
              >
                {billingCycle === "monthly" && (
                  <motion.div
                    layoutId="cyclebg"
                    className="absolute inset-0 bg-background dark:bg-neutral-800 rounded-full shadow-md border border-border/40"
                    style={{ zIndex: -1 }}
                    transition={{ type: "spring", bounce: 0.2, duration: 0.6 }}
                  />
                )}
                <span>{isRtl ? "חודשי" : "Monthly"}</span>
              </button>
              <button
                onClick={() => setBillingCycle("yearly")}
                className={`relative flex items-center gap-2 px-6 py-2 rounded-full text-base font-bold transition-all duration-300 z-10 ${billingCycle === "yearly" ? "text-foreground" : "text-muted-foreground hover:text-foreground"}`}
              >
                {billingCycle === "yearly" && (
                  <motion.div
                    layoutId="cyclebg"
                    className="absolute inset-0 bg-background dark:bg-neutral-800 rounded-full shadow-md border border-border/40"
                    style={{ zIndex: -1 }}
                    transition={{ type: "spring", bounce: 0.2, duration: 0.6 }}
                  />
                )}
                <span>{isRtl ? "שנתי" : "Yearly"}</span>
                <span
                  className={`text-xs sm:text-sm font-black px-2 py-0.5 rounded-full transition-colors ${billingCycle === "yearly" ? "bg-primary/20 text-primary" : "bg-foreground/5 text-muted-foreground"}`}
                >
                  {isRtl ? "עד 40% הנחה" : "Up to 40% off"}
                </span>
              </button>
            </div>
          </motion.div>
        </div>

        {/* Pricing Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 pt-4 max-w-5xl mx-auto items-stretch">
          {plans.map((plan, index) => (
            <PlanCard
              key={plan.id}
              plan={plan as Plan}
              index={index}
              isSelected={selectedPlanId === plan.id}
              billingCycle={billingCycle}
              isRtl={isRtl}
              loading={loading}
              onSelect={handleSelectPlan}
            />
          ))}
        </div>

        {/* Full Breakdown Section */}
        <div className="mt-20 max-w-5xl mx-auto">
          <div className="text-center mb-10">
            <h2 className="text-2xl md:text-3xl font-black tracking-tight text-foreground">
              {isRtl ? "השוואת מסלולים מלאה" : "Full Feature Breakdown"}
            </h2>
            <p className="text-muted-foreground mt-2">
              {isRtl
                ? "כל הכלים והיכולות שתקבלו בכל מסלול, לפרטי פרטים."
                : "Everything included in each plan, in detail."}
            </p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {plans.map((plan) => (
              <div
                key={`breakdown-${plan.id}`}
                className="bg-muted/30 dark:bg-muted/10 rounded-2xl p-6 border border-border/50"
              >
                <h3
                  className={`font-bold text-lg mb-6 flex items-center gap-2 ${plan.color}`}
                >
                  {plan.name}
                </h3>

                <div className="space-y-4">
                  {/* Show base features as a recap */}
                  {plan.features.map((feature, fIdx) => (
                    <div
                      key={`base-${fIdx}`}
                      className="flex items-start gap-3 text-sm"
                    >
                      <div className="p-1 rounded-full bg-secondary/10 text-green-600 shrink-0 mt-0.5">
                        <Check className="w-3 h-3" strokeWidth={3} />
                      </div>
                      <span className="text-foreground/90 font-medium">
                        {feature.text}
                      </span>
                    </div>
                  ))}

                  {/* Show extended features */}
                  {plan.extendedFeatures &&
                    plan.extendedFeatures.length > 0 && (
                      <>
                        <div className="h-px bg-border/50 my-4"></div>
                        {plan.extendedFeatures.map((extFeature, efIdx) => (
                          <div
                            key={`ext-${efIdx}`}
                            className="flex items-start gap-3 text-sm"
                          >
                            <div className="p-1 rounded-full bg-primary/10 text-primary shrink-0 mt-0.5">
                              <Check className="w-3 h-3" strokeWidth={3} />
                            </div>
                            <span className="text-muted-foreground">
                              {extFeature.text}
                            </span>
                          </div>
                        ))}
                      </>
                    )}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* ROI / FAQ Section */}
        <div className="mt-20 max-w-4xl mx-auto w-full">
          <div className="text-center mb-10">
            <h2 className="text-2xl md:text-3xl font-black tracking-tight text-foreground">
              {isRtl
                ? "למה כדאי לי לשלם על הטכנולוגיה?"
                : "Why should I upgrade?"}
            </h2>
            <p className="text-muted-foreground mt-2">
              {isRtl
                ? "השקעה קטנה שמחזירה את עצמה מיד"
                : "A small investment that pays for itself immediately"}
            </p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <GlassCard className="p-6">
              <h3 className="font-bold text-lg mb-2 text-foreground flex items-center gap-2">
                <div className="p-1.5 rounded-full bg-red-500/10 text-red-500 shrink-0">
                  <svg
                    width="18"
                    height="18"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <circle cx="12" cy="12" r="10" />
                    <line x1="12" y1="8" x2="12" y2="12" />
                    <line x1="12" y1="16" x2="12.01" y2="16" />
                  </svg>
                </div>
                {isRtl
                  ? "מונעים הפסדים של אלפי שקלים"
                  : "Preventing losses of thousands"}
              </h3>
              <p className="text-base text-muted-foreground">
                {isRtl
                  ? "פספוס אחד של פינוי נכס, או טעות אחת בדיוק בהצמדות למדד, שווים לעלות של שנות מנוי רבות. האוטומציה שלנו מוודאת שלא יברח לך שקל מהכיס."
                  : "One missed eviction or indexation error costs more than years of subscription. Our automation ensures you don't lose a dime."}
              </p>
            </GlassCard>
            <GlassCard className="p-6">
              <h3 className="font-bold text-lg mb-2 text-foreground flex items-center gap-2">
                <div className="p-1.5 rounded-full bg-primary/10 text-primary shrink-0">
                  <svg
                    width="18"
                    height="18"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <circle cx="12" cy="12" r="10" />
                    <polyline points="12 6 12 12 16 14" />
                  </svg>
                </div>
                {isRtl
                  ? "הזמן שלך שווה יותר מ-2₪ ביום"
                  : "Your time is worth more than 2₪ a day"}
              </h3>
              <p className="text-base text-muted-foreground">
                {isRtl
                  ? "לשבור את הראש מול אקסלים זה שייך לעבר. הניהול האוטומטי של RentMate חוסך לכם שעות ארוכות, כדי שתוכלו להפנות את הזמן למשפחה, לעסק ולדברים שחשובים באמת."
                  : "Struggling with Excel is a thing of the past. RentMate's automated management saves you hours, so you can dedicate time to your family, business, and what truly matters."}
              </p>
            </GlassCard>
            <GlassCard className="p-6">
              <h3 className="font-bold text-lg mb-2 text-foreground flex items-center gap-2">
                <div className="p-1.5 rounded-full bg-green-500/10 text-green-500 shrink-0">
                  <svg
                    width="18"
                    height="18"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <path d="M12 2v20M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" />
                  </svg>
                </div>
                {isRtl
                  ? "אלטרנטיבה זולה לחברת ניהול"
                  : "Cheap alternative to management companies"}
              </h3>
              <p className="text-base text-muted-foreground">
                {isRtl
                  ? "חברת ניהול תיקח לך 8%-10% מהשכירות (הון תועפות). אנחנו נותנים לך את כל הכלים הפרימיום ב-49 ש״ח בלבד כדי לנהל כמו מקצוען מבלי להתחלק ברווחים."
                  : "A management company will take 8%-10% of the rent (a fortune). We give you all the premium tools for just 49 NIS to manage like a pro without sharing profits."}
              </p>
            </GlassCard>
            <GlassCard className="p-6">
              <h3 className="font-bold text-lg mb-2 text-foreground flex items-center gap-2">
                <div className="p-1.5 rounded-full bg-primary/10 text-primary shrink-0">
                  <svg
                    width="18"
                    height="18"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <path d="M22 17a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V9.5C2 7 4 5 6.5 5H18c2.2 0 4 1.8 4 4v8Z" />
                    <polyline points="15,9 18,9 18,11" />
                    <path d="M6.5 5C9 5 11 7 11 9.5V17a2 2 0 0 1-2 2v0" />
                  </svg>
                </div>
                {isRtl
                  ? "עוזר משפטי AI חכם זמין 24/7"
                  : "Smart AI Legal Assistant Available 24/7"}
              </h3>
              <p className="text-base text-muted-foreground">
                {isRtl
                  ? "למה לשלם מאות שקלים לייעוץ על כל שאלה קטנה? סריקת החוזים והצ'אט AI שלנו זמינים עבורך בכל רגע נתון. קבל תשובות, ניסוחים והכוונה למידע משפטי תוך שניות."
                  : "Why pay hundreds of shekels for consultation on every small question? Our contract scanning and AI chat are available to you at any given moment. Get answers, phrasing and guidance to legal information within seconds."}
              </p>
            </GlassCard>
          </div>
        </div>

        <p className="text-center text-sm font-medium text-muted-foreground mt-12 px-4">
          {isRtl
            ? 'ניתן לשנות את התוכנית לפני תחילת תקופת מנוי חדשה, המחירים כוללים מע"מ, בכפוף לתקנון.'
            : "The plan can be changed before the start of a new subscription period. Prices include VAT, subject to the terms of service."}
        </p>
      </div>
    </div>
  );
}

export default SubscriptionSelection;
