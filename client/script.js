const API = "http://localhost:3000/movies";

const form = document.getElementById("movieForm");
const list = document.getElementById("movieList");

const idInput = document.getElementById("movieId");
const titleInput = document.getElementById("title");
const genreInput = document.getElementById("genre");
const yearInput = document.getElementById("year");
const ratingInput = document.getElementById("rating");
const cancelBtn = document.getElementById("cancelBtn");
const sortBySelect = document.getElementById("sortBy");

// Funktion för att visa meddelande
function showMessage(message, type = 'info') {
  const modalBody = document.getElementById('modalMessage');
  modalBody.textContent = message;
  
  // Lägg till färgkodning baserat på typ
  const modalHeader = document.querySelector('#messageModal .modal-header');
  modalHeader.className = 'modal-header text-white';
  
  switch(type) {
    case 'success':
      modalHeader.classList.add('bg-success');
      break;
    case 'error':
      modalHeader.classList.add('bg-danger');
      break;
    case 'warning':
      modalHeader.classList.add('bg-warning', 'text-dark');
      break;
    default:
      modalHeader.classList.add('bg-primary');
  }
  
  const modal = new bootstrap.Modal(document.getElementById('messageModal'));
  modal.show();
}

// Funktion för att få rätt CSS-klass baserat på betyg
function getRatingClass(rating) {
  if (rating >= 8) return 'rating-high';
  if (rating >= 5) return 'rating-medium';
  return 'rating-low';
}

// Funktion för att få rätt badge-färg baserat på betyg
function getRatingBadgeClass(rating) {
  if (rating >= 8) return 'bg-success';
  if (rating >= 5) return 'bg-warning text-dark';
  return 'bg-danger';
}

// Funktion för att sortera filmer
function sortMovies(movies, sortBy) {
  const sorted = [...movies];

  switch(sortBy) {
    case 'title':
      return sorted.sort((a, b) => a.title.localeCompare(b.title, 'sv'));
    case 'rating-desc':
      return sorted.sort((a, b) => b.rating - a.rating);
    case 'rating-asc':
      return sorted.sort((a, b) => a.rating - b.rating);
    case 'year-desc':
      return sorted.sort((a, b) => b.year - a.year);
    case 'year-asc':
      return sorted.sort((a, b) => a.year - b.year);
    case 'genre':
      return sorted.sort((a, b) => a.genre.localeCompare(b.genre, 'sv'));
    default:
      return sorted;
  }
}

// Lyssna på sorteringsändring
sortBySelect.addEventListener('change', () => {
  loadMovies();
});

