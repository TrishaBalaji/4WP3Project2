const express = require('express');
const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const fs = require('fs');

const app = express();
const PORT = 3000;

// Ensure uploads folder exists
// const uploadsDir = path.join(__dirname, 'uploads');
// if (!fs.existsSync(uploadsDir)) {
//   fs.mkdirSync(uploadsDir, { recursive: true });
// }

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

// Update all entries 
app.put('/api', (req, res) => {
  const { summary, explanation, priority } = req.body;
  const parsedPriority = Number(priority);
if (summary === undefined && explanation === undefined && priority === undefined) {
    return res.status(400).json({
      error: 'Provide at least one field to update: summary, explanation, or priority.'
    });
  }

  if (priority !== undefined && (!Number.isInteger(parsedPriority) || parsedPriority < 1 || parsedPriority > 10)) {
    return res.status(400).json({
      error: 'priority must be an integer between 1 and 10.'
    });
  }

  const fields = [];
  const values = [];

  if (summary !== undefined) {
    fields.push('summary = ?');
    values.push(summary);
  }

  if (explanation !== undefined) {
    fields.push('explanation = ?');
    values.push(explanation);
  }

  if (priority !== undefined) {
    fields.push('priority = ?');
    values.push(parsedPriority);
  }

  const sql = `UPDATE inspirations SET ${fields.join(', ')}`;

  db.run(sql, values, function (err) {
    if (err) {
      return res.status(500).json({ error: err.message });
    }

    db.all('SELECT * FROM inspirations ORDER BY priority DESC, id ASC', [], (selectErr, rows) => {
      if (selectErr) {
        return res.status(500).json({ error: selectErr.message });
      }

      res.json({
        message: 'All inspirations updated successfully.',
        changes: this.changes,
        data: rows
      });
    });
  });
});

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
