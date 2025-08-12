import React, { useEffect, useMemo, useRef, useState } from "react";
import ReactDOM from "react-dom/client";
import "./index.css";
import "./y2k-styles.css";

type Item = { key: string; label: string; badge?: string };

function App() {
  const items: Item[] = useMemo(() => [
    { key: "overview", label: "Übersicht" },
    { key: "teilnehmer", label: "Teilnehmer" },
    { key: "programm", label: "Programm" },
    { key: "location", label: "Location" },
    { key: "tickets", label: "Tickets", badge: "NEW" },
    { key: "infos", label: "Infos" },
  ], []);

  const [activeKey, setActiveKey] = useState(items[0].key);
  const [hoverIndex, setHoverIndex] = useState<number | null>(null);
  const [markerStyle, setMarkerStyle] = useState<{ y: number; h: number }>({ y: 0, h: 0 });

  const containerRef = useRef<HTMLDivElement | null>(null);
  const itemRefs = useRef<(HTMLLIElement | null)[]>([]);
  const raf = useRef<number | null>(null);

  const getIndex = () => hoverIndex ?? items.findIndex(i => i.key === activeKey);

  const updateMarkerNow = (index: number) => {
    const container = containerRef.current;
    const el = itemRefs.current[index];
    if (!container || !el) return;
    const c = container.getBoundingClientRect();
    const r = el.getBoundingClientRect();
    setMarkerStyle({ y: r.top - c.top + container.scrollTop, h: r.height });
  };

  const updateMarker = (index: number) => {
    if (index < 0) return;
    if (raf.current) cancelAnimationFrame(raf.current);
    raf.current = requestAnimationFrame(() => updateMarkerNow(index));
  };

  useEffect(() => {
    updateMarker(getIndex());
    const onResize = () => updateMarker(getIndex());
    window.addEventListener("resize", onResize);
    return () => {
      window.removeEventListener("resize", onResize);
      if (raf.current) cancelAnimationFrame(raf.current);
    };
  }, [hoverIndex, activeKey]);

  return (
    <div className="y2k-wrapper">
      <div className="y2k-marquee">
        <div className="y2k-marquee__track">
          🌐 Willkommen zur BOSS.net LAN-Party · Y2K EDITION · Bring your ICQ-Nummer · Gästebucheintrag nicht vergessen! · ✨
        </div>
      </div>

      <div className="y2k-layout">
        <nav className="y2k-sidebar">
          <div
            className="y2k-sidebar__menu"
            ref={containerRef}
            onMouseLeave={() => setHoverIndex(null)}
            onScroll={() => updateMarker(getIndex())}
          >
            <div
              className="y2k-hover-rect"
              style={{ transform: `translateY(${markerStyle.y}px)`, height: markerStyle.h }}
              aria-hidden
            />
            <ul className="y2k-menu" role="menu" aria-label="Hauptnavigation">
              {items.map((it, idx) => (
                <li
                  key={it.key}
                  ref={el => (itemRefs.current[idx] = el)}
                  className="y2k-menu-item"
                  onMouseEnter={() => setHoverIndex(idx)}
                  onFocus={() => setHoverIndex(idx)}
                  onClick={() => setActiveKey(it.key)}
                  role="menuitem"
                  aria-current={activeKey === it.key ? "page" : undefined}
                  tabIndex={0}
                >
                  <span className="y2k-bullet">★</span>
                  <span className="y2k-label">{it.label}</span>
                  {it.badge && <span className="y2k-badge blink">{it.badge}</span>}
                  {activeKey === it.key && <span className="y2k-active">ACTIVE</span>}
                </li>
              ))}
            </ul>
          </div>
          <div className="y2k-sidebar__footer">Best viewed in 800×600 · IE5/Netscape 4 😉</div>
        </nav>

        <main className="y2k-content">
		    <div className="p-4 bg-cyan-500 text-white rounded-xl mb-4">Tailwind v4 ✅</div>
          <h1>Bossnet Netzwerkparty · Y2K EDITION</h1>
          <p>Transparentes Hover-Highlight mit Neon-Glow, glänzende Buttons & blinkende Badges – wie 1999.</p>

          <h2>Features (1999-Style)</h2>
          <ul className="y2k-list">
            <li>Neon-Hoverrahmen folgt der Maus (transparent innen, blauer Glow außen).</li>
            <li>3D-Buttons mit Farbverlauf, dicker Border & plastischem Shadow.</li>
            <li>Marquee-Header für ultimative Geocities-Energie.</li>
            <li>Blinkende "NEW"-Badges & pulsierende Akzente.</li>
          </ul>

          <h2>Was wir noch tun können</h2>
          <ul className="y2k-list">
            <li>Pixel-Dekor-Icons / animierte GIF-Sticker hinzufügen.</li>
            <li>Schrift auf echte Bitmap-Fonts umstellen (z. B. <em>Press Start 2P</em>).</li>
            <li>Gästebuch/Counter-Komponente (rein dekorativ 😉).</li>
            <li>Soundeffekte bei Hover/Click (deaktivierbar).</li>
          </ul>
        </main>
      </div>
    </div>
  );
}

ReactDOM.createRoot(document.getElementById("root")!).render(<App />);

