const express = require('express');
const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const fs = require('fs');
const cors = require('cors');

const app = express();
const PORT = 3000;

// Ensure uploads folder exists
// const uploadsDir = path.join(__dirname, 'uploads');
// if (!fs.existsSync(uploadsDir)) {
//   fs.mkdirSync(uploadsDir, { recursive: true });
// }

const allowedOrigins = ['http://localhost:8081'];

app.use((req, res, next) => {const origin = req.headers.origin;
if (allowedOrigins.includes(origin)) {
res.header('Access-Control-Allow-Origin', origin);
}
res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization');
if (req.method === 'OPTIONS') {
return res.status(200).end();
}
next();

});

app.use(cors({
  origin: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type']
}));

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

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

app.post('/api', (req, res) => {
  const { summary, explanation, priority } = req.body;
  const parsedPriority = Number(priority);

  if (!summary || !explanation || !Number.isInteger(parsedPriority) || parsedPriority < 1 || parsedPriority > 10) {
    return res.status(400).json({
      error: 'summary and explanation are required, and priority must be an integer between 1 and 10.'
    });
  }

  db.run(
    'INSERT INTO inspirations (summary, explanation, visual, priority) VALUES (?, ?, ?, ?)',
    [summary, explanation, null, parsedPriority],
    function (err) {
      if (err) {
        return res.status(500).json({ error: err.message });
      }

      db.get('SELECT * FROM inspirations WHERE id = ?', [this.lastID], (selectErr, row) => {
        if (selectErr) {
          return res.status(500).json({ error: selectErr.message });
        }
        res.status(201).json(row);
      });
    }
  );
});

//Deleted 'Update All' route because it doesn't make sense to implement with the front end 
//Only one form to update one entry at a time 

// Update one selected entry by completing a PUT request to /api/:id
app.put('/api/:id', (req, res) => {
  const { id } = req.params;
  const { summary, explanation, priority } = req.body;
  const parsedPriority = Number(priority);

  db.get('SELECT * FROM inspirations WHERE id = ?', [id], (err, existing) => {
    if (err) {
      if (req.file) fs.unlinkSync(req.file.path);
      return res.status(500).json({ error: err.message });
    }

    if (!existing) {
      if (req.file) fs.unlinkSync(req.file.path);
      return res.status(404).json({ error: 'Inspiration not found.' });
    }

    const updatedSummary = summary ?? existing.summary;
    const updatedExplanation = explanation ?? existing.explanation;
    const updatedPriority = priority !== undefined ? parsedPriority : existing.priority;

    if (!updatedSummary || !updatedExplanation || !Number.isInteger(updatedPriority) || updatedPriority < 1 || updatedPriority > 10) {
      if (req.file) fs.unlinkSync(req.file.path);
      return res.status(400).json({
        error: 'summary and explanation are required, and priority must be an integer between 1 and 10.'
      });
    }

    db.run(
      'UPDATE inspirations SET summary = ?, explanation = ?, priority = ? WHERE id = ?',
      [updatedSummary, updatedExplanation, updatedPriority, id],
      function (updateErr) {
        if (updateErr) {
          if (req.file) fs.unlinkSync(req.file.path);
          return res.status(500).json({ error: updateErr.message });
        }

        if (req.file && existing.visual) {
          deleteFileIfExists(existing.visual);
        }

        db.get('SELECT * FROM inspirations WHERE id = ?', [id], (selectErr, row) => {
          if (selectErr) {
            return res.status(500).json({ error: selectErr.message });
          }
          res.json(row);
        });
      }
    );
  });
});

// Delete all entries
app.delete('/api', (req, res) => {
  db.all('SELECT * FROM inspirations', [], (err, rows) => {
    if (err) {
      return res.status(500).json({ error: err.message });
    }

    rows.forEach(item => {
      if (item.visual) {
        deleteFileIfExists(item.visual);
      }
    });

    db.run('DELETE FROM inspirations', [], function (deleteErr) {
      if (deleteErr) {
        return res.status(500).json({ error: deleteErr.message });
      }

      res.json({
        message: 'All inspirations deleted successfully.',
        changes: this.changes
      });
    });
  });
});

// Delete one selected entry
app.delete('/api/:id', (req, res) => {
  const { id } = req.params;

  db.get('SELECT * FROM inspirations WHERE id = ?', [id], (err, existing) => {
    if (err) {
      return res.status(500).json({ error: err.message });
    }

    if (!existing) {
      return res.status(404).json({ error: 'Inspiration not found.' });
    }

    db.run('DELETE FROM inspirations WHERE id = ?', [id], function (deleteErr) {
      if (deleteErr) {
        return res.status(500).json({ error: err.message });
      }

      if (existing.visual) {
        deleteFileIfExists(existing.visual);
      }

      res.json({ message: 'Inspiration deleted successfully.' });
    });
  });
});

app.listen(PORT, () => {
  console.log(`Server is running on http://localhost:${PORT}`);
});
