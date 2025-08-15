import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import pkg from 'pg';
const { Pool } = pkg;

const app = express();
app.use(cors());
app.use(express.json());

const pool = new Pool({ connectionString: process.env.DATABASE_URL });

// Einmalig: Tabelle anlegen (id autoinc + Felder)
await pool.query(`
CREATE TABLE IF NOT EXISTS registrations (
  id SERIAL PRIMARY KEY,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  clan_nickname TEXT NOT NULL,
  email TEXT NOT NULL,
  ticket_type TEXT NOT NULL CHECK (ticket_type IN ('U18', 'Ü18')),
  shirt BOOLEAN NOT NULL DEFAULT false,
  pizza BOOLEAN NOT NULL DEFAULT false,
  drinks BOOLEAN NOT NULL DEFAULT false,
  guests INT NOT NULL DEFAULT 0,
  consent BOOLEAN NOT NULL DEFAULT false,
  bezahlt INT NOT NULL DEFAULT 0,
  UNIQUE (email)
);
`);

app.post('/api/register', async (req, res) => {
  try {
    const {
      clan_nickname,
      email,
      ticket_type,
      shirt = false,
      pizza = false,
      drinks = false,
      guests = 0,
      consent = false
    } = req.body || {};

    if (!clan_nickname || !email || !ticket_type) {
      return res.status(400).json({ error: 'Pflichtfelder fehlen.' });
    }
    if (!consent) {
      return res.status(400).json({ error: 'Bestätigung (Privatparty) ist Pflicht.' });
    }
    const basicEmail = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!basicEmail.test(email)) {
      return res.status(400).json({ error: 'E-Mail ungültig.' });
    }
    if (!['U18', 'Ü18'].includes(ticket_type)) {
      return res.status(400).json({ error: 'ticket_type ungültig.' });
    }

    const { rows } = await pool.query(
      `INSERT INTO registrations
       (clan_nickname, email, ticket_type, shirt, pizza, drinks, guests, consent)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8)
       ON CONFLICT (email) DO UPDATE SET
         clan_nickname = EXCLUDED.clan_nickname,
         ticket_type = EXCLUDED.ticket_type,
         shirt = EXCLUDED.shirt,
         pizza = EXCLUDED.pizza,
         drinks = EXCLUDED.drinks,
         guests = EXCLUDED.guests,
         consent = EXCLUDED.consent
       RETURNING id;`,
      [clan_nickname, email, ticket_type, !!shirt, !!pizza, !!drinks, Number(guests)||0, !!consent]
    );

    res.json({ ok: true, id: rows[0].id });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: 'Serverfehler' });
  }
});

app.get('/api/health', (_req, res) => res.json({ ok: true }));

// Liste der Teilnehmer (nur benötigte Felder)
app.get('/api/registrations', async (_req, res) => {
  try {
    const { rows } = await pool.query(`
      SELECT id, clan_nickname, bezahlt
      FROM registrations
      ORDER BY created_at DESC
      LIMIT 1000
    `);
    res.json(rows);
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: 'Serverfehler' });
  }
});


app.listen(process.env.PORT || 5177, () => {
  console.log('Server läuft auf Port', process.env.PORT || 5177);
});
