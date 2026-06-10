"use client";

import Link from "next/link";

const plans = [
  {
    id: "free",
    name: "Free",
    price: 0,
    period: "forever",
    credits: "0",
    creditSub: "no premium models",
    featured: false,
  },
  {
    id: "starter",
    name: "Starter",
    price: 20,
    period: "per month",
    credits: "+ $20",
    creditSub: "spend on Veo, Seedance & more",
    featured: true,
    badge: "Most popular",
  },
  {
    id: "pro",
    name: "Pro",
    price: 35,
    period: "per month",
    credits: "+ $35",
    creditSub: "spend on Veo, Seedance & more",
    featured: false,
  },
  {
    id: "business",
    name: "Business",
    price: 100,
    period: "per month",
    credits: "+ $100",
    creditSub: "spend on Veo, Seedance & more",
    featured: false,
  },
];

const features = [
  {
    category: "Video generation",
    rows: [
      { label: "Included time", free: "5 min", starter: "1 hr", pro: "3 hr", business: "10 hr" },
      { label: "Overage rate", free: "—", starter: "$0.03 / sec", pro: "$0.03 / sec", business: "$0.03 / sec" },
    ],
  },
  {
    category: "Image generation",
    rows: [
      { label: "Included images", free: "50", starter: "500", pro: "500", business: "Unlimited" },
      { label: "Overage rate", free: "—", starter: "$0.001 / image", pro: "$0.001 / image", business: "$0.001 / image" },
    ],
  },
  {
    category: "Premium models",
    rows: [
      { label: "Veo / Happyhorse", free: "—", starter: "Credits", pro: "Credits", business: "Credits" },
      { label: "Seedance", free: "—", starter: "Credits", pro: "Credits", business: "Credits" },
      { label: "GPT Image", free: "—", starter: "Credits", pro: "Credits", business: "Credits" },
    ],
  },
  {
    category: "Workspace",
    rows: [
      { label: "Team members", free: "5", starter: "10", pro: "20", business: "20" },
      { label: "Storage", free: "20 GB", starter: "50 GB", pro: "500 GB", business: "500 GB" },
      { label: "Agent mode", free: "✓", starter: "✓", pro: "✓", business: "✓" },
      { label: "Social connect", free: "—", starter: "✓", pro: "✓", business: "✓" },
    ],
  },
];

