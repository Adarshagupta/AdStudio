import { LANDING_FAQ_ITEMS } from "@/lib/seo";

export function LandingFAQ() {
  return (
    <section id="faq" className="border-t border-zinc-200 bg-white py-16 text-zinc-900 md:py-20">
      <div className="mx-auto max-w-3xl px-5 md:px-8">
        <p className="text-center text-sm font-semibold uppercase tracking-[0.12em] text-violet-700">
          FAQ
        </p>
        <h2 className="mt-2 text-center font-display text-3xl font-semibold tracking-tight md:text-4xl">
          Frequently asked questions
        </h2>
        <p className="mx-auto mt-4 max-w-2xl text-center text-sm leading-7 text-zinc-600 md:text-base">
          Everything you need to know about AI UGC ads, video generation, and LiteMoov plans.
        </p>

        <dl className="mt-10 space-y-4">
          {LANDING_FAQ_ITEMS.map((item) => (
            <div
              key={item.question}
              className="rounded-2xl border border-zinc-200 bg-zinc-50/60 px-5 py-4 md:px-6 md:py-5"
            >
              <dt className="font-display text-base font-semibold text-zinc-900 md:text-lg">
                {item.question}
              </dt>
              <dd className="mt-2 text-sm leading-7 text-zinc-600 md:text-base">{item.answer}</dd>
            </div>
          ))}
        </dl>
      </div>
    </section>
  );
}
