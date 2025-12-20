import React, { useEffect, useRef } from "react";
import {
  Loader2,
  ShieldCheck,
  AlertCircle,
  TrendingUp,
  ShieldAlert,
  CheckCircle2,
} from "lucide-react";

// --- Types ---

type SWOT = {
  strength: string[];
  weakness: string[];
  opportunities: string[];
  threats: string[];
};

interface SwotProps {
  review: SWOT | null;
  loading: boolean;
}

type CardConfig = {
  key: keyof SWOT;
  title: string;
  subtitle: string;
  description: string;
  points: string[];
  color: string;
  textColor: string;
  pointColor: string;
  borderColor: string;
  iconColor: string;
  shadow: string;
  icon: React.ReactNode;
};

// --- Constants for Animation Sync ---
const BASE_TOP_OFFSET = 120; // where first card sticks
const CARD_STACK_OFFSET = 60; // extra top for each subsequent card

// --- Main SWOT Component ---

export default function Swot({ review, loading }: SwotProps) {
  const hasData =
    !!review?.strength?.length ||
    !!review?.weakness?.length ||
    !!review?.opportunities?.length ||
    !!review?.threats?.length;

  const cards: CardConfig[] = [
    {
      key: "strength",
      title: "Strengths",
      subtitle: "Internal Positive",
      description: "Core advantages and capabilities driving your strategy.",
      points: review?.strength ?? [],
      color: "bg-[#0072CE]",
      textColor: "text-white",
      pointColor: "text-white/90",
      borderColor: "border-white/10",
      iconColor: "text-blue-100",
      shadow: "shadow-blue-900/20",
      icon: <ShieldCheck className="w-12 h-12 md:w-16 md:h-16" />,
    },
    {
      key: "weakness",
      title: "Weaknesses",
      subtitle: "Internal Negative",
      description: "Areas for improvement and internal limitations.",
      points: review?.weakness ?? [],
      color: "bg-white",
      textColor: "text-[#0072CE]",
      pointColor: "text-slate-600",
      borderColor: "border-[#0072CE]/10",
      iconColor: "text-[#0072CE]",
      shadow: "shadow-slate-200",
      icon: <AlertCircle className="w-12 h-12 md:w-16 md:h-16" />,
    },
    {
      key: "opportunities",
      title: "Opportunities",
      subtitle: "External Positive",
      description: "Market trends and openings to leverage for growth.",
      points: review?.opportunities ?? [],
      color: "bg-[#0072CE]",
      textColor: "text-white",
      pointColor: "text-white/90",
      borderColor: "border-white/10",
      iconColor: "text-blue-100",
      shadow: "shadow-blue-900/20",
      icon: <TrendingUp className="w-12 h-12 md:w-16 md:h-16" />,
    },
    {
      key: "threats",
      title: "Threats",
      subtitle: "External Negative",
      description: "External factors and obstacles to mitigate.",
      points: review?.threats ?? [],
      color: "bg-white",
      textColor: "text-[#0072CE]",
      pointColor: "text-slate-600",
      borderColor: "border-[#0072CE]/10",
      iconColor: "text-[#0072CE]",
      shadow: "shadow-slate-200",
      icon: <ShieldAlert className="w-12 h-12 md:w-16 md:h-16" />,
    },
  ];

  return (
    <div className="max-w-4xl mx-auto py-10 px-4 space-y-6">
      {loading && (
        <div className="flex flex-col items-center justify-center py-20 space-y-4">
          <Loader2 className="h-8 w-8 animate-spin text-[#0072CE]" />
          <span className="text-slate-600 font-medium">
            Analyzing your strategy...
          </span>
        </div>
      )}

      {!loading && !hasData && (
        <div className="flex flex-col items-center justify-center py-20 text-slate-500">
          <p>No analysis generated yet.</p>
          <p className="text-sm mt-2">
            Switching to this tab usually starts generation.
          </p>
        </div>
      )}

      {!loading && hasData && <StickyStack cards={cards} />}
    </div>
  );
}

// --- Sticky Stack Implementation ---

interface StickyStackProps {
  cards: CardConfig[];
}