export function LandingPricing() {
  return (
    <section id="plans" className="bg-[#f7f6f3] py-16 text-[#111110] md:py-20">
      <div className="mx-auto max-w-5xl px-5 md:px-8">
        {/* Header */}
        <div className="mb-14 text-center">
          <p className="text-[10px] font-medium uppercase tracking-[0.2em] text-[#5b3cf5]">
            Pricing
          </p>
          <h2 className="mt-3 text-[clamp(30px,4.5vw,48px)] font-light leading-[1.1] tracking-[-0.035em]">
            Pay for what you use,
            <br />
            <em className="font-light not-italic text-[#5b3cf5]">own what you create</em>
          </h2>
          <p className="mx-auto mt-4 max-w-md text-[15px] leading-[1.65] text-[#6b6965]">
            Every paid plan comes with credits equal to your subscription — use them on any premium model you want.
          </p>
        </div>

        {/* Plan Cards */}
        <div className="mb-4 grid grid-cols-2 gap-3 lg:grid-cols-4">
          {plans.map((plan) => (
            <div
              key={plan.id}
              className={`relative rounded-[14px] border p-5 transition-shadow hover:shadow-[0_4px_24px_rgba(0,0,0,0.06)] ${
                plan.featured
                  ? "border-[#5b3cf5] bg-[#5b3cf5] text-white"
                  : "border-[#e4e2de] bg-white"
              }`}
            >
              {plan.badge && (
                <span className="absolute -top-3 left-1/2 -translate-x-1/2 whitespace-nowrap rounded-full bg-[#111110] px-3 py-[3px] text-[9px] font-medium uppercase tracking-[0.1em] text-white">
                  {plan.badge}
                </span>
              )}

              <p
                className={`mb-2 text-[11px] font-medium uppercase tracking-[0.08em] ${
                  plan.featured ? "text-white/65" : "text-[#a8a49f]"
                }`}
              >
                {plan.name}
              </p>

              <div className="flex items-baseline gap-[2px]">
                <span
                  className={`mt-1 text-[16px] font-normal ${
                    plan.featured ? "text-white/70" : "text-[#6b6965]"
                  }`}
                >
                  $
                </span>
                <span
                  className={`text-[38px] font-light leading-none tracking-[-0.04em] ${
                    plan.featured ? "text-white" : "text-[#111110]"
                  }`}
                >
                  {plan.price}
                </span>
              </div>

              <p
                className={`mb-1 text-[12px] ${
                  plan.featured ? "text-white/50" : "text-[#a8a49f]"
                }`}
              >
                {plan.period}
              </p>

              {/* Credit callout */}
              <div
                className={`mb-5 mt-3 flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 ${
                  plan.featured ? "bg-white/15" : "bg-[#e3f5ed]"
                }`}
              >
                <span className="text-[13px]">✦</span>
                <span className="text-[12px] font-medium leading-[1.3]">
                  <span className={plan.featured ? "text-white" : "text-[#1a9e5f]"}>
                    {plan.credits} credits included
                  </span>
                  <span
                    className={`block text-[10px] font-normal ${
                      plan.featured ? "text-white/65" : "text-[#6b6965]"
                    }`}
                  >
                    {plan.creditSub}
                  </span>
                </span>
              </div>

              <Link
                href="/signup"
                className={`block w-full rounded-lg py-2.5 text-center text-[13px] font-medium transition ${
                  plan.featured
                    ? "bg-white text-[#5b3cf5] hover:bg-[#ede9ff]"
                    : "border border-[#ccc9c3] text-[#111110] hover:bg-[#f2f1ee]"
                }`}
              >
                {plan.id === "free"
                  ? "Get started free"
                  : plan.id === "business"
                    ? "Contact sales"
                    : "Start free trial"}
              </Link>
            </div>
          ))}
        </div>

        {/* Feature Table */}
        <div className="overflow-hidden rounded-[14px] border border-[#e4e2de] bg-white">
          {/* Header row */}
          <div className="grid grid-cols-[1fr_80px_80px_80px_80px] border-b border-[#e4e2de] bg-[#f2f1ee] text-[11px] font-medium text-[#a8a49f]">
            <div className="px-5 py-2.5">Feature</div>
            <div className="px-2 py-2.5 text-center">Free</div>
            <div className="px-2 py-2.5 text-center text-[#5b3cf5]">Starter</div>
            <div className="px-2 py-2.5 text-center">Pro</div>
            <div className="px-2 py-2.5 text-center">Business</div>
          </div>

          {features.map((section) => (
            <div key={section.category}>
              {/* Section header */}
              <div className="border-b border-[#e4e2de] bg-[#f2f1ee] px-5 py-2">
                <span className="text-[10px] font-medium uppercase tracking-[0.14em] text-[#a8a49f]">
                  {section.category}
                </span>
              </div>

              {/* Rows */}
              {section.rows.map((row) => (
                <div
                  key={row.label}
                  className="grid grid-cols-[1fr_80px_80px_80px_80px] border-b border-[#e4e2de] text-[13px]"
                >
                  <div className="px-5 py-3 text-[#6b6965]">{row.label}</div>
                  <div className="px-2 py-3 text-center text-[#111110]">
                    {row.free === "✓" ? (
                      <span className="text-[#1a9e5f]">✓</span>
                    ) : row.free === "—" ? (
                      <span className="text-[#a8a49f]">—</span>
                    ) : (
                      row.free
                    )}
                  </div>
                  <div className="bg-[#faf9ff] px-2 py-3 text-center text-[#111110]">
                    {row.starter === "✓" ? (
                      <span className="text-[#1a9e5f]">✓</span>
                    ) : row.starter === "—" ? (
                      <span className="text-[#a8a49f]">—</span>
                    ) : row.starter === "Credits" ? (
                      <span className="inline-block rounded-full border border-[#c4b8ff] bg-[#ede9ff] px-1.5 py-0.5 text-[9px] text-[#5b3cf5]">
                        Credits
                      </span>
                    ) : (
                      row.starter
                    )}
                  </div>
                  <div className="px-2 py-3 text-center text-[#111110]">
                    {row.pro === "✓" ? (
                      <span className="text-[#1a9e5f]">✓</span>
                    ) : row.pro === "—" ? (
                      <span className="text-[#a8a49f]">—</span>
                    ) : row.pro === "Credits" ? (
                      <span className="inline-block rounded-full border border-[#c4b8ff] bg-[#ede9ff] px-1.5 py-0.5 text-[9px] text-[#5b3cf5]">
                        Credits
                      </span>
                    ) : (
                      row.pro
                    )}
                  </div>
                  <div className="px-2 py-3 text-center text-[#111110]">
                    {row.business === "✓" ? (
                      <span className="text-[#1a9e5f]">✓</span>
                    ) : row.business === "—" ? (
                      <span className="text-[#a8a49f]">—</span>
                    ) : row.business === "Credits" ? (
                      <span className="inline-block rounded-full border border-[#c4b8ff] bg-[#ede9ff] px-1.5 py-0.5 text-[9px] text-[#5b3cf5]">
                        Credits
                      </span>
                    ) : (
                      row.business
                    )}
                  </div>
                </div>
              ))}
            </div>
          ))}
        </div>

        {/* Footer */}
        <p className="mt-10 text-center text-[12px] leading-[1.8] text-[#a8a49f]">
          7-day free trial on all paid plans · No credit card required · Credits reset monthly and don&apos;t roll over
          <br />
          Questions?{" "}
          <Link href="/contact" className="text-[#6b6965] hover:text-[#111110]">
            Talk to us
          </Link>
        </p>
      </div>
    </section>
  );
}
