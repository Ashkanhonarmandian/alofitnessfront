// script.js  (production-safe)
const API_BASE = '/api';       // all API calls go through Nginx
const MEDIA_BASE = '';         // we'll request /uploads/* directly (proxied by Nginx)

// Build full URL for API endpoints
const api = (p) => `${API_BASE}${p}`;

async function loadTrainers() {
  const grid = document.getElementById('trainersGrid');
  const url = api('/trainers?populate[profile][fields][0]=url&populate[profile][fields][1]=formats&sort[0]=name:asc');

  try {
    const res = await fetch(url);
    const json = await res.json();

    if (!res.ok) {
      grid.innerHTML = `<div class="card" style="padding:16px">
        Error loading trainers: ${json?.error?.message || res.statusText} (Status: ${res.status})
      </div>`;
      return;
    }

    const trainers = (json.data || []).map(t => {
      const a = t;
      let path = null;
      if (a.profile?.formats) {
        path = a.profile.formats.small?.url || a.profile.formats.thumbnail?.url || a.profile.url || null;
      } else if (a.profile?.url) {
        path = a.profile.url;
      }

      // If Strapi returns /uploads/..., keep it relative so Nginx can proxy it
      const photoUrl = path
        ? (path.startsWith('http') ? path : `${MEDIA_BASE}${path}`)
        : null;

      return { id: a.id, name: a.name, bio: a.bio, photoUrl };
    }).filter(Boolean);

    grid.innerHTML = trainers.map(tr => `
      <article class="card">
        ${tr.photoUrl ? `<img src="${tr.photoUrl}" alt="${tr.name}" class="trainer-photo">` : ""}
        <h3>${tr.name}</h3>
        <p>${tr.bio ?? ""}</p>
        <a href="#booking" class="btn btn-primary" data-trainer-id="${tr.id}">Book ${tr.name}</a>
      </article>
    `).join("");

    setupTrainerBookingButtons();
  } catch (e) {
    grid.innerHTML = `<div class="card" style="padding:16px">Network error: ${e.message || e}</div>`;
  }
}
loadTrainers();

// Helpers
function setupTrainerBookingButtons() {
  document.querySelectorAll('[data-trainer-id]').forEach(btn => {
    btn.addEventListener('click', function() {
      const trainerId = this.getAttribute('data-trainer-id');
      const trainerSelect = document.getElementById('trainer');
      if (trainerSelect) trainerSelect.value = trainerId;
    });
  });
}

const bookingForm = document.getElementById('bookingForm');
if (bookingForm) {
  bookingForm.addEventListener('submit', async function(e) {
    e.preventDefault();
    const trainerId = this.trainer.value;

    let timeValue = this.time.value;
    if (timeValue && timeValue.length === 5) timeValue = timeValue + ':00.000';

    const data = {
      clientname: this.name.value,
      email: this.email.value,
      date: this.date.value,
      time: timeValue,
      trainer: trainerId ? parseInt(trainerId) : undefined,
    };

    try {
      const res = await fetch(api('/bookings'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ data })
      });
      const result = await res.json();
      if (!res.ok) throw new Error(result?.error?.message || 'Failed to book');

      document.getElementById('toast').style.display = 'block';
      setTimeout(() => document.getElementById('toast').style.display = 'none', 3000);
      this.reset();
    } catch (err) {
      alert('Booking failed: ' + (err.message || err));
    }
  });
}
