// Counter functionality
let counter = 0;
const counterElement = document.getElementById('counter');
const incrementBtn = document.getElementById('incrementBtn');
const decrementBtn = document.getElementById('decrementBtn');
const resetBtn = document.getElementById('resetBtn');

function updateCounter() {
    counterElement.textContent = counter;
    // Add animation
    counterElement.style.transform = 'scale(1.2)';
    setTimeout(() => {
        counterElement.style.transform = 'scale(1)';
    }, 200);
}

incrementBtn.addEventListener('click', () => {
    counter++;
    updateCounter();
});

decrementBtn.addEventListener('click', () => {
    counter--;
    updateCounter();
});

resetBtn.addEventListener('click', () => {
    counter = 0;
    updateCounter();
});

// Greeting functionality
const nameInput = document.getElementById('nameInput');
const greetBtn = document.getElementById('greetBtn');
const greetingMessage = document.getElementById('greetingMessage');

greetBtn.addEventListener('click', () => {
    const name = nameInput.value.trim();
    if (name) {
        greetingMessage.textContent = `Merhaba, ${name}! Hoş geldiniz! 👋`;
        greetingMessage.style.opacity = '0';
        setTimeout(() => {
            greetingMessage.style.opacity = '1';
        }, 50);
    } else {
        greetingMessage.textContent = 'Lütfen adınızı girin! 😊';
        greetingMessage.style.color = '#e74c3c';
    }
});

// Allow Enter key to submit
nameInput.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') {
        greetBtn.click();
    }
});

// Theme switcher
const lightThemeBtn = document.getElementById('lightThemeBtn');
const darkThemeBtn = document.getElementById('darkThemeBtn');

lightThemeBtn.addEventListener('click', () => {
    document.body.classList.remove('dark-theme');
    localStorage.setItem('theme', 'light');
});

darkThemeBtn.addEventListener('click', () => {
    document.body.classList.add('dark-theme');
    localStorage.setItem('theme', 'dark');
});

// Load saved theme on page load
window.addEventListener('DOMContentLoaded', () => {
    const savedTheme = localStorage.getItem('theme');
    if (savedTheme === 'dark') {
        document.body.classList.add('dark-theme');
    }
});

// Add smooth transition to counter
counterElement.style.transition = 'transform 0.2s ease';
greetingMessage.style.transition = 'opacity 0.3s ease';

// Muayene Listesi functionality
let hastalar = [];
let muayeneListesi = [];
let selectedIndex = -1;

const hastaAraInput = document.getElementById('hastaAraInput');
const oneriListesi = document.getElementById('oneriListesi');
const muayeneListesiDiv = document.getElementById('muayeneListesi');
const listeTemizleBtn = document.getElementById('listeTemizleBtn');
const listeYazBtn = document.getElementById('listeYazBtn');
const gruplanmisListe = document.getElementById('gruplanmisListe');

// Load patient data from hastalar.json
fetch('hastalar.json')
    .then(response => response.json())
    .then(data => {
        hastalar = data;
    })
    .catch(err => {
        console.error('Hasta verileri yüklenemedi:', err);
    });

function turkishLowerCase(str) {
    return str.toLocaleLowerCase('tr');
}

function escapeHtml(str) {
    return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

hastaAraInput.addEventListener('input', () => {
    const query = turkishLowerCase(hastaAraInput.value.trim());
    selectedIndex = -1;
    gruplanmisListe.innerHTML = '';

    if (query.length < 2) {
        oneriListesi.classList.remove('active');
        oneriListesi.innerHTML = '';
        return;
    }

    const results = hastalar.filter(h =>
        turkishLowerCase(h.adiSoyadi).includes(query)
    ).slice(0, 20);

    if (results.length === 0) {
        oneriListesi.classList.remove('active');
        oneriListesi.innerHTML = '';
        return;
    }

    oneriListesi.innerHTML = results.map((h, i) =>
        `<div class="oneri-item" data-index="${i}">
            <strong>${escapeHtml(h.adiSoyadi)}</strong>
            <div class="oneri-detay">${escapeHtml(h.kogus)} | TC: ${escapeHtml(h.tc)} | Baba: ${escapeHtml(h.babaAdi)}</div>
        </div>`
    ).join('');
    oneriListesi.classList.add('active');

    oneriListesi.querySelectorAll('.oneri-item').forEach(item => {
        item.addEventListener('click', () => {
            const idx = parseInt(item.dataset.index);
            hastaEkle(results[idx]);
        });
    });
});

hastaAraInput.addEventListener('keydown', (e) => {
    const items = oneriListesi.querySelectorAll('.oneri-item');
    if (!items.length) return;

    if (e.key === 'ArrowDown') {
        e.preventDefault();
        selectedIndex = Math.min(selectedIndex + 1, items.length - 1);
        updateSelection(items);
    } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        selectedIndex = Math.max(selectedIndex - 1, 0);
        updateSelection(items);
    } else if (e.key === 'Enter') {
        e.preventDefault();
        if (selectedIndex >= 0 && selectedIndex < items.length) {
            items[selectedIndex].click();
        }
    } else if (e.key === 'Escape') {
        oneriListesi.classList.remove('active');
        oneriListesi.innerHTML = '';
        selectedIndex = -1;
    }
});

