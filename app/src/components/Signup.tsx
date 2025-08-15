import { useMemo, useState, useEffect, useRef } from 'react';

// Client-side Input Sanitization
function sanitizeInput(input: string): string {
  return input
    .trim()
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '') // Remove script tags
    .replace(/[<>]/g, '') // Remove < and > characters
    .slice(0, 255); // Limit length
}

// Client-side validation
function validateNickname(nickname: string): boolean {
  const sanitized = sanitizeInput(nickname);
  return sanitized.length >= 2 && sanitized.length <= 50 && /^[a-zA-Z0-9_\[\]\-\.\s]+$/.test(sanitized);
}

function validateEmail(email: string): boolean {
  const emailRegex = /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)*$/;
  return email.length <= 255 && emailRegex.test(email);
}

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
    // Honeypot fields (hidden from user)
    website: '',
    phone: '',
    address: '',
  });
  
  const [status, setStatus] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [errors, setErrors] = useState<{[key: string]: string}>({});
  const formLoadTime = useRef(Date.now());
  const submitAttempts = useRef(0);
  const lastSubmitTime = useRef(0);

  // Client-side validation
  const validation = useMemo(() => {
    const newErrors: {[key: string]: string} = {};
    
    if (form.clan_nickname && !validateNickname(form.clan_nickname)) {
      newErrors.clan_nickname = 'Nickname muss 2-50 Zeichen lang sein und darf nur Buchstaben, Zahlen, _, [], -, . und Leerzeichen enthalten.';
    }
    
    if (form.email && !validateEmail(form.email)) {
      newErrors.email = 'Bitte gib eine gültige E-Mail-Adresse ein.';
    }
    
    return {
      isValid: Object.keys(newErrors).length === 0 && form.clan_nickname && form.email && form.consent,
      errors: newErrors
    };
  }, [form.clan_nickname, form.email, form.consent]);

  useEffect(() => {
    setErrors(validation.errors);
  }, [validation.errors]);

  function updateField<K extends keyof typeof form>(key: K, value: (typeof form)[K]) {
    setForm(prev => {
      const newForm = { ...prev, [key]: value };
      
      // Sanitize text inputs
      if (key === 'clan_nickname' && typeof value === 'string') {
        newForm[key] = sanitizeInput(value) as any;
      }
      if (key === 'email' && typeof value === 'string') {
        newForm[key] = value.toLowerCase().trim() as any;
      }
      
      return newForm;
    });
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    
    // Rate limiting client-side
    const now = Date.now();
    if (now - lastSubmitTime.current < 3000) {
      setStatus('Bitte warte ein paar Sekunden zwischen den Versuchen.');
      return;
    }
    lastSubmitTime.current = now;
    
    // Attempt limiting
    submitAttempts.current += 1;
    if (submitAttempts.current > 5) {
      setStatus('Zu viele Versuche. Bitte lade die Seite neu.');
      return;
    }

    // Bot detection - check honeypot fields
    if (form.website || form.phone || form.address) {
      setStatus('Fehler beim Senden der Daten.');
      return;
    }

    // Final validation
    if (!validation.isValid) {
      setStatus('Bitte korrigiere die Eingabefehler.');
      return;
    }

    if (!form.consent) {
      setStatus('Bitte bestätige die Privatparty-Bedingungen.');
      return;
    }

    const payload = {
      clan_nickname: sanitizeInput(form.clan_nickname),
      email: form.email.toLowerCase().trim(),
      ticket_type: form.ticket_type === 'Ü18' ? 'Ü18' : 'U18',
      shirt: !!form.shirt,
      pizza: !!form.pizza,
      drinks: !!form.drinks,
      guests: form.guests === 'keine' ? 0 : Number(form.guests),
      consent: !!form.consent,
      formLoadTime: formLoadTime.current,
    };

    setIsLoading(true);
    setStatus(null);

    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 10000); // 10s timeout

      const response = await fetch('/api/register', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'X-Requested-With': 'XMLHttpRequest' // CSRF protection
        },
        body: JSON.stringify(payload),
        signal: controller.signal
      });

      clearTimeout(timeoutId);
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || `HTTP ${response.status}`);
      }

      setStatus('✅ Anmeldung erfolgreich gespeichert! Du erhältst eine Bestätigung per E-Mail.');
      
      // Reset form on success
      setForm({
        clan_nickname: '',
        email: '',
        ticket_type: 'Ü18',
        shirt: false,
        pizza: false,
        drinks: false,
        guests: 'keine',
        consent: false,
        website: '',
        phone: '',
        address: '',
      });
      submitAttempts.current = 0;

    } catch (error: any) {
      console.error('Registration error:', error);
      
      if (error.name === 'AbortError') {
        setStatus('Zeitüberschreitung. Bitte versuche es erneut.');
      } else if (error.message.includes('429')) {
        setStatus('Zu viele Anfragen. Bitte warte ein paar Minuten.');
      } else if (error.message.includes('409')) {
        setStatus('Diese E-Mail ist bereits registriert.');
      } else {
        setStatus(error.message || 'Fehler beim Senden. Bitte versuche es später erneut.');
      }
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <div className="mx-auto max-w-xl p-4 space-y-4">
      <h1 className="text-2xl font-bold">Anmeldung</h1>
      <p className="text-sm opacity-80">
        Da es sich um eine Privatparty handelt ist die Anmeldung nur möglich durch vorherige Einladung.
      </p>

      <form onSubmit={onSubmit} className="space-y-4" autoComplete="off">
        {/* Honeypot fields - hidden from users, filled by bots */}
        <div style={{ position: 'absolute', left: '-9999px' }} aria-hidden="true">
          <input
            type="text"
            name="website"
            value={form.website}
            onChange={e => updateField('website', e.target.value)}
            tabIndex={-1}
          />
          <input
            type="text"
            name="phone"
            value={form.phone}
            onChange={e => updateField('phone', e.target.value)}
            tabIndex={-1}
          />
          <input
            type="text"
            name="address"
            value={form.address}
            onChange={e => updateField('address', e.target.value)}
            tabIndex={-1}
          />
        </div>

        <div>
          <label className="block text-sm font-medium">[Clan]Nickname *</label>
          <input 
            type="text"
            className={`w-full border p-2 rounded ${errors.clan_nickname ? 'border-red-500' : 'border-gray-300'}`}
            value={form.clan_nickname}
            onChange={e => updateField('clan_nickname', e.target.value)}
            maxLength={50}
            required
            autoComplete="username"
          />
          {errors.clan_nickname && (
            <div className="text-xs text-red-600 mt-1">{errors.clan_nickname}</div>
          )}
        </div>

        <div>
          <label className="block text-sm font-medium">E-Mail *</label>
          <input 
            type="email" 
            className={`w-full border p-2 rounded ${errors.email ? 'border-red-500' : 'border-gray-300'}`}
            value={form.email}
            onChange={e => updateField('email', e.target.value)}
            maxLength={255}
            required
            autoComplete="email"
          />
          {errors.email && (
            <div className="text-xs text-red-600 mt-1">{errors.email}</div>
          )}
        </div>

        <div>
          <label className="block text-sm font-medium">Ticket</label>
          <select 
            className="w-full border p-2 rounded border-gray-300" 
            value={form.ticket_type}
            onChange={e => updateField('ticket_type', e.target.value as any)}
          >
            <option value="Ü18">Erwachsene (Ü18) - 20€</option>
            <option value="U18">Jugendliche (U18) - 10€</option>
          </select>
        </div>

        <div className="space-y-2">
          <label className="flex items-center gap-2">
            <input 
              type="checkbox" 
              checked={form.shirt} 
              onChange={e => updateField('shirt', e.target.checked)} 
            />
            Ich habe Interesse am offiziellen BOSS.net V T‑Shirt
          </label>
          
          <label className="flex items-center gap-2">
            <input 
              type="checkbox" 
              checked={form.pizza} 
              onChange={e => updateField('pizza', e.target.checked)} 
            />
            Ich möchte vor Ort gerne METRO Pizza aus dem Backofen bekommen können
          </label>
          
          <label className="flex items-center gap-2">
            <input 
              type="checkbox" 
              checked={form.drinks} 
              onChange={e => updateField('drinks', e.target.checked)} 
            />
            Ich möchte gerne vor Ort Getränke kaufen können
          </label>
        </div>

        <div>
          <label className="block text-sm font-medium">Ich bringe Zuschauer ohne PC mit</label>
          <select 
            className="w-full border p-2 rounded border-gray-300" 
            value={form.guests}
            onChange={e => updateField('guests', e.target.value as any)}
          >
            <option value="keine">keine</option>
            <option value="1">1</option>
            <option value="2">2</option>
          </select>
        </div>

        <div className="pt-2">
          <label className="flex items-center gap-2">
            <input 
              type="checkbox" 
              checked={form.consent} 
              onChange={e => updateField('consent', e.target.checked)}
              required
            />
            <span className="text-sm">
              Ich bestätige, dass ich zur Kenntnis genommen habe, dass es sich hier um eine Privatparty handelt, 
              zu der ich explizit eingeladen wurde. <span className="text-red-500">*</span>
            </span>
          </label>
        </div>

        <button 
          type="submit" 
          className={`w-full px-4 py-2 rounded text-white font-medium transition-colors ${
            isLoading || !validation.isValid
              ? 'bg-gray-400 cursor-not-allowed' 
              : 'bg-blue-600 hover:bg-blue-700'
          }`}
          disabled={isLoading || !validation.isValid}
        >
          {isLoading ? 'Sende Anmeldung...' : 'Anmeldung senden'}
        </button>

        {status && (
          <div className={`text-sm p-3 rounded ${
            status.includes('✅') 
              ? 'bg-green-100 text-green-800 border border-green-300' 
              : 'bg-red-100 text-red-800 border border-red-300'
          }`}>
            {status}
          </div>
        )}
      </form>
    </div>
  );
}