const StickyStack: React.FC<StickyStackProps> = ({ cards }) => {
  const cardRefs = useRef<(HTMLDivElement | null)[]>([]);
  const containerRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const handleScroll = () => {
      requestAnimationFrame(() => {
        const containerRect = container.getBoundingClientRect();
        const containerHeight = containerRect.height;

        cardRefs.current.forEach((card, index) => {
          if (!card) return;

          const nextCard = cardRefs.current[index + 1];

          if (nextCard) {
            const nextCardRect = nextCard.getBoundingClientRect();

            // distance of next card from top of viewport
            const distance = nextCardRect.top;

            // Start when next card enters lower 15% of viewport
            const startScalePoint = containerHeight * 0.85;

            // End when next card reaches its sticky top
            const topOffsetNext =
              BASE_TOP_OFFSET + (index + 1) * CARD_STACK_OFFSET;
            const endScalePoint = topOffsetNext;

            let rawProgress =
              (startScalePoint - distance) /
              (startScalePoint - endScalePoint);

            // Clamp then ease for smoother motion
            rawProgress = Math.max(0, Math.min(1, rawProgress));
            const progress =
              rawProgress * rawProgress * (3 - 2 * rawProgress); // smoothstep easing

            const scale = 1 - progress * 0.04; // 1 → 0.96
            const brightness = 100 - progress * 8; // 100% → 92%
            const translateY = progress * 8; // subtle push down

            card.style.transform = `scale(${scale}) translateY(${translateY}px)`;
            card.style.filter = `brightness(${brightness}%)`;
          } else {
            card.style.transform = "scale(1) translateY(0px)";
            card.style.filter = "brightness(100%)";
          }
        });
      });
    };

    // Attach scroll listener to the window for outer scroll
    window.addEventListener("scroll", handleScroll, { passive: true });
    handleScroll();

    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  return (
    <div ref={containerRef} className="relative px-0 pt-4 pb-40">
      {cards.map((card, index) => (
        <Card
          key={card.key}
          card={card}
          index={index}
          ref={(el) => {
            cardRefs.current[index] = el;
          }}
        />
      ))}
    </div>
  );
}

// --- Individual Card Component ---

interface CardProps {
  card: CardConfig;
  index: number;
}

const Card = React.forwardRef<HTMLDivElement, CardProps>(
  ({ card, index }, ref) => {
    // first card top = BASE_TOP_OFFSET, then + CARD_STACK_OFFSET per card
    const topOffset = BASE_TOP_OFFSET + index * CARD_STACK_OFFSET;

    return (
      <div
        className="sticky -mt-2 mb-12 last:mb-0"
        style={{
          top: `${topOffset}px`,
          zIndex: index + 10,
        }}
      >
        {/* Transform wrapper controlled via ref */}
        <div
          ref={ref}
          className={`
            relative overflow-hidden rounded-3xl p-8 md:p-10
            ${card.color} ${card.textColor} shadow-2xl ${card.shadow}
            border ${card.borderColor}
            will-change-transform origin-top transition-shadow duration-200
          `}
        >
          {/* Decorative Background Blobs */}
          <div
            className={`absolute -top-20 -right-20 w-80 h-80 rounded-full blur-3xl pointer-events-none
            ${
              card.textColor === "text-white"
                ? "bg-white/10"
                : "bg-[#0072CE]/5"
            }`}
          />
          <div
            className={`absolute -bottom-20 -left-20 w-60 h-60 rounded-full blur-3xl pointer-events-none
            ${
              card.textColor === "text-white"
                ? "bg-black/10"
                : "bg-[#0072CE]/5"
            }`}
          />

          {/* Header */}
          <div className="flex flex-col md:flex-row items-start justify-between mb-8 gap-4 relative z-10">
            <div>
              <span
                className={`
                  inline-block px-3 py-1 rounded-full text-xs font-bold tracking-wider mb-3 uppercase border
                  ${
                    card.textColor === "text-white"
                      ? "bg-white/20 border-white/20"
                      : "bg-[#0072CE]/5 border-[#0072CE]/10"
                  }
                `}
              >
                {card.subtitle}
              </span>
              <h2 className="text-3xl font-bold tracking-tight">
                {card.title}
              </h2>
            </div>
            <div
              className={`p-3 rounded-2xl flex-shrink-0 backdrop-blur-md ${
                card.textColor === "text-white"
                  ? "bg-white/10 text-white border border-white/10"
                  : "bg-[#0072CE]/5 text-[#0072CE] border border-[#0072CE]/10"
              }`}
            >
              {card.icon}
            </div>
          </div>

          {/* Description */}
          <p
            className={`text-lg mb-8 leading-relaxed font-light relative z-10 ${
              card.textColor === "text-white"
                ? "text-blue-50"
                : "text-slate-600"
            }`}
          >
            {card.description}
          </p>

          {/* Points */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 md:gap-4 relative z-10">
            {card.points.map((point, i) => (
              <div
                key={i}
                className={`
                  flex items-start gap-3 p-3 rounded-xl transition-colors duration-200
                  ${
                    card.textColor === "text-white"
                      ? "bg-white/10 hover:bg-white/20"
                      : "bg-slate-50 hover:bg-slate-100"
                  }
                `}
              >
                <CheckCircle2
                  className={`w-5 h-5 mt-0.5 flex-shrink-0 ${
                    card.textColor === "text-white"
                      ? "text-blue-200"
                      : "text-[#0072CE]"
                  }`}
                />
                <span
                  className={`font-medium text-sm md:text-base ${card.pointColor}`}
                >
                  {point}
                </span>
              </div>
            ))}
          </div>

          {/* Index Watermark */}
          <div
            className={`
              absolute -bottom-6 -right-6 text-9xl font-black pointer-events-none select-none opacity-5
              ${card.textColor === "text-white" ? "text-white" : "text-[#0072CE]"}
            `}
          >
            0{index + 1}
          </div>
        </div>
      </div>
    );
  }
);

Card.displayName = "SwotCard";