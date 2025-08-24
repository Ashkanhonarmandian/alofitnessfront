// script.js
const API = "http://127.0.0.1:1337";  // <-- change from localhost to 127.0.0.1

async function loadTrainers() {
  const grid = document.getElementById('trainersGrid');
  const url = API + "/api/trainers?populate[profile][fields][0]=url&populate[profile][fields][1]=formats&sort[0]=name:asc";

  try {
    const res = await fetch(url);
    const json = await res.json();
    console.log("Strapi trainers response:", json);

    if (!res.ok) {
      console.error("Strapi error:", json, "Status:", res.status);
      grid.innerHTML = `<div class="card" style="padding:16px">Error loading trainers: ${json?.error?.message || res.statusText} (Status: ${res.status})</div>`;
      return;
    }

    const trainers = (json.data || []).map(t => {
      if (!t) return null;
      const a = t; // flat structure
      let img = null, path = null;
      if (a.profile && a.profile.formats) {
        img = a.profile;
        path = img.formats.small?.url || img.formats.thumbnail?.url || img.url || null;
      } else if (a.profile && a.profile.url) {
        path = a.profile.url;
      }
      return { id: a.id, name: a.name, bio: a.bio, photoUrl: path ? (path.startsWith('http') ? path : API + path) : null };
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
    console.error("Network/parse error:", e);
    grid.innerHTML = `<div class="card" style="padding:16px">Network error: ${e.message || e}</div>`;
  }
}

loadTrainers();

// Helper: Set trainer ID on booking form when clicking 'Book' button
function setupTrainerBookingButtons() {
  document.querySelectorAll('[data-trainer-id]').forEach(btn => {
    btn.addEventListener('click', function() {
      const trainerId = this.getAttribute('data-trainer-id');
      const trainerSelect = document.getElementById('trainer');
      if (trainerSelect) {
        trainerSelect.value = trainerId;
      }
    });
  });
}

// Booking form submission handler
const bookingForm = document.getElementById('bookingForm');
if (bookingForm) {
  bookingForm.addEventListener('submit', async function(e) {
    e.preventDefault();
    const trainerId = this.trainer.value;
    // Fix time format for Strapi: HH:mm -> HH:mm:00.000
    let timeValue = this.time.value;
    if (timeValue && timeValue.length === 5) {
      timeValue = timeValue + ':00.000';
    }
    const data = {
      clientname: this.name.value,
      email: this.email.value,
      date: this.date.value, // should be ISO string if possible
      time: timeValue,
      trainer: trainerId ? parseInt(trainerId) : undefined,
    };
    try {
      const res = await fetch(API + '/api/bookings', {
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