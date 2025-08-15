import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import rateLimit from 'express-rate-limit';
import helmet from 'helmet';
import validator from 'validator';
import pkg from 'pg';
const { Pool } = pkg;

const app = express();

// Security Middleware
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      scriptSrc: ["'self'"],
      imgSrc: ["'self'", "data:", "https:"],
    }
  }
}));

// CORS mit spezifischen Origins
const allowedOrigins = [
  'https://bossnet-dev.oberstrolex.synology.me',
  'http://localhost:5173', // für Development
];

app.use(cors({
  origin: function (origin, callback) {
    // Allow requests with no origin (mobile apps, etc.)
    if (!origin) return callback(null, true);
    if (allowedOrigins.includes(origin)) {
      return callback(null, true);
    }
    return callback(new Error('Not allowed by CORS'));
  },
  credentials: true
}));

// Rate Limiting
const generalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 Minuten
  max: 100, // max 100 requests per windowMs per IP
  message: { error: 'Zu viele Anfragen. Bitte warte 15 Minuten.' },
  standardHeaders: true,
  legacyHeaders: false,
});

const registrationLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 Stunde
  max: 5, // max 5 Registrierungen pro Stunde pro IP
  message: { error: 'Zu viele Anmeldungen. Bitte warte eine Stunde.' },
  standardHeaders: true,
  legacyHeaders: false,
});

app.use(generalLimiter);
app.use(express.json({ limit: '10mb' })); // Limit JSON payload size

// Database Connection Pool mit besseren Sicherheitseinstellungen
const pool = new Pool({ 
  connectionString: process.env.DATABASE_URL,
  max: 20, // Maximale Anzahl Verbindungen
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 2000,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
});

// Input Validation & Sanitization Functions
function validateAndSanitizeInput(data) {
  const errors = [];
  
  // Clan Nickname Validation
  if (!data.clan_nickname || typeof data.clan_nickname !== 'string') {
    errors.push('Clan/Nickname ist erforderlich.');
  } else if (data.clan_nickname.length < 2 || data.clan_nickname.length > 50) {
    errors.push('Clan/Nickname muss zwischen 2 und 50 Zeichen lang sein.');
  } else if (!/^[a-zA-Z0-9_\[\]\-\.\s]+$/.test(data.clan_nickname)) {
    errors.push('Clan/Nickname enthält ungültige Zeichen.');
  }
  
  // Email Validation
  if (!data.email || typeof data.email !== 'string') {
    errors.push('E-Mail ist erforderlich.');
  } else if (!validator.isEmail(data.email)) {
    errors.push('E-Mail Format ist ungültig.');
  } else if (data.email.length > 255) {
    errors.push('E-Mail ist zu lang.');
  }
  
  // Ticket Type Validation
  if (!data.ticket_type || !['U18', 'Ü18'].includes(data.ticket_type)) {
    errors.push('Ungültiger Ticket-Typ.');
  }
  
  // Boolean Validations
  const booleanFields = ['shirt', 'pizza', 'drinks', 'consent'];
  booleanFields.forEach(field => {
    if (data[field] !== undefined && typeof data[field] !== 'boolean') {
      errors.push(`${field} muss ein Boolean-Wert sein.`);
    }
  });
  
  // Guests Validation
  if (data.guests !== undefined) {
    const guests = Number(data.guests);
    if (!Number.isInteger(guests) || guests < 0 || guests > 10) {
      errors.push('Ungültige Anzahl Gäste (0-10 erlaubt).');
    }
  }
  
  // Consent Check
  if (!data.consent) {
    errors.push('Bestätigung (Privatparty) ist Pflicht.');
  }
  
  return {
    isValid: errors.length === 0,
    errors,
    sanitizedData: {
      clan_nickname: validator.escape(data.clan_nickname?.trim() || ''),
      email: validator.normalizeEmail(data.email?.toLowerCase()?.trim() || ''),
      ticket_type: data.ticket_type,
      shirt: Boolean(data.shirt),
      pizza: Boolean(data.pizza),
      drinks: Boolean(data.drinks),
      guests: Math.max(0, Math.min(10, Number(data.guests) || 0)),
      consent: Boolean(data.consent)
    }
  };
}

// Honeypot und versteckte Felder gegen Bots
function checkForBotActivity(req) {
  // Honeypot Field Check
  if (req.body.website || req.body.phone || req.body.address) {
    return true; // Wahrscheinlich Bot
  }
  
  // Timing Check (zu schnell ausgefüllt)
  const submitTime = Date.now();
  const formLoadTime = req.body.formLoadTime;
  if (formLoadTime && (submitTime - formLoadTime) < 3000) {
    return true; // Zu schnell ausgefüllt
  }
  
  return false;
}