function updateSelection(items) {
    items.forEach((item, i) => {
        item.classList.toggle('selected', i === selectedIndex);
    });
    if (selectedIndex >= 0) {
        items[selectedIndex].scrollIntoView({ block: 'nearest' });
    }
}

function hastaEkle(hasta) {
    if (muayeneListesi.some(h => h.tc === hasta.tc)) {
        hastaAraInput.value = '';
        oneriListesi.classList.remove('active');
        oneriListesi.innerHTML = '';
        hastaAraInput.placeholder = 'Bu hasta zaten listede!';
        setTimeout(() => { hastaAraInput.placeholder = 'Hasta adı yazın...'; }, 2000);
        return;
    }
    muayeneListesi.push(hasta);
    hastaAraInput.value = '';
    oneriListesi.classList.remove('active');
    oneriListesi.innerHTML = '';
    selectedIndex = -1;
    renderMuayeneListesi();
}

function renderMuayeneListesi() {
    if (muayeneListesi.length === 0) {
        muayeneListesiDiv.innerHTML = '<p class="empty-message">Henüz listeye hasta eklenmedi.</p>';
        return;
    }
    let html = `<table>
        <thead><tr>
            <th>#</th><th>Adı Soyadı</th><th>TC Kimlik</th><th>Baba Adı</th><th>Doğum Yeri</th><th>Koğuş</th><th></th>
        </tr></thead><tbody>`;
    muayeneListesi.forEach((h, i) => {
        html += `<tr>
            <td>${i + 1}</td>
            <td>${escapeHtml(h.adiSoyadi)}</td>
            <td>${escapeHtml(h.tc)}</td>
            <td>${escapeHtml(h.babaAdi)}</td>
            <td>${escapeHtml(h.dogumYeriTarihi)}</td>
            <td>${escapeHtml(h.kogus)}</td>
            <td><button class="sil-btn" data-tc="${escapeHtml(h.tc)}">Sil</button></td>
        </tr>`;
    });
    html += '</tbody></table>';
    muayeneListesiDiv.innerHTML = html;

    muayeneListesiDiv.querySelectorAll('.sil-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            muayeneListesi = muayeneListesi.filter(h => h.tc !== btn.dataset.tc);
            renderMuayeneListesi();
            gruplanmisListe.innerHTML = '';
        });
    });
}

listeTemizleBtn.addEventListener('click', () => {
    muayeneListesi = [];
    renderMuayeneListesi();
    gruplanmisListe.innerHTML = '';
});

listeYazBtn.addEventListener('click', () => {
    if (muayeneListesi.length === 0) return;

    const grouped = {};
    muayeneListesi.forEach(h => {
        if (!grouped[h.kogus]) grouped[h.kogus] = [];
        grouped[h.kogus].push(h);
    });

    const sortedWards = Object.keys(grouped).sort((a, b) => a.localeCompare(b, 'tr'));

    let html = '';
    let siraNo = 1;
    sortedWards.forEach(ward => {
        html += `<div class="kogus-group">
            <div class="kogus-baslik">${escapeHtml(ward)}</div>
            <table>
                <thead><tr>
                    <th>#</th><th>Adı Soyadı</th><th>TC Kimlik</th><th>Baba Adı</th><th>Doğum Yeri</th>
                </tr></thead><tbody>`;
        grouped[ward].forEach(h => {
            html += `<tr>
                <td>${siraNo++}</td>
                <td>${escapeHtml(h.adiSoyadi)}</td>
                <td>${escapeHtml(h.tc)}</td>
                <td>${escapeHtml(h.babaAdi)}</td>
                <td>${escapeHtml(h.dogumYeriTarihi)}</td>
            </tr>`;
        });
        html += '</tbody></table></div>';
    });
    gruplanmisListe.innerHTML = html;
});

document.addEventListener('click', (e) => {
    if (!e.target.closest('.search-wrapper')) {
        oneriListesi.classList.remove('active');
        oneriListesi.innerHTML = '';
        selectedIndex = -1;
    }
});
