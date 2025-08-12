// Fix 2025-08-08: remove duplicate React import block causing "Identifier 'React' has already been declared".
import React, { useEffect, useRef, useState, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { PartyPopper, Users, CalendarDays, MapPin, Ticket, Info } from "lucide-react";

// ==========================
//  BOSSNET – 1999 Retro Mockup (improved)
//  - items nach außen verlegt (statisch)
//  - Marker update throttled via rAF + translateY (weniger Reflow)
//  - Scroll/Resize handling stabilisiert
//  - A11y: Rollen/ARIA/Keyboard-Navigation
// ==========================

const NAV_ITEMS = [
  { key: "overview", label: "Übersicht", icon: PartyPopper },
  { key: "teilnehmer", label: "Teilnehmer", icon: Users },
  { key: "programm", label: "Programm", icon: CalendarDays },
  { key: "location", label: "Location", icon: MapPin },
  { key: "tickets", label: "Tickets", icon: Ticket, badge: "NEW" },
  { key: "infos", label: "Infos", icon: Info },
] as const;

type NavKey = typeof NAV_ITEMS[number]["key"];

export default function BossnetRetro1999() {
  const [activeKey, setActiveKey] = useState<NavKey>(NAV_ITEMS[0].key);
  const [hoverIndex, setHoverIndex] = useState<number | null>(null);
  const [markerTop, setMarkerTop] = useState<number>(0);
  const [markerHeight, setMarkerHeight] = useState<number>(0);

  const containerRef = useRef<HTMLDivElement | null>(null);
  const itemRefs = useRef<(HTMLButtonElement | null)[]>([]);
  const rafRef = useRef<number | null>(null);

  const getCurrentIndex = () => hoverIndex ?? NAV_ITEMS.findIndex((i) => i.key === activeKey);

  const measureAndSet = useCallback((index: number) => {
    const container = containerRef.current;
    const el = itemRefs.current[index];
    if (!container || !el) return;
    const cRect = container.getBoundingClientRect();
    const iRect = el.getBoundingClientRect();
    const top = iRect.top - cRect.top + container.scrollTop;
    const height = iRect.height;
    setMarkerTop(top);
    setMarkerHeight(height);
  }, []);

  const updateMarker = useCallback((index: number) => {
    if (index < 0) return;
    if (rafRef.current) cancelAnimationFrame(rafRef.current);
    rafRef.current = requestAnimationFrame(() => {
      measureAndSet(index);
    });
  }, [measureAndSet]);

  useEffect(() => {
    const idx = getCurrentIndex();
    updateMarker(idx);
    const onResize = () => updateMarker(getCurrentIndex());
    window.addEventListener("resize", onResize);
    return () => {
      window.removeEventListener("resize", onResize);
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, [hoverIndex, activeKey, updateMarker]);

  const onScroll = () => updateMarker(getCurrentIndex());

  const onKeyDown = (e: React.KeyboardEvent) => {
    const idx = getCurrentIndex();
    if (e.key === "ArrowDown") {
      e.preventDefault();
      const next = Math.min(idx + 1, NAV_ITEMS.length - 1);
      itemRefs.current[next]?.focus();
      setHoverIndex(next);
      updateMarker(next);
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      const prev = Math.max(idx - 1, 0);
      itemRefs.current[prev]?.focus();
      setHoverIndex(prev);
      updateMarker(prev);
    } else if (e.key === "Enter" || e.key === " ") {
      const current = NAV_ITEMS[idx];
      if (current) setActiveKey(current.key);
    }
  };

  return (
    <div className="min-h-screen w-full bg-slate-950 text-slate-100 overflow-hidden">
      {/* Inline retro CSS (Hinweis: In Produktion in globale CSS/Tailwind verlagern) */}
      <style>{`
        @keyframes blink { 50% { opacity: 0.25; } }
        @keyframes marquee { 0% { transform: translateX(100%); } 100% { transform: translateX(-100%); } }
        .retro-font { font-family: 'Comic Sans MS', 'Arial Black', Impact, system-ui, sans-serif; }
        .btn-3d { background: linear-gradient(180deg, #7dd3fc 0%, #0284c7 70%, #0369a1 100%); box-shadow: inset 0 2px 1px rgba(255,255,255,0.6), inset 0 -2px 1px rgba(0,0,0,0.35), 0 4px 0 #0c4a6e, 0 6px 12px rgba(0,0,0,0.3); border: 2px solid #38bdf8; }
        .btn-3d:hover { filter: brightness(1.1); }
        .neon-border { box-shadow: 0 0 0 2px #22d3ee, 0 0 10px #22d3ee, 0 0 20px #22d3ee; }
        .blink { animation: blink 1s step-end infinite; }
      `}</style>

      {/* Top marquee bar */}
      <div className="relative h-10 bg-gradient-to-r from-fuchsia-700 via-sky-600 to-lime-600 border-b border-sky-400">
        <div className="absolute inset-0 overflow-hidden">
          <div className="whitespace-nowrap retro-font text-sm font-black tracking-wider" style={{ animation: "marquee 12s linear infinite" }}>
            🌐 Willkommen zur BOSS.net LAN-Party · Y2K EDITION · Bring your ICQ-Nummer · Gästebucheintrag nicht vergessen! · ✨
          </div>
        </div>
      </div>

      <div className="flex h-[calc(100vh-2.5rem)]">
        {/* Sidebar */}
        <aside className="relative w-72 bg-gradient-to-b from-sky-900 via-indigo-900 to-black border-r border-cyan-400/60 text-sky-100 retro-font">
          <div className="px-5 py-6">
            <div className="text-2xl font-black drop-shadow-[2px_2px_0_rgba(0,0,0,0.75)]">
              BOSS.net V<span className="text-cyan-300">2k25</span>
            </div>
            <div className="text-[11px] text-cyan-200/80 tracking-widest">Netzwerkparty · Geocities Vibes</div>
          </div>

          <div
            ref={containerRef}
            className="relative mt-1 flex flex-col gap-3 px-3 pb-6 overflow-y-auto"
            onMouseLeave={() => setHoverIndex(null)}
            onScroll={onScroll}
            role="menu"
            aria-label="Hauptnavigation"
            onKeyDown={onKeyDown}
          >
            {/* Hover/active rectangle slider (transparent fill, neon blue border) */}
            <AnimatePresence>
              <motion.div
                key="marker"
                aria-hidden
                className="pointer-events-none absolute left-2 right-2 rounded-lg border-4 border-cyan-300/90 bg-transparent neon-border"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                style={{ transform: `translateY(${markerTop}px)`, height: markerHeight }}
                transition={{ type: "spring", stiffness: 400, damping: 30, mass: 0.5 }}
              />
            </AnimatePresence>

            {NAV_ITEMS.map((item, idx) => {
              const Icon = item.icon;
              const isActive = activeKey === item.key;
              return (
                <button
                  key={item.key}
                  ref={(el) => (itemRefs.current[idx] = el)}
                  onMouseEnter={() => setHoverIndex(idx)}
                  onFocus={() => setHoverIndex(idx)}
                  onClick={() => setActiveKey(item.key)}
                  className="relative z-10 flex items-center gap-3 rounded-lg px-4 py-3 btn-3d text-left text-slate-900"
                  type="button"
                  role="menuitem"
                  aria-current={isActive ? "page" : undefined}
                >
                  <Icon className="h-5 w-5 shrink-0 drop-shadow-[1px_1px_0_rgba(0,0,0,0.7)]" />
                  <span className="font-extrabold tracking-wide text-white drop-shadow-[1px_1px_0_rgba(0,0,0,0.7)]">
                    {item.label}
                  </span>
                  {item.badge && (
                    <span className="ml-auto text-[10px] font-black bg-yellow-300 text-rose-700 px-2 py-0.5 rounded-sm blink border border-rose-600">
                      {item.badge}
                    </span>
                  )}
                  {isActive && (
                    <span className="absolute -right-2 top-1/2 -translate-y-1/2 text-[10px] px-1.5 py-0.5 rounded retro-font bg-lime-300 text-emerald-900 border border-emerald-700 animate-pulse">
                      ACTIVE
                    </span>
                  )}
                </button>
              );
            })}

            {/* Decorative retro separators */}
            <div className="mt-4 h-1 bg-gradient-to-r from-cyan-300 via-fuchsia-400 to-lime-300 animate-pulse" />
            <div className="mt-2 text-[10px] text-cyan-200/80 tracking-wider text-center">
              Best viewed in 800×600 · IE5/Netscape 4 😉
            </div>
          </div>
        </aside>

        {/* Main content */}
        <main className="flex-1 p-8 bg-gradient-to-br from-indigo-950 via-slate-900 to-black">
          <div className="mx-auto max-w-5xl">
            <header className="mb-8 retro-font">
              <h1 className="text-4xl font-black text-cyan-200 drop-shadow-[3px_3px_0_rgba(0,0,0,0.8)]">
                BOSS.net Netzwerkparty · Y2K EDITION
              </h1>
              <p className="mt-2 text-cyan-200/80 font-bold">
                Transparentes Hover-Highlight mit Neon-Glow, glänzende Buttons & blinkende Badges – wie 1999.
              </p>
            </header>

            <section className="grid gap-6 md:grid-cols-2">
              <Panel title="Features (1999-Style)">
                <ul className="list-disc pl-6 space-y-2 text-cyan-100/90 retro-font">
                  <li>Neon-Hoverrahmen folgt der Maus (transparent innen, blauer Glow außen).</li>
                  <li>3D-Buttons mit Farbverlauf, dicker Border & plastischem Shadow.</li>
                  <li>Marquee-Header für ultimative Geocities-Energie.</li>
                  <li>Blinkende "NEW"-Badges & pulsierende Akzente.</li>
                </ul>
              </Panel>

              <Panel title="Was wir noch tun können">
                <ul className="list-disc pl-6 space-y-2 text-cyan-100/90 retro-font">
                  <li>Pixel-Dekor-Icons / animierte GIF-Sticker hinzufügen.</li>
                  <li>Schrift auf echte Bitmap-Fonts umstellen (z. B. <em>Press Start 2P</em>).</li>
                  <li>Gästebuch/Counter-Komponente (rein dekorativ 😉).</li>
                  <li>Soundeffekte bei Hover/Click (deaktivierbar).</li>
                </ul>
              </Panel>
            </section>

            <div className="mt-10 retro-font text-[11px] text-cyan-200/70">
              <span className="font-black">Tipp:</span> Wenn dir der Glow zu stark ist, kann ich einen "Lite"-Schalter einbauen, der die Effekte abschwächt.
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}

function Panel({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="rounded-2xl border-2 border-cyan-400/50 bg-slate-900/70 p-5 shadow-[inset_0_1px_0_rgba(255,255,255,0.12),0_8px_20px_rgba(0,0,0,0.45)]">
      <h2 className="mb-3 retro-font text-lg font-black text-cyan-200 drop-shadow-[2px_2px_0_rgba(0,0,0,0.7)]">{title}</h2>
      <div>{children}</div>
    </div>
  );
}

