import { useMemo, useState } from 'react';

export default function Signup() {
  const [form, setForm] = useState({
    clan_nickname: '',
    email: '',
    ticket_type: 'Ü18',
    shirt: false,
    pizza: false,
    drinks: false,
    guests: 'keine',
    consent: false,
  });
  const [status, setStatus] = useState<string | null>(null);

  const emailValid = useMemo(() => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email), [form.email]);

  function update<K extends keyof typeof form>(k: K, v: (typeof form)[K]) {
    setForm(prev => ({ ...prev, [k]: v }));
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.consent) { setStatus('Bitte die Privatparty-Bestätigung anhaken.'); return; }
    if (!form.clan_nickname) { setStatus('Clan/Nickname ist Pflicht.'); return; }
    if (!emailValid) { setStatus('Bitte gültige E-Mail angeben.'); return; }

    const payload = {
      clan_nickname: form.clan_nickname,
      email: form.email,
      ticket_type: form.ticket_type === 'Ü18' ? 'Ü18' : 'U18',
      shirt: !!form.shirt,
      pizza: !!form.pizza,
      drinks: !!form.drinks,
      guests: form.guests === 'keine' ? 0 : Number(form.guests),
      consent: !!form.consent,
    };

    try {
      const res = await fetch('/api/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || 'Fehler');
      setStatus('Anmeldung gespeichert. Danke!');
    } catch (err:any) {
      setStatus(err.message || 'Fehler beim Senden');
    }
  }

  return (
    <div className="mx-auto max-w-xl p-4 space-y-4">
      <h1 className="text-2xl font-bold">Anmeldung</h1>
      <p className="text-sm opacity-80">Da es sich um eine Privatparty handelt ist die Anmeldung nur möglich durch vorherige Einladung.</p>

      <form onSubmit={onSubmit} className="space-y-4">
        <div>
          <label className="block text-sm font-medium">[Clan]Nickname *</label>
          <input className="w-full border p-2 rounded" value={form.clan_nickname}
                 onChange={e=>update('clan_nickname', e.target.value)} />
        </div>
        <div>
          <label className="block text-sm font-medium">E-Mail *</label>
          <input type="email" className="w-full border p-2 rounded" value={form.email}
                 onChange={e=>update('email', e.target.value)} />
          {!emailValid && form.email && (
            <div className="text-xs text-red-600">E-Mail wirkt ungültig.</div>
          )}
        </div>
        <div>
          <label className="block text-sm font-medium">Ticket</label>
          <select className="w-full border p-2 rounded" value={form.ticket_type}
                  onChange={e=>update('ticket_type', e.target.value as any)}>
            <option>Ü18</option>
            <option>U18</option>
          </select>
        </div>
        <div className="space-y-2">
          <label className="flex items-center gap-2">
            <input type="checkbox" checked={form.shirt} onChange={e=>update('shirt', e.target.checked)} />
            Ich habe Interesse am offiziellen BOSS.net V T‑Shirt
          </label>
          <label className="flex items-center gap-2">
            <input type="checkbox" checked={form.pizza} onChange={e=>update('pizza', e.target.checked)} />
            Ich möchte vor Ort gerne METRO Pizza aus dem Backofen bekommen können
          </label>
          <label className="flex items-center gap-2">
            <input type="checkbox" checked={form.drinks} onChange={e=>update('drinks', e.target.checked)} />
            Ich möchte gerne vor Ort Getränke kaufen können
          </label>
        </div>
        <div>
          <label className="block text-sm font-medium">Ich bringe Zuschauer ohne PC mit</label>
          <select className="w-full border p-2 rounded" value={form.guests}
                  onChange={e=>update('guests', e.target.value as any)}>
            <option value="keine">keine</option>
            <option value="1">1</option>
            <option value="2">2</option>
          </select>
        </div>
        <div className="pt-2">
          <label className="flex items-center gap-2">
            <input type="checkbox" checked={form.consent} onChange={e=>update('consent', e.target.checked)} />
            Ich bestätige, dass ich zur Kenntnis genommen habe, dass es sich hier um eine Privatparty handelt, zu der ich explizit eingeladen wurde. (Pflicht)
          </label>
        </div>

        <button type="submit" className="px-4 py-2 rounded bg-black text-white">Senden</button>
        {status && <div className="text-sm">{status}</div>}
      </form>
    </div>
  );
}
