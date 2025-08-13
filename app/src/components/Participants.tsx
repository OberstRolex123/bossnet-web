import { useEffect, useState } from "react";

type Row = { id: number; clan_nickname: string; bezahlt: number | null };

export default function Participants() {
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        setLoading(true);
        setError(null);
        const res = await fetch("/api/registrations");
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const data: Row[] = await res.json();
        if (!cancelled) setRows(data);
      } catch (e: any) {
        if (!cancelled) setError(e.message || "Load failed");
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, []);

  return (
    <div className="p-4">
      <h1 className="text-2xl font-bold mb-4">Teilnehmer</h1>
      {loading && <div>Lade…</div>}
      {error && <div className="text-red-500">Fehler: {error}</div>}
      {!loading && !error && (
        rows.length === 0 ? (
          <div>Noch keine Anmeldungen.</div>
        ) : (
          <table className="w-full text-sm border-collapse">
            <thead>
              <tr className="border-b">
                <th className="text-left py-2 pr-4">ID</th>
                <th className="text-left py-2 pr-4">Nickname</th>
                <th className="text-left py-2 pr-4">Status</th>
              </tr>
            </thead>
            <tbody>
              {rows.map(r => {
                const status = r.bezahlt === 1 ? "angemeldet" : "registriert"; // null/0 => registriert
                return (
                  <tr key={r.id} className="border-b hover:bg-black/10">
                    <td className="py-2 pr-4">{r.id}</td>
                    <td className="py-2 pr-4">{r.clan_nickname}</td>
                    <td className="py-2 pr-4">{status}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )
      )}
    </div>
  );
}

