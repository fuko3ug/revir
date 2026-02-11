// Theme toggle
const themeToggleBtn = document.getElementById('themeToggleBtn');

function updateThemeIcon() {
    themeToggleBtn.textContent = document.body.classList.contains('dark-theme') ? '☀️' : '🌙';
}

themeToggleBtn.addEventListener('click', () => {
    document.body.classList.toggle('dark-theme');
    localStorage.setItem('theme', document.body.classList.contains('dark-theme') ? 'dark' : 'light');
    updateThemeIcon();
});

// Load saved theme on page load
window.addEventListener('DOMContentLoaded', () => {
    const savedTheme = localStorage.getItem('theme');
    if (savedTheme === 'dark') {
        document.body.classList.add('dark-theme');
    }
    updateThemeIcon();
});

// Tab navigation
const tabButtons = document.querySelectorAll('.tab-btn');
tabButtons.forEach(btn => {
    btn.addEventListener('click', () => {
        tabButtons.forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        document.querySelectorAll('.tab-content').forEach(tc => tc.style.display = 'none');
        document.getElementById(btn.dataset.tab + 'Tab').style.display = 'block';
    });
});

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
const listeKaydetBtn = document.getElementById('listeKaydetBtn');
const listeYazdirBtn = document.getElementById('listeYazdirBtn');
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
const loadLocalXmlBtn = document.getElementById('loadLocalXmlBtn');
const loadLocalJsonBtn = document.getElementById('loadLocalJsonBtn');

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

function parseJsonText(jsonText) {
    hastalar = [];
    const data = JSON.parse(jsonText);
    if (!Array.isArray(data)) {
        throw new Error('JSON dosyası bir dizi içermelidir');
    }
    // Validate that each object has the required fields
    const validData = data.filter(item => 
        item && typeof item === 'object' && 
        item.tc && item.adiSoyadi && item.kogus
    );
    if (validData.length === 0) {
        throw new Error('JSON dosyasında geçerli hasta verisi bulunamadı');
    }
    hastalar = validData;
}