// SUBMIT - Skapa eller uppdatera film
form.addEventListener("submit", async (e) => {
  e.preventDefault();

  // Validera formulärdata på klientsidan
  const title = titleInput.value.trim();
  const genre = genreInput.value.trim();
  const year = Number(yearInput.value);
  const rating = Number(ratingInput.value);

  if (!title || !genre) {
    showMessage("Titel och genre får inte vara tomma", 'warning');
    return;
  }

  if (year < 1800 || year > 2100) {
    showMessage("År måste vara mellan 1800 och 2100", 'warning');
    return;
  }

  if (rating < 1 || rating > 10) {
    showMessage("Betyg måste vara mellan 1 och 10", 'warning');
    return;
  }

  const movie = { title, genre, year, rating };

  try {
    let response;
    
    if (idInput.value) {
      // UPDATE
      response = await fetch(`${API}/${idInput.value}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(movie)
      });
    } else {
      // CREATE
      response = await fetch(API, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(movie)
      });
    }

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.details?.join(', ') || errorData.error || 'Ett fel uppstod');
    }

    const result = await response.json();
    
    showMessage(
      idInput.value ? "✓ Film uppdaterad!" : "✓ Film tillagd!", 
      'success'
    );

    form.reset();
    idInput.value = "";
    cancelBtn.style.display = "none";
    await loadMovies();
    
  } catch (error) {
    showMessage(`⚠ ${error.message}`, 'error');
  }
});

// Avbryt-knapp
cancelBtn.addEventListener("click", () => {
  form.reset();
  idInput.value = "";
  cancelBtn.style.display = "none";
});

// LOAD - Hämta och visa alla filmer
async function loadMovies() {
  list.innerHTML = '<div class="col-12 text-center"><div class="spinner-border text-primary" role="status"><span class="visually-hidden">Laddar...</span></div></div>';
  
  try {
    const res = await fetch(API);
    
    if (!res.ok) {
      throw new Error(`Server svarade med status: ${res.status}`);
    }

    const contentType = res.headers.get("content-type");
    if (!contentType || !contentType.includes("application/json")) {
      throw new Error("Servern skickade inte JSON-data. Är servern igång?");
    }

    let movies = await res.json();

    if (movies.length === 0) {
      list.innerHTML = `
        <div class="col-12">
          <div class="empty-state">
            <i class="bi bi-film"></i>
            <h5>Inga filmer ännu</h5>
            <p class="text-muted">Lägg till din första film med formuläret ovan!</p>
          </div>
        </div>
      `;
      return;
    }

    // Sortera filmerna
    const sortBy = sortBySelect.value;
    movies = sortMovies(movies, sortBy);

    // Rensa listan
    list.innerHTML = '';

    movies.forEach(m => {
      const col = document.createElement("div");
      col.className = "col-md-6 col-lg-4";

      const ratingClass = getRatingClass(m.rating);
      const badgeClass = getRatingBadgeClass(m.rating);

      col.innerHTML = `
        <div class="movie-card ${ratingClass}">
          <h5><i class="bi bi-film"></i> ${escapeHtml(m.title)}</h5>
          <div class="mb-3">
            <span class="badge bg-secondary"><i class="bi bi-tag"></i> ${escapeHtml(m.genre)}</span>
            <span class="badge bg-dark"><i class="bi bi-calendar"></i> ${m.year}</span>
            <span class="badge ${badgeClass}"><i class="bi bi-star-fill"></i> ${m.rating}/10</span>
          </div>
          <div class="d-grid gap-2 d-md-flex">
            <button class="btn btn-warning btn-sm flex-fill edit-btn" 
                    data-id="${m.id}" 
                    data-title="${escapeHtml(m.title)}" 
                    data-genre="${escapeHtml(m.genre)}" 
                    data-year="${m.year}"
                    data-rating="${m.rating}">
              <i class="bi bi-pencil-fill"></i> Ändra
            </button>
            <button class="btn btn-danger btn-sm flex-fill delete-btn" data-id="${m.id}">
              <i class="bi bi-trash-fill"></i> Ta bort
            </button>
          </div>
        </div>
      `;

      list.appendChild(col);
    });
  } catch (error) {
    list.innerHTML = `
      <div class="col-12">
        <div class="alert alert-danger">
          <h5><i class="bi bi-exclamation-triangle-fill"></i> Kunde inte ladda filmer</h5>
          <p>${error.message}</p>
          <hr>
          <p class="mb-0">Kontrollera att servern körs med: <code>node server.js</code></p>
        </div>
      </div>
    `;
  }
}

// Hjälpfunktion för att escapea HTML och förhindra XSS
function escapeHtml(text) {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

// Event delegation för Ändra och Ta bort knappar
list.addEventListener("click", async (e) => {
  const editBtn = e.target.closest('.edit-btn');
  const deleteBtn = e.target.closest('.delete-btn');

  // EDIT
  if (editBtn) {
    idInput.value = editBtn.dataset.id;
    titleInput.value = editBtn.dataset.title;
    genreInput.value = editBtn.dataset.genre;
    yearInput.value = editBtn.dataset.year;
    ratingInput.value = editBtn.dataset.rating;
    cancelBtn.style.display = "inline-block";
    
    form.scrollIntoView({ behavior: 'smooth' });
  }

  // DELETE
  if (deleteBtn) {
    if (confirm("Är du säker på att du vill ta bort denna film?")) {
      try {
        const response = await fetch(`${API}/${deleteBtn.dataset.id}`, { 
          method: "DELETE" 
        });
        
        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.error || 'Kunde inte ta bort film');
        }
        
        showMessage("✓ Film borttagen!", 'success');
        await loadMovies();
      } catch (error) {
        showMessage(`⚠ ${error.message}`, 'error');
      }
    }
  }
});

// Ladda filmer när sidan laddas
loadMovies();