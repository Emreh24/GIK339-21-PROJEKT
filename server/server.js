const express = require("express");
const sqlite3 = require("sqlite3").verbose();
const cors = require("cors");
const path = require("path");

const app = express();
const PORT = 3000;

app.use(cors());
app.use(express.json({ limit: "10mb" }));

// Servera statiska filer från client-mappen
app.use(express.static(path.join(__dirname, "../client")));

const db = new sqlite3.Database("./movies.db");

// Skapa tabell
db.run(
  `
  CREATE TABLE IF NOT EXISTS movies (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    title TEXT NOT NULL,
    genre TEXT NOT NULL,
    year INTEGER NOT NULL,
    rating INTEGER NOT NULL CHECK(rating >= 1 AND rating <= 10)
  )
`,
  (err) => {
    if (err) {
      console.error("❌ Fel vid skapande av tabell:", err);
    } else {
      console.log("✓ Databas och tabell redo!");
    }
  }
);

// =====================
// Valideringsfunktion
// =====================
function validateMovieData(data) {
  const { title, genre, year, rating } = data;
  const errors = [];

  if (!title || title.trim() === "") errors.push("Titel saknas");
  if (!genre || genre.trim() === "") errors.push("Genre saknas");

  const yearNum = Number(year);
  const ratingNum = Number(rating);

  if (!Number.isInteger(yearNum) || yearNum < 1895 || yearNum > 2026) {
    errors.push("År måste vara mellan 1895 och 2026");
  }

  if (!Number.isInteger(ratingNum) || ratingNum < 1 || ratingNum > 10) {
    errors.push("Betyg måste vara mellan 1 och 10");
  }

  return {
    valid: errors.length === 0,
    errors,
    data: {
      title: title?.trim(),
      genre: genre?.trim(),
      year: yearNum,
      rating: ratingNum,
    },
  };
}

// =====================
// GET – hämta alla filmer
// =====================
app.get("/movies", (req, res) => {
  console.log("📥 GET /movies – hämtar alla filmer");

  db.all("SELECT * FROM movies", (err, rows) => {
    if (err) {
      console.error("❌ GET error:", err);
      return res.status(500).json({ error: "Kunde inte hämta filmer" });
    }

    console.log(`✓ Skickade ${rows.length} filmer`);
    res.json(rows);
  });
});

// =====================
// POST – skapa film
// =====================
app.post("/movies", (req, res) => {
  const validation = validateMovieData(req.body);

  if (!validation.valid) {
    console.log("⚠️ POST /movies – valideringsfel:", validation.errors);
    return res.status(400).json({
      error: "Valideringsfel",
      details: validation.errors,
    });
  }

  console.log("➕ POST /movies – skapar film:", validation.data);

  const { title, genre, year, rating } = validation.data;

  db.run(
    "INSERT INTO movies (title, genre, year, rating) VALUES (?, ?, ?, ?)",
    [title, genre, year, rating],
    function (err) {
      if (err) {
        console.error("❌ POST error:", err);
        return res.status(500).json({ error: "Kunde inte skapa film" });
      }

      console.log(`✓ Film skapad med ID ${this.lastID}`);
      res.status(201).json({
        id: this.lastID,
        message: "Film skapad",
      });
    }
  );
});

// =====================
// PUT – uppdatera film
// =====================
app.put("/movies/:id", (req, res) => {
  const { id } = req.params;
  const validation = validateMovieData(req.body);

  if (!validation.valid) {
    console.log(`⚠️ PUT /movies/${id} – valideringsfel`, validation.errors);
    return res.status(400).json({
      error: "Valideringsfel",
      details: validation.errors,
    });
  }

  console.log(`✏️ PUT /movies/${id} – uppdaterar film:`, validation.data);

  const { title, genre, year, rating } = validation.data;

  db.run(
    "UPDATE movies SET title=?, genre=?, year=?, rating=? WHERE id=?",
    [title, genre, year, rating, id],
    function (err) {
      if (err) {
        console.error("❌ PUT error:", err);
        return res.status(500).json({ error: "Kunde inte uppdatera film" });
      }

      if (this.changes === 0) {
        console.log(`⚠️ Film ID ${id} hittades inte`);
        return res.status(404).json({ error: "Film hittades inte" });
      }

      console.log(`✓ Film ID ${id} uppdaterad`);
      res.json({ message: "Film uppdaterad" });
    }
  );
});

// =====================
// DELETE – ta bort film
// =====================
app.delete("/movies/:id", (req, res) => {
  const { id } = req.params;

  console.log(`🗑️ DELETE /movies/${id} – tar bort film`);

  db.run(
    "DELETE FROM movies WHERE id=?",
    [id],
    function (err) {
      if (err) {
        console.error("❌ DELETE error:", err);
        return res.status(500).json({ error: "Kunde inte ta bort film" });
      }

      if (this.changes === 0) {
        console.log(`⚠️ Film ID ${id} hittades inte`);
        return res.status(404).json({ error: "Film hittades inte" });
      }

      console.log(`✓ Film ID ${id} borttagen`);
      res.json({ message: "Film borttagen" });
    }
  );
});

// Root
app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "../client/index.html"));
});

// 404
app.use((req, res) => {
  res.status(404).json({ error: "Endpoint hittades inte" });
});

// Global felhantering
app.use((err, req, res, next) => {
  console.error("❌ Serverfel:", err);
  res.status(500).json({ error: "Internt serverfel" });
});

// Starta server
app.listen(PORT, () => {
  console.log("========================================");
  console.log("🎬 Filmbibliotek Server");
  console.log("========================================");
  console.log(`✓ Server körs på http://localhost:${PORT}`);
  console.log("✓ 4 fält: Titel, Genre, År, Betyg");
  console.log("✓ Validering: Aktiverad");
  console.log("✓ Sortering: Aktiverad");
  console.log("========================================");
});
