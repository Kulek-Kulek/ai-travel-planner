"use client";

import Link from "next/link";

type MastheadProps = {
  onPlanTrip: () => void;
};

export function Masthead({ onPlanTrip }: MastheadProps) {
  return (
    <section className="relative overflow-hidden bg-gradient-to-br from-indigo-950 via-indigo-900 to-blue-900 text-white">
      <div aria-hidden className="pointer-events-none absolute inset-0">
        <div className="absolute -left-24 -top-40 h-72 w-72 rounded-full bg-indigo-500/40 blur-3xl" />
        <div className="absolute bottom-[-6rem] right-[-4rem] h-80 w-80 rounded-full bg-sky-500/30 blur-3xl" />
      </div>

      <div className="relative mx-auto flex max-w-7xl flex-col gap-16 px-4 py-20 sm:px-6 lg:flex-row lg:items-center lg:gap-20 lg:px-8">
        <div className="flex-1 space-y-10">
          <span className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/10 px-4 py-1 text-sm font-medium backdrop-blur">
            <span className="text-lg">✨</span>
            Smarter planning, happier travels
          </span>

          <div className="space-y-6">
            <h1 className="text-4xl font-semibold tracking-tight sm:text-5xl">
              Personal itineraries curated by AI, tailored to your travelers
            </h1>
            <p className="max-w-xl text-lg text-indigo-100">
              Discover destinations, balance daily experiences, and delight customers with shareable plans in minutes—not hours of manual research.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-4">
            <button
              type="button"
              onClick={onPlanTrip}
              className="inline-flex items-center justify-center rounded-full bg-white px-6 py-3 text-sm font-semibold text-indigo-900 shadow-lg shadow-indigo-950/30 transition hover:shadow-xl hover:shadow-indigo-900/40"
            >
              Plan a trip
            </button>
            <Link
              href="#public-itineraries"
              className="inline-flex items-center justify-center rounded-full border border-white/30 px-5 py-3 text-sm font-semibold text-white transition hover:border-white hover:bg-white/10"
            >
              Explore sample itineraries
            </Link>
          </div>

          <div className="grid gap-5 sm:grid-cols-2">
            {[
              {
                icon: "⚡",
                title: "AI-powered drafting",
                desc: "Capture preferences, accessibility needs, and family details with one guided prompt.",
              },
              {
                icon: "🧭",
                title: "Balanced daily flow",
                desc: "Curate mornings, afternoons, and evenings that feel effortless for every traveler.",
              },
            ].map((feature) => (
              <div
                key={feature.title}
                className="flex gap-3 rounded-2xl border border-white/10 bg-white/5 p-4 backdrop-blur"
              >
                <span className="text-2xl" aria-hidden>
                  {feature.icon}
                </span>
                <div className="space-y-1">
                  <p className="text-sm font-semibold text-white">{feature.title}</p>
                  <p className="text-sm text-indigo-100">{feature.desc}</p>
                </div>
              </div>
            ))}
          </div>

          <dl className="flex flex-wrap gap-6 text-sm text-indigo-100/80">
            <div>
              <dt className="font-medium text-white">2,300+ itineraries generated</dt>
              <dd>Served across 84 destinations worldwide</dd>
            </div>
            <div>
              <dt className="font-medium text-white">Under 2 minutes</dt>
              <dd>Average time to a polished day-by-day plan</dd>
            </div>
            <div>
              <dt className="font-medium text-white">Team-ready exports</dt>
              <dd>Share instantly with customers or colleagues</dd>
            </div>
          </dl>
        </div>

        <div className="flex-1">
          <div className="relative">
            <div aria-hidden className="absolute inset-0 -translate-y-4 scale-95 rounded-[2.25rem] bg-indigo-500/40 blur-2xl" />
            <div className="relative overflow-hidden rounded-[2rem] border border-white/15 bg-white/10 p-8 shadow-2xl backdrop-blur">
              <div className="flex items-center justify-between text-xs font-medium uppercase tracking-wide text-indigo-100/80">
                <span>Live preview</span>
                <span>Generated 3m ago</span>
              </div>
              <h3 className="mt-6 text-2xl font-semibold">Kyoto cultural escape</h3>
              <p className="mt-3 text-sm leading-6 text-indigo-100/80">
                Sunrise at Fushimi Inari, tea ceremony in Gion, and a bamboo forest stroll crafted for a curious couple.
              </p>

              <ul className="mt-8 space-y-4 text-sm text-indigo-100">
                <li className="flex items-start gap-3">
                  <span className="mt-1 text-lg">🌅</span>
                  <div>
                    <p className="font-semibold text-white">Daybreak temple stroll</p>
                    <p className="text-indigo-100/80">Beat the crowds at Fushimi Inari and capture sweeping city views.</p>
                  </div>
                </li>
                <li className="flex items-start gap-3">
                  <span className="mt-1 text-lg">🍵</span>
                  <div>
                    <p className="font-semibold text-white">Private tea ceremony</p>
                    <p className="text-indigo-100/80">Reconnect with tradition in a hidden machiya house.</p>
                  </div>
                </li>
                <li className="flex items-start gap-3">
                  <span className="mt-1 text-lg">🎋</span>
                  <div>
                    <p className="font-semibold text-white">Arashiyama evening walk</p>
                    <p className="text-indigo-100/80">Finish with lantern-lit paths through the bamboo grove.</p>
                  </div>
                </li>
              </ul>

              <div className="mt-10 flex flex-wrap gap-3 text-xs font-semibold uppercase tracking-wide text-indigo-100">
                <span className="rounded-full bg-white/10 px-3 py-2">7-day plan</span>
                <span className="rounded-full bg-white/10 px-3 py-2">Premium clients</span>
                <span className="rounded-full bg-white/10 px-3 py-2">Multi-language</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

