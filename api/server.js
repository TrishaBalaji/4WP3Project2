const express = require('express');
const sqlite3 = require('sqlite3').verbose();
const multer = require('multer');
const path = require('path');
const fs = require('fs');

const app = express();
const PORT = 3000;

// Ensure uploads folder exists
const uploadsDir = path.join(__dirname, 'uploads');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use('/uploads', express.static(uploadsDir));

// SQLite setup
const db = new sqlite3.Database(path.join(__dirname, 'database.db'), (err) => {
  if (err) {
    console.error('Failed to connect to SQLite database:', err.message);
  } else {
    console.log('Connected to SQLite database.');
  }
});

// Note: SQLite does not have a native IMAGE type.
// The visual field is stored as TEXT containing the uploaded PNG file path.
db.run(`
  CREATE TABLE IF NOT EXISTS inspirations (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    summary TEXT NOT NULL,
    explanation TEXT NOT NULL,
    visual TEXT,
    priority INTEGER NOT NULL CHECK(priority >= 1 AND priority <= 10)
  ); 

`);

db.get("SELECT COUNT(*) AS count FROM inspirations", (err, row) => {
  if (row.count === 0) {
    db.run(`INSERT INTO inspirations (summary, explanation, visual, priority)
      VALUES ('Neon Cityscape', 'A futuristic cyberpunk city...', '', 9)`);

    db.run(`INSERT INTO inspirations (summary, explanation, visual, priority)
      VALUES ('Floating Islands', 'Massive islands drifting...', '', 8)`);

    db.run(`INSERT INTO inspirations (summary, explanation, visual, priority)
      VALUES ('Forest Spirit', 'A mystical creature...', '', 10)`);
  }
});

// Multer config for PNG uploads only
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadsDir);
  },
  filename: (req, file, cb) => {
    const uniqueName = `${Date.now()}-${Math.round(Math.random() * 1e9)}${path.extname(file.originalname)}`;
    cb(null, uniqueName);
  }
});

const fileFilter = (req, file, cb) => {
  if (file.mimetype === 'image/png') {
    cb(null, true);
  } else {
    cb(new Error('Only PNG files are allowed.'), false);
  }
};

const upload = multer({ storage, fileFilter });

function deleteFileIfExists(filePath) {
  if (!filePath) return;
  const absolutePath = path.join(__dirname, filePath);
  if (fs.existsSync(absolutePath)) {
    fs.unlinkSync(absolutePath);
  }
}

// Home page: simple HTML table of all inspirations
app.get('/', (req, res) => {
  db.all('SELECT * FROM inspirations ORDER BY priority DESC, id ASC', [], (err, rows) => {
    if (err) {
      return res.status(500).send('Error fetching inspirations.');
    }

    const tableRows = rows.map(item => `
      <tr>
        <td>${item.id}</td>
        <td>${item.summary}</td>
        <td>${item.explanation}</td>
        <td>${item.visual ? `<img src="/${item.visual}" alt="visual" width="100" />` : 'No image'}</td>
        <td>${item.priority}</td>
      </tr>
    `).join('');

    res.send(`
      <!DOCTYPE html>
      <html lang="en">
      <head>
        <meta charset="UTF-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
        <title>Art Inspirations</title>
        <style>
          body { font-family: Arial, sans-serif; margin: 40px; }
          table { border-collapse: collapse; width: 100%; }
          th, td { border: 1px solid #ccc; padding: 10px; text-align: left; vertical-align: top; }
          th { background: #f4f4f4; }
          img { border-radius: 6px; }
          .note { margin-bottom: 20px; color: #444; }
        </style>
      </head>
      <body>
        <h1>Art Inspirations</h1>
        <p class="note">
          Table fields: <strong>id</strong> (INTEGER), <strong>summary</strong> (TEXT),
          <strong>explanation</strong> (TEXT), <strong>visual</strong> (stored as uploaded PNG path in SQLite),
          and <strong>priority</strong> (INTEGER 1-10).
        </p>
        <table>
          <thead>
            <tr>
              <th>id</th>
              <th>summary</th>
              <th>explanation</th>
              <th>visual</th>
              <th>priority</th>
            </tr>
          </thead>
          <tbody>
            ${tableRows || '<tr><td colspan="5">No inspirations found.</td></tr>'}
          </tbody>
        </table>
      </body>
      </html>
    `);
  });
});

// GET all inspirations
app.get('/api', (req, res) => {
  db.all('SELECT * FROM inspirations ORDER BY priority DESC, id ASC', [], (err, rows) => {
    if (err) {
      return res.status(500).json({ error: err.message });
    }
    res.json(rows);
  });
});

// GET one inspiration by id
app.get('/api/:id', (req, res) => {
  const { id } = req.params;
  db.get('SELECT * FROM inspirations WHERE id = ?', [id], (err, row) => {
    if (err) {
      return res.status(500).json({ error: err.message });
    }
    if (!row) {
      return res.status(404).json({ error: 'Inspiration not found.' });
    }
    res.json(row);
  });
});

// Generic error handling
app.use((err, req, res, next) => {
  if (err instanceof multer.MulterError || err) {
    return res.status(400).json({ error: err.message || 'Upload error.' });
  }
  next();
});

app.listen(PORT, () => {
  console.log(`Server is running on http://localhost:${PORT}`);
});