// Einmalig: Sichere Tabellenerstellung
try {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS registrations (
      id SERIAL PRIMARY KEY,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      clan_nickname VARCHAR(50) NOT NULL,
      email VARCHAR(255) NOT NULL,
      ticket_type VARCHAR(3) NOT NULL CHECK (ticket_type IN ('U18', 'Ü18')),
      shirt BOOLEAN NOT NULL DEFAULT false,
      pizza BOOLEAN NOT NULL DEFAULT false,
      drinks BOOLEAN NOT NULL DEFAULT false,
      guests SMALLINT NOT NULL DEFAULT 0 CHECK (guests >= 0 AND guests <= 10),
      consent BOOLEAN NOT NULL DEFAULT false,
      bezahlt SMALLINT NOT NULL DEFAULT 0,
      ip_address INET,
      user_agent TEXT,
      UNIQUE (email),
      CHECK (LENGTH(clan_nickname) >= 2),
      CHECK (LENGTH(email) >= 5)
    );
    
    CREATE INDEX IF NOT EXISTS idx_registrations_email ON registrations(email);
    CREATE INDEX IF NOT EXISTS idx_registrations_created_at ON registrations(created_at);
  `);
  
  console.log('Database tables initialized successfully');
} catch (error) {
  console.error('Database initialization failed:', error);
  process.exit(1);
}

// Registration Endpoint mit Sicherheitsmaßnahmen
app.post('/api/register', registrationLimiter, async (req, res) => {
  try {
    // Bot Detection
    if (checkForBotActivity(req)) {
      return res.status(429).json({ error: 'Verdächtige Aktivität erkannt.' });
    }
    
    // Input Validation
    const validation = validateAndSanitizeInput(req.body);
    if (!validation.isValid) {
      return res.status(400).json({ 
        error: 'Eingabefehler gefunden.',
        details: validation.errors 
      });
    }
    
    const data = validation.sanitizedData;
    
    // Client IP und User Agent für Logging
    const clientIP = req.headers['x-forwarded-for'] || 
                     req.headers['x-real-ip'] || 
                     req.connection.remoteAddress || 
                     req.socket.remoteAddress || 
                     req.ip;
    const userAgent = req.headers['user-agent'] || '';
    
    // Database Transaction für Atomicity
    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      
      // Check if email already exists
      const existingCheck = await client.query(
        'SELECT id FROM registrations WHERE email = $1',
        [data.email]
      );
      
      let result;
      if (existingCheck.rows.length > 0) {
        // Update existing registration
        result = await client.query(`
          UPDATE registrations SET
            clan_nickname = $1,
            ticket_type = $2,
            shirt = $3,
            pizza = $4,
            drinks = $5,
            guests = $6,
            consent = $7,
            ip_address = $8,
            user_agent = $9
          WHERE email = $10
          RETURNING id;
        `, [
          data.clan_nickname,
          data.ticket_type,
          data.shirt,
          data.pizza,
          data.drinks,
          data.guests,
          data.consent,
          clientIP,
          userAgent,
          data.email
        ]);
      } else {
        // Insert new registration
        result = await client.query(`
          INSERT INTO registrations
            (clan_nickname, email, ticket_type, shirt, pizza, drinks, guests, consent, ip_address, user_agent)
          VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
          RETURNING id;
        `, [
          data.clan_nickname,
          data.email,
          data.ticket_type,
          data.shirt,
          data.pizza,
          data.drinks,
          data.guests,
          data.consent,
          clientIP,
          userAgent
        ]);
      }
      
      await client.query('COMMIT');
      
      // Log successful registration
      console.log(`Registration successful: ID ${result.rows[0].id}, Email: ${data.email}, IP: ${clientIP}`);
      
      res.json({ 
        ok: true, 
        id: result.rows[0].id,
        message: 'Anmeldung erfolgreich gespeichert.'
      });
      
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
    
  } catch (error) {
    console.error('Registration error:', error);
    
    // Don't expose internal errors to client
    if (error.code === '23505') { // Unique violation
      res.status(409).json({ error: 'E-Mail bereits registriert.' });
    } else if (error.code === '23514') { // Check violation
      res.status(400).json({ error: 'Ungültige Eingabedaten.' });
    } else {
      res.status(500).json({ error: 'Ein Fehler ist aufgetreten. Bitte versuche es später erneut.' });
    }
  }
});

// Health Check Endpoint
app.get('/api/health', async (_req, res) => {
  try {
    await pool.query('SELECT 1');
    res.json({ ok: true, timestamp: new Date().toISOString() });
  } catch (error) {
    res.status(503).json({ ok: false, error: 'Database connection failed' });
  }
});

// Sicherer Teilnehmer-Endpoint
app.get('/api/registrations', async (req, res) => {
  try {
    // Optional: Basis-Authentifizierung für sensible Daten
    const authHeader = req.headers.authorization;
    const expectedAuth = process.env.ADMIN_AUTH_TOKEN;
    
    if (expectedAuth && authHeader !== `Bearer ${expectedAuth}`) {
      // Falls Auth aktiviert ist, aber nicht bereitgestellt
      return res.status(401).json({ error: 'Unauthorized' });
    }
    
    const { rows } = await pool.query(`
      SELECT 
        id, 
        clan_nickname, 
        bezahlt,
        created_at
      FROM registrations
      WHERE consent = true
      ORDER BY created_at DESC
      LIMIT 100
    `);
    
    res.json(rows);
  } catch (error) {
    console.error('Registration list error:', error);
    res.status(500).json({ error: 'Serverfehler beim Laden der Teilnehmer.' });
  }
});

// Error Handling Middleware
app.use((err, req, res, next) => {
  console.error('Unhandled error:', err);
  res.status(500).json({ error: 'Ein unerwarteter Fehler ist aufgetreten.' });
});

// 404 Handler
app.use((req, res) => {
  res.status(404).json({ error: 'Endpoint nicht gefunden.' });
});

// Graceful shutdown
process.on('SIGTERM', async () => {
  console.log('SIGTERM received, shutting down gracefully');
  await pool.end();
  process.exit(0);
});

process.on('SIGINT', async () => {
  console.log('SIGINT received, shutting down gracefully');
  await pool.end();
  process.exit(0);
});

const PORT = process.env.PORT || 5177;
app.listen(PORT, () => {
  console.log(`Secure server running on port ${PORT}`);
});
