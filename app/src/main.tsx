import React, { useEffect, useMemo, useRef, useState } from "react";
import ReactDOM from "react-dom/client";
import "./index.css";
import "./y2k-styles.css";
import { marked } from "marked"; // ✅ Korrigierter Import

type Item = { key: string; label: string; badge?: string };

function App() {
  const items: Item[] = useMemo(
    () => [
      { key: "overview", label: "Übersicht" },
      { key: "teilnehmer", label: "Teilnehmer" },
      { key: "programm", label: "Programm" },
      { key: "location", label: "Location" },
      { key: "tickets", label: "Tickets", badge: "NEW" },
      { key: "infos", label: "Infos" },
    ],
    []
  );

  const [activeKey, setActiveKey] = useState(items[0].key);
  const [hoverIndex, setHoverIndex] = useState<number | null>(null);
  const [markerStyle, setMarkerStyle] = useState<{ y: number; h: number }>({ y: 0, h: 0 });
  const containerRef = useRef<HTMLDivElement | null>(null);
  const itemRefs = useRef<(HTMLLIElement | null)[]>([]);
  const raf = useRef<number | null>(null);

  const getIndex = () => hoverIndex ?? items.findIndex((i) => i.key === activeKey);

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

  const [mdHtml, setMdHtml] = useState<string>("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    async function loadMd() {
      try {
        setLoading(true);
        setError(null);
        
        const res = await fetch(`/docs/${activeKey}.md`);
        if (!res.ok) {
          throw new Error(`Datei nicht gefunden: ${res.status}`);
        }
        
        const text = await res.text();
        const html = marked(text); // ✅ Vereinfachter Aufruf
        
        if (!cancelled) {
          setMdHtml(html);
        }
      } catch (e: any) {
        console.error("Markdown-Fehler:", e);
        if (!cancelled) {
          setError(`Fehler: ${e.message}`);
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }
    
    loadMd();
    return () => {
      cancelled = true;
    };
  }, [activeKey]);

  const onKeyDown: React.KeyboardEventHandler<HTMLUListElement> = (e) => {
    const idx = getIndex();
    if (e.key === "ArrowDown") {
      e.preventDefault();
      const next = Math.min(idx + 1, items.length - 1);
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
      const current = items[idx];
      if (current) setActiveKey(current.key);
    }
  };

  return (
    <div className="y2k-wrapper">
      <div className="y2k-marquee">
        <div className="y2k-marquee__track">
          Willkommen zur BOSS.net LAN-Party · Y2K EDITION · Bring your ICQ-Nummer · Gästebucheintrag nicht vergessen! · ✨
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
            <ul className="y2k-menu" role="menu" aria-label="Hauptnavigation" onKeyDown={onKeyDown}>
              {items.map((it, idx) => (
                <li
                  key={it.key}
                  ref={(el) => (itemRefs.current[idx] = el)}
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
          <div className="y2k-sidebar__footer">Best viewed in 800×600 · IE5/Netscape 4</div>
        </nav>

        <main className="y2k-content">
          {loading && <p>Lade Inhalte…</p>}
          {error && (
            <div style={{ color: '#ef4444' }}>
              <p>{error}</p>
              <p>Prüfe, ob die Datei unter <code>public/docs/{activeKey}.md</code> liegt.</p>
            </div>
          )}
          {!loading && !error && (
            <article
              className="prose prose-invert max-w-none"
              dangerouslySetInnerHTML={{ __html: mdHtml }}
            />
          )}
        </main>
      </div>
    </div>
  );
}

ReactDOM.createRoot(document.getElementById("root")!).render(<App />);