function handleXmlFile(file) {
    if (!file) {
        uploadStatus.textContent = 'Lütfen geçerli bir dosya seçin!';
        uploadStatus.className = 'upload-status error';
        return;
    }
    
    const fileName = file.name.toLowerCase();
    const isXml = fileName.endsWith('.xml');
    const isJson = fileName.endsWith('.json');
    
    if (!isXml && !isJson) {
        uploadStatus.textContent = 'Lütfen geçerli bir XML veya JSON dosyası seçin!';
        uploadStatus.className = 'upload-status error';
        return;
    }
    
    const reader = new FileReader();
    reader.onload = function(e) {
        try {
            if (isXml) {
                parseXmlText(e.target.result);
            } else {
                parseJsonText(e.target.result);
            }
            uploadStatus.textContent = `"${escapeHtml(file.name)}" yüklendi – ${hastalar.length} hasta bulundu.`;
            uploadStatus.className = 'upload-status success';
            uploadArea.classList.add('uploaded');
        } catch (err) {
            uploadStatus.textContent = 'Dosya okunamadı: ' + err.message;
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

// Load local files
loadLocalXmlBtn.addEventListener('click', async () => {
    try {
        const response = await fetch('tasnif.xml');
        if (!response.ok) {
            throw new Error('Dosya bulunamadı. Lütfen tasnif.xml dosyasının aynı klasörde olduğundan emin olun.');
        }
        const xmlText = await response.text();
        parseXmlText(xmlText);
        uploadStatus.textContent = `tasnif.xml yüklendi – ${hastalar.length} hasta bulundu.`;
        uploadStatus.className = 'upload-status success';
        uploadArea.classList.add('uploaded');
    } catch (err) {
        uploadStatus.textContent = 'Hata: ' + err.message;
        uploadStatus.className = 'upload-status error';
    }
});

loadLocalJsonBtn.addEventListener('click', async () => {
    try {
        const response = await fetch('hastalar.json');
        if (!response.ok) {
            throw new Error('Dosya bulunamadı. Lütfen hastalar.json dosyasının aynı klasörde olduğundan emin olun.');
        }
        const jsonText = await response.text();
        parseJsonText(jsonText);
        uploadStatus.textContent = `hastalar.json yüklendi – ${hastalar.length} hasta bulundu.`;
        uploadStatus.className = 'upload-status success';
        uploadArea.classList.add('uploaded');
    } catch (err) {
        uploadStatus.textContent = 'Hata: ' + err.message;
        uploadStatus.className = 'upload-status error';
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
    listeKaydetBtn.style.display = 'none';
    listeYazdirBtn.style.display = 'none';
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
    
    // Show save and print buttons
    listeKaydetBtn.style.display = 'inline-block';
    listeYazdirBtn.style.display = 'inline-block';
});

// Save examination list
listeKaydetBtn.addEventListener('click', () => {
    if (muayeneListesi.length === 0) return;
    
    const bugun = new Date();
    const tarih = bugun.toLocaleDateString('tr-TR');
    const saat = bugun.toLocaleTimeString('tr-TR');
    
    // Create CSV content
    let csvContent = '\uFEFF'; // UTF-8 BOM for Excel
    csvContent += `Revir Muayene Listesi - ${tarih} ${saat}\n\n`;
    
    const grouped = {};
    muayeneListesi.forEach(h => {
        if (!grouped[h.kogus]) grouped[h.kogus] = [];
        grouped[h.kogus].push(h);
    });
    
    const sortedWards = Object.keys(grouped).sort((a, b) => a.localeCompare(b, 'tr'));
    let siraNo = 1;
    
    sortedWards.forEach(ward => {
        csvContent += `\n${ward}\n`;
        csvContent += '#,Adı Soyadı,TC Kimlik,Baba Adı,Doğum Yeri\n';
        grouped[ward].forEach(h => {
            // Escape CSV fields by replacing " with "" and wrapping in quotes
            const escapeCsv = (str) => `"${String(str || '').replace(/"/g, '""')}"`;
            csvContent += `${siraNo++},${escapeCsv(h.adiSoyadi)},${escapeCsv(h.tc)},${escapeCsv(h.babaAdi)},${escapeCsv(h.dogumYeriTarihi)}\n`;
        });
    });
    
    // Create download link
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `muayene-listesi-${bugun.toISOString().split('T')[0]}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
});

// Print examination list
listeYazdirBtn.addEventListener('click', () => {
    if (muayeneListesi.length === 0) return;
    
    // Set print date
    const bugun = new Date();
    const tarih = bugun.toLocaleDateString('tr-TR', { 
        weekday: 'long', 
        year: 'numeric', 
        month: 'long', 
        day: 'numeric' 
    });
    const saat = bugun.toLocaleTimeString('tr-TR');
    document.getElementById('printDate').textContent = `${tarih} - ${saat}`;
    
    // Trigger print
    window.print();
});

document.addEventListener('click', (e) => {
    if (!e.target.closest('.search-wrapper')) {
        oneriListesi.classList.remove('active');
        oneriListesi.innerHTML = '';
        selectedIndex = -1;
    }
});

// ==================== Takvim (Calendar) ====================
const ayIsimleri = ['Ocak', 'Şubat', 'Mart', 'Nisan', 'Mayıs', 'Haziran',
    'Temmuz', 'Ağustos', 'Eylül', 'Ekim', 'Kasım', 'Aralık'];
const gunIsimleri = ['Pzt', 'Sal', 'Çar', 'Per', 'Cum', 'Cmt', 'Paz'];

let takvimYil = new Date().getFullYear();
let takvimAy = new Date().getMonth();
let seciliGun = null;

const takvimBaslik = document.getElementById('takvimBaslik');
const takvimGrid = document.getElementById('takvimGrid');
const oncekiAyBtn = document.getElementById('oncekiAyBtn');
const sonrakiAyBtn = document.getElementById('sonrakiAyBtn');
const gunDetaySection = document.getElementById('gunDetaySection');
const gunDetayBaslik = document.getElementById('gunDetayBaslik');
const gunMuayeneListesi = document.getElementById('gunMuayeneListesi');

function takvimKayitlariGetir() {
    try {
        return JSON.parse(localStorage.getItem('takvimKayitlari')) || {};
    } catch (e) {
        return {};
    }
}

function takvimKayitlariKaydet(kayitlar) {
    localStorage.setItem('takvimKayitlari', JSON.stringify(kayitlar));
}

function gunAnahtari(yil, ay, gun) {
    return `${yil}-${String(ay + 1).padStart(2, '0')}-${String(gun).padStart(2, '0')}`;
}

function getMuayeneKayitlariByDate(yil, ay, gun) {
    const muayeneKayitlari = muayeneKayitlariGetir();
    return muayeneKayitlari.filter(k => {
        const kayitTarih = new Date(k.tarih);
        return kayitTarih.getFullYear() === yil &&
               kayitTarih.getMonth() === ay &&
               kayitTarih.getDate() === gun;
    });
}

function takvimCiz() {
    takvimBaslik.textContent = `${ayIsimleri[takvimAy]} ${takvimYil}`;
    const muayeneKayitlari = muayeneKayitlariGetir();
    const bugun = new Date();

    // Pre-group records by date for O(1) lookup
    const kayitlarByDate = {};
    muayeneKayitlari.forEach(k => {
        const kayitTarih = new Date(k.tarih);
        if (kayitTarih.getFullYear() === takvimYil && kayitTarih.getMonth() === takvimAy) {
            const gun = kayitTarih.getDate();
            if (!kayitlarByDate[gun]) kayitlarByDate[gun] = [];
            kayitlarByDate[gun].push(k);
        }
    });

    let html = '';
    gunIsimleri.forEach(g => {
        html += `<div class="takvim-gun-baslik">${g}</div>`;
    });

    const ilkGun = new Date(takvimYil, takvimAy, 1);
    let baslangicGunu = ilkGun.getDay();
    // Convert Sunday=0 to Monday-start: Mon=0,...,Sun=6
    baslangicGunu = (baslangicGunu + 6) % 7;

    const aydakiGunSayisi = new Date(takvimYil, takvimAy + 1, 0).getDate();

    for (let i = 0; i < baslangicGunu; i++) {
        html += '<div class="takvim-gun bos"></div>';
    }

    for (let gun = 1; gun <= aydakiGunSayisi; gun++) {
        const gunKayitlari = kayitlarByDate[gun] || [];
        const bugunMu = bugun.getFullYear() === takvimYil && bugun.getMonth() === takvimAy && bugun.getDate() === gun;
        const seciliMi = seciliGun === gun;

        let classes = 'takvim-gun';
        if (bugunMu) classes += ' bugun';
        if (seciliMi) classes += ' secili';

        let badge = '';
        if (gunKayitlari.length > 0) {
            badge = `<span class="gun-badge">${gunKayitlari.length}</span>`;
        }

        html += `<div class="${classes}" data-gun="${gun}">${gun}${badge}</div>`;
    }

    takvimGrid.innerHTML = html;

    takvimGrid.querySelectorAll('.takvim-gun:not(.bos)').forEach(el => {
        el.addEventListener('click', () => {
            seciliGun = parseInt(el.dataset.gun);
            takvimCiz();
            gunDetayGoster();
        });
    });
}

function gunDetayGoster() {
    if (seciliGun === null) {
        gunDetaySection.style.display = 'none';
        return;
    }
    gunDetaySection.style.display = 'block';
    gunDetayBaslik.textContent = `${seciliGun} ${ayIsimleri[takvimAy]} ${takvimYil} - Muayene Listesi`;

    const gunKayitlari = getMuayeneKayitlariByDate(takvimYil, takvimAy, seciliGun);

    if (gunKayitlari.length === 0) {
        gunMuayeneListesi.innerHTML = '<p class="empty-message">Bu gün için kayıt yok.</p>';
        return;
    }

    let html = `<table>
        <thead><tr>
            <th>#</th><th>Adı Soyadı</th><th>TC Kimlik</th><th>Koğuş</th>
        </tr></thead><tbody>`;
    gunKayitlari.forEach((h, i) => {
        html += `<tr>
            <td>${i + 1}</td>
            <td>${escapeHtml(h.adiSoyadi)}</td>
            <td>${escapeHtml(h.tc)}</td>
            <td>${escapeHtml(h.kogus)}</td>
        </tr>`;
    });
    html += '</tbody></table>';
    gunMuayeneListesi.innerHTML = html;
}

oncekiAyBtn.addEventListener('click', () => {
    takvimAy--;
    if (takvimAy < 0) { takvimAy = 11; takvimYil--; }
    seciliGun = null;
    gunDetaySection.style.display = 'none';
    takvimCiz();
});

sonrakiAyBtn.addEventListener('click', () => {
    takvimAy++;
    if (takvimAy > 11) { takvimAy = 0; takvimYil++; }
    seciliGun = null;
    gunDetaySection.style.display = 'none';
    takvimCiz();
});

// Initial calendar render
takvimCiz();
