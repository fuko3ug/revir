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
let bekleyenHasta = null; // Hasta waiting for modal confirmation

const hastaAraInput = document.getElementById('hastaAraInput');
const oneriListesi = document.getElementById('oneriListesi');
const muayeneListesiDiv = document.getElementById('muayeneListesi');
const listeTemizleBtn = document.getElementById('listeTemizleBtn');
const listeYazBtn = document.getElementById('listeYazBtn');
const gruplanmisListe = document.getElementById('gruplanmisListe');

// Modal elements
const uyariModal = document.getElementById('uyariModal');
const uyariMesaj = document.getElementById('uyariMesaj');
const yineDeEkleBtn = document.getElementById('yineDeEkleBtn');
const eklemeBtn = document.getElementById('eklemeBtn');

// Muayene kayıt yönetimi (localStorage)
function muayeneKayitlariGetir() {
    try {
        return JSON.parse(localStorage.getItem('muayeneKayitlari')) || [];
    } catch (e) {
        return [];
    }
}

function muayeneKayitlariKaydet(kayitlar) {
    localStorage.setItem('muayeneKayitlari', JSON.stringify(kayitlar));
}

function sonIkiHaftaKontrol(tc) {
    const kayitlar = muayeneKayitlariGetir();
    const ikiHaftaOnce = new Date();
    ikiHaftaOnce.setDate(ikiHaftaOnce.getDate() - 14);

    return kayitlar.find(k =>
        k.tc === tc && new Date(k.tarih) >= ikiHaftaOnce
    );
}

function muayeneListesiKaydet() {
    const kayitlar = muayeneKayitlariGetir();
    const bugun = new Date();
    const ikiHaftaOnce = new Date();
    ikiHaftaOnce.setDate(ikiHaftaOnce.getDate() - 14);

    // Eski kayıtları temizle (14 günden eski)
    const guncelKayitlar = kayitlar.filter(k => new Date(k.tarih) >= ikiHaftaOnce);

    const bugunISO = bugun.toISOString();
    muayeneListesi.forEach(h => {
        guncelKayitlar.push({
            tc: h.tc,
            adiSoyadi: h.adiSoyadi,
            kogus: h.kogus,
            tarih: bugunISO
        });
    });
    muayeneKayitlariKaydet(guncelKayitlar);
}

// Modal yönetimi
function modalGoster(hasta, mevcutKayit) {
    bekleyenHasta = hasta;
    const kayitTarih = new Date(mevcutKayit.tarih).toLocaleDateString('tr-TR');
    uyariMesaj.textContent = `${hasta.adiSoyadi} isimli hasta ${kayitTarih} tarihinde muayene olmuş. Son 2 hafta içinde muayene hakkı kullanılmış.`;
    uyariModal.classList.add('active');
}

function modalKapat() {
    uyariModal.classList.remove('active');
    bekleyenHasta = null;
}

yineDeEkleBtn.addEventListener('click', () => {
    if (bekleyenHasta) {
        muayeneListesi.push(bekleyenHasta);
        renderMuayeneListesi();
    }
    modalKapat();
    hastaAraInput.focus();
});

eklemeBtn.addEventListener('click', () => {
    modalKapat();
    hastaAraInput.focus();
});

uyariModal.addEventListener('click', (e) => {
    if (e.target === uyariModal) {
        modalKapat();
        hastaAraInput.focus();
    }
});

// XML file upload functionality
const xmlFileInput = document.getElementById('xmlFileInput');
const uploadArea = document.getElementById('uploadArea');
const uploadStatus = document.getElementById('uploadStatus');

function parseXmlText(xmlText) {
    hastalar = [];
    const parser = new DOMParser();
    const xmlDoc = parser.parseFromString(xmlText, 'text/xml');
    if (xmlDoc.getElementsByTagName('parsererror').length > 0) {
        throw new Error('XML parse hatası');
    }
    const ns = 'http://jasperreports.sourceforge.net/jasperreports/print';

    const srcIdFieldMap = {
        '23': 'adiSoyadi',
        '27': 'babaAdi',
        '29': 'anaAdi',
        '25': 'dogumYeriTarihi',
        '31': 'kogus',
        '32': 'tc',
        '30': 'siraNo',
        '26': 'dosyaNo',
        '24': 'durumu',
        '28': 'cinsiyet',
        '22': 'sucu'
    };

    const allReportElements = xmlDoc.getElementsByTagNameNS(ns, 'reportElement');
    const patientFrames = [];
    for (let i = 0; i < allReportElements.length; i++) {
        const re = allReportElements[i];
        if (re.getAttribute('srcId') === '21') {
            patientFrames.push(re.parentElement);
        }
    }

    const seenTc = new Set();
    patientFrames.forEach(frame => {
        const textElements = frame.getElementsByTagNameNS(ns, 'text');
        const patient = {};
        for (let j = 0; j < textElements.length; j++) {
            const textEl = textElements[j];
            const innerRe = textEl.getElementsByTagNameNS(ns, 'reportElement')[0];
            if (innerRe) {
                const fieldName = srcIdFieldMap[innerRe.getAttribute('srcId')];
                if (fieldName) {
                    const textContentEl = textEl.getElementsByTagNameNS(ns, 'textContent')[0];
                    if (textContentEl) {
                        patient[fieldName] = textContentEl.textContent;
                    }
                }
            }
        }
        if (patient.tc && !seenTc.has(patient.tc)) {
            seenTc.add(patient.tc);
            hastalar.push(patient);
        }
    });
}

function handleXmlFile(file) {
    if (!file || !file.name.toLowerCase().endsWith('.xml')) {
        uploadStatus.textContent = 'Lütfen geçerli bir XML dosyası seçin!';
        uploadStatus.className = 'upload-status error';
        return;
    }
    const reader = new FileReader();
    reader.onload = function(e) {
        try {
            parseXmlText(e.target.result);
            uploadStatus.textContent = `"${escapeHtml(file.name)}" yüklendi – ${hastalar.length} hasta bulundu.`;
            uploadStatus.className = 'upload-status success';
            uploadArea.classList.add('uploaded');
        } catch (err) {
            uploadStatus.textContent = 'XML dosyası okunamadı: ' + err.message;
            uploadStatus.className = 'upload-status error';
        }
    };
    reader.readAsText(file);
}

xmlFileInput.addEventListener('change', (e) => {
    if (e.target.files.length > 0) {
        handleXmlFile(e.target.files[0]);
    }
});

uploadArea.addEventListener('dragover', (e) => {
    e.preventDefault();
    uploadArea.classList.add('dragover');
});

uploadArea.addEventListener('dragleave', () => {
    uploadArea.classList.remove('dragover');
});

uploadArea.addEventListener('drop', (e) => {
    e.preventDefault();
    uploadArea.classList.remove('dragover');
    if (e.dataTransfer.files.length > 0) {
        handleXmlFile(e.dataTransfer.files[0]);
    }
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

    hastaAraInput.value = '';
    oneriListesi.classList.remove('active');
    oneriListesi.innerHTML = '';
    selectedIndex = -1;

    // 2 haftalık muayene kontrolü
    const mevcutKayit = sonIkiHaftaKontrol(hasta.tc);
    if (mevcutKayit) {
        modalGoster(hasta, mevcutKayit);
        return;
    }

    muayeneListesi.push(hasta);
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

    // Muayene listesini kaydet
    muayeneListesiKaydet();

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
