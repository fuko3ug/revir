// Entry Screen
const entryScreen = document.getElementById('entryScreen');
const mainApp = document.getElementById('mainApp');
const enterAppBtn = document.getElementById('enterAppBtn');
const loadingStatus = document.getElementById('loadingStatus');

// Load both files function
async function loadBothFiles() {
    loadingStatus.textContent = 'Dosyalar yükleniyor...';
    loadingStatus.className = 'loading-status loading';
    
    try {
        // Load hastalar.json first
        const jsonResponse = await fetch('hastalar.json');
        if (!jsonResponse.ok) {
            throw new Error('hastalar.json bulunamadı');
        }
        const jsonText = await jsonResponse.text();
        parseJsonText(jsonText);
        
        // Load tasnif.xml
        const xmlResponse = await fetch('tasnif.xml');
        if (!xmlResponse.ok) {
            throw new Error('tasnif.xml bulunamadı');
        }
        const xmlText = await xmlResponse.text();
        parseXmlText(xmlText);
        
        loadingStatus.textContent = `✓ Dosyalar başarıyla yüklendi (${hastalar.length} hasta)`;
        loadingStatus.className = 'loading-status success';
        
        // Show main app after a brief delay
        setTimeout(() => {
            entryScreen.style.display = 'none';
            mainApp.style.display = 'block';
            // Load today's examination list after app is displayed
            loadTodaysExaminationList();
        }, 800);
        
        return true;
    } catch (err) {
        loadingStatus.textContent = '✗ Hata: ' + err.message;
        loadingStatus.className = 'loading-status error';
        return false;
    }
}

// Enter app button handler
enterAppBtn.addEventListener('click', async () => {
    enterAppBtn.disabled = true;
    const success = await loadBothFiles();
    // Only re-enable button if loading failed to allow retry
    if (!success) {
        enterAppBtn.disabled = false;
    }
});

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
        
        // Load today's examination list when switching to Muayene tab
        if (btn.dataset.tab === 'muayene') {
            loadTodaysExaminationList();
        }
    });
});

// Muayene Listesi functionality
let hastalar = [];
let muayeneListesi = [];
let selectedIndex = -1;
let bekleyenHasta = null; // Hasta waiting for modal confirmation

// Collapsible section for Muayene Listesi Oluştur
const muayeneOlusturHeader = document.getElementById('muayeneOlusturHeader');
const muayeneOlusturContainer = document.getElementById('muayeneOlusturContainer');

if (muayeneOlusturHeader && muayeneOlusturContainer) {
    muayeneOlusturHeader.addEventListener('click', () => {
        muayeneOlusturHeader.classList.toggle('collapsed');
        muayeneOlusturContainer.classList.toggle('collapsed');
    });
}

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
    ikiHaftaOnce.setDate(ikiHaftaOnce.getDate() - 12);

    return kayitlar.find(k =>
        k.tc === tc && new Date(k.tarih) >= ikiHaftaOnce
    );
}

function muayeneListesiKaydet() {
    const kayitlar = muayeneKayitlariGetir();
    const bugun = new Date();
    const ikiHaftaOnce = new Date();
    ikiHaftaOnce.setDate(ikiHaftaOnce.getDate() - 12);

    // Eski kayıtları temizle (12 günden eski)
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

function loadTodaysExaminationList() {
    // Get today's date
    const bugun = new Date();
    const yil = bugun.getFullYear();
    const ay = bugun.getMonth();
    const gun = bugun.getDate();
    
    // Get today's examination records
    const todaysRecords = getMuayeneKayitlariByDate(yil, ay, gun);
    
    if (todaysRecords.length === 0) {
        // No records for today, keep the list empty
        muayeneListesi = [];
        renderMuayeneListesi();
        gruplanmisListe.innerHTML = '';
        listeKaydetBtn.style.display = 'none';
        listeYazdirBtn.style.display = 'none';
        return;
    }
    
    // Populate muayeneListesi with today's patients
    muayeneListesi = [];
    todaysRecords.forEach(record => {
        // Try to find full patient data from hastalar
        const fullPatient = hastalar.find(h => h.tc === record.tc);
        if (fullPatient) {
            muayeneListesi.push(fullPatient);
        } else {
            // Use record data if full patient not found
            muayeneListesi.push({
                tc: record.tc,
                adiSoyadi: record.adiSoyadi,
                kogus: record.kogus,
                babaAdi: '',
                dogumYeriTarihi: ''
            });
        }
    });
    
    // Render the list
    renderMuayeneListesi();
    
    // Auto-generate grouped list
    if (muayeneListesi.length > 0) {
        // Make list unique by TC number
        const uniqueByTC = {};
        muayeneListesi.forEach(h => {
            if (!uniqueByTC[h.tc]) {
                uniqueByTC[h.tc] = h;
            }
        });
        const uniqueList = Object.values(uniqueByTC);

        const grouped = {};
        uniqueList.forEach(h => {
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
    }
}

// Modal yönetimi
function modalGoster(hasta, mevcutKayit) {
    bekleyenHasta = hasta;
    const kayitTarih = new Date(mevcutKayit.tarih).toLocaleDateString('tr-TR');
    uyariMesaj.textContent = `${hasta.adiSoyadi} isimli hasta ${kayitTarih} tarihinde muayene olmuş. Son 12 gün içinde muayene hakkı kullanılmış.`;
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

// Load both local files button
const loadBothFilesBtn = document.getElementById('loadBothFilesBtn');

loadBothFilesBtn.addEventListener('click', async () => {
    uploadStatus.textContent = 'Dosyalar yükleniyor...';
    uploadStatus.className = 'upload-status';
    
    try {
        // Load hastalar.json
        const jsonResponse = await fetch('hastalar.json');
        if (!jsonResponse.ok) {
            throw new Error('hastalar.json bulunamadı');
        }
        const jsonText = await jsonResponse.text();
        parseJsonText(jsonText);
        
        // Load tasnif.xml
        const xmlResponse = await fetch('tasnif.xml');
        if (!xmlResponse.ok) {
            throw new Error('tasnif.xml bulunamadı');
        }
        const xmlText = await xmlResponse.text();
        parseXmlText(xmlText);
        
        uploadStatus.textContent = `Her iki dosya yüklendi – ${hastalar.length} hasta bulundu.`;
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

// Cached examination frequency counts
let _muayeneSayilariCache = null;
let _muayeneSayilariCacheKey = null;

function getMuayeneSayilari() {
    const kayitlar = muayeneKayitlariGetir();
    const cacheKey = JSON.stringify(kayitlar);
    if (_muayeneSayilariCacheKey === cacheKey) return _muayeneSayilariCache;
    const sayilar = {};
    kayitlar.forEach(k => {
        sayilar[k.tc] = (sayilar[k.tc] || 0) + 1;
    });
    _muayeneSayilariCache = sayilar;
    _muayeneSayilariCacheKey = cacheKey;
    return sayilar;
}

function siralaVeFiltrele(query, limit) {
    const filtered = hastalar.filter(h =>
        turkishLowerCase(h.adiSoyadi).includes(query)
    );
    const muayeneSayilari = getMuayeneSayilari();
    filtered.sort((a, b) => (muayeneSayilari[b.tc] || 0) - (muayeneSayilari[a.tc] || 0));
    return { results: filtered.slice(0, limit), muayeneSayilari };
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

    const { results, muayeneSayilari } = siralaVeFiltrele(query, 20);

    if (results.length === 0) {
        oneriListesi.classList.remove('active');
        oneriListesi.innerHTML = '';
        return;
    }

    oneriListesi.innerHTML = results.map((h, i) => {
        const sayi = muayeneSayilari[h.tc] || 0;
        const badge = sayi > 0 ? ` <span class="oneri-badge">${sayi}</span>` : '';
        return `<div class="oneri-item" data-index="${i}">
            <strong>${escapeHtml(h.adiSoyadi)}</strong>${badge}
            <div class="oneri-detay">${escapeHtml(h.kogus)} | TC: ${escapeHtml(h.tc)} | Baba: ${escapeHtml(h.babaAdi)}</div>
        </div>`;
    }).join('');
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

    // 12 günlük muayene kontrolü
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
    // Split into two columns
    const mid = Math.ceil(muayeneListesi.length / 2);
    const col1 = muayeneListesi.slice(0, mid);
    const col2 = muayeneListesi.slice(mid);

    function buildColumn(list, startIndex) {
        let h = `<table>
            <thead><tr>
                <th>#</th><th>Adı Soyadı</th><th>Koğuş</th><th></th>
            </tr></thead><tbody>`;
        list.forEach((p, i) => {
            h += `<tr>
                <td>${startIndex + i + 1}</td>
                <td>${escapeHtml(p.adiSoyadi)}</td>
                <td>${escapeHtml(p.kogus)}</td>
                <td><button class="sil-btn" data-tc="${escapeHtml(p.tc)}">Sil</button></td>
            </tr>`;
        });
        h += '</tbody></table>';
        return h;
    }

    let html = '<div class="muayene-listesi-grid">';
    html += '<div class="muayene-listesi-col">' + buildColumn(col1, 0) + '</div>';
    if (col2.length > 0) {
        html += '<div class="muayene-listesi-col">' + buildColumn(col2, mid) + '</div>';
    }
    html += '</div>';
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

    // Make list unique by TC number
    const uniqueByTC = {};
    muayeneListesi.forEach(h => {
        if (!uniqueByTC[h.tc]) {
            uniqueByTC[h.tc] = h;
        }
    });
    const uniqueList = Object.values(uniqueByTC);

    const grouped = {};
    uniqueList.forEach(h => {
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
    
    // Make list unique by TC number
    const uniqueByTC = {};
    muayeneListesi.forEach(h => {
        if (!uniqueByTC[h.tc]) {
            uniqueByTC[h.tc] = h;
        }
    });
    const uniqueList = Object.values(uniqueByTC);
    
    const grouped = {};
    uniqueList.forEach(h => {
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

    // Sort by ward (koğuş) using Turkish locale
    gunKayitlari.sort((a, b) => {
        return (a.kogus || '').localeCompare(b.kogus || '', 'tr');
    });

    let html = `
        <div class="gun-liste-actions">
            <button id="gunListeYazdirBtn" class="btn btn-secondary">Yazdır</button>
            <button id="gunListeTemizleBtn" class="btn btn-danger">Günün Listesini Sil</button>
        </div>
        <table id="gunMuayeneTable">
        <thead><tr>
            <th>#</th><th>Adı Soyadı</th><th>TC Kimlik</th><th>Koğuş</th><th class="no-print"></th>
        </tr></thead><tbody>`;
    gunKayitlari.forEach((h, i) => {
        html += `<tr>
            <td>${i + 1}</td>
            <td>${escapeHtml(h.adiSoyadi)}</td>
            <td>${escapeHtml(h.tc)}</td>
            <td>${escapeHtml(h.kogus)}</td>
            <td class="no-print"><button class="gun-hasta-sil-btn" data-tc="${escapeHtml(h.tc)}">Sil</button></td>
        </tr>`;
    });
    html += '</tbody></table>';
    gunMuayeneListesi.innerHTML = html;
    
    // Add event listener for print button
    const gunListeYazdirBtn = document.getElementById('gunListeYazdirBtn');
    if (gunListeYazdirBtn) {
        gunListeYazdirBtn.addEventListener('click', () => {
            printCalendarDay();
        });
    }
    
    // Add event listener for clear all button
    const gunListeTemizleBtn = document.getElementById('gunListeTemizleBtn');
    if (gunListeTemizleBtn) {
        gunListeTemizleBtn.addEventListener('click', () => {
            if (confirm(`${seciliGun} ${ayIsimleri[takvimAy]} ${takvimYil} tarihindeki tüm kayıtları silmek istediğinizden emin misiniz?`)) {
                gunListesiTemizle();
            }
        });
    }
    
    // Add event listeners for individual delete buttons
    gunMuayeneListesi.querySelectorAll('.gun-hasta-sil-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            const tc = btn.dataset.tc;
            gundenHastaSil(tc);
        });
    });
}

function printCalendarDay() {
    // Store current print date info for calendar print
    const printInfo = {
        date: `${seciliGun} ${ayIsimleri[takvimAy]} ${takvimYil}`,
        time: new Date().toLocaleTimeString('tr-TR')
    };
    
    // Create a temporary print container
    const printContainer = document.createElement('div');
    printContainer.id = 'calendarPrintContainer';
    printContainer.innerHTML = `
        <div class="calendar-print-header">
            <h1>Revir Muayene Listesi</h1>
            <div class="calendar-print-date">${printInfo.date} - ${printInfo.time}</div>
        </div>
        ${gunMuayeneListesi.innerHTML}
    `;
    
    // Add to body
    document.body.appendChild(printContainer);
    
    // Trigger print
    window.print();
    
    // Remove temporary container after print
    setTimeout(() => {
        document.body.removeChild(printContainer);
    }, 100);
}

function gundenHastaSil(tc) {
    const kayitlar = muayeneKayitlariGetir();
    const yeniKayitlar = kayitlar.filter(k => {
        const kTarih = new Date(k.tarih);
        const ayniGun = kTarih.getFullYear() === takvimYil &&
                       kTarih.getMonth() === takvimAy &&
                       kTarih.getDate() === seciliGun;
        // Remove only if it's the same day and same TC
        return !(ayniGun && k.tc === tc);
    });
    
    muayeneKayitlariKaydet(yeniKayitlar);
    takvimCiz();
    gunDetayGoster();
}

function gunListesiTemizle() {
    const kayitlar = muayeneKayitlariGetir();
    const yeniKayitlar = kayitlar.filter(k => {
        const kTarih = new Date(k.tarih);
        // Keep only records that are NOT from the selected day
        return !(kTarih.getFullYear() === takvimYil &&
                 kTarih.getMonth() === takvimAy &&
                 kTarih.getDate() === seciliGun);
    });
    
    muayeneKayitlariKaydet(yeniKayitlar);
    takvimCiz();
    gunDetayGoster();
}

// Calendar patient search and add
const takvimHastaAraInput = document.getElementById('takvimHastaAraInput');
const takvimOneriListesi = document.getElementById('takvimOneriListesi');
const takvimManuelEkleBtn = document.getElementById('takvimManuelEkleBtn');
let takvimSelectedIndex = -1;

takvimHastaAraInput.addEventListener('input', () => {
    const query = turkishLowerCase(takvimHastaAraInput.value.trim());
    takvimSelectedIndex = -1;

    if (query.length < 2) {
        takvimOneriListesi.classList.remove('active');
        takvimOneriListesi.innerHTML = '';
        return;
    }

    const { results, muayeneSayilari } = siralaVeFiltrele(query, 20);

    if (results.length === 0) {
        takvimOneriListesi.classList.remove('active');
        takvimOneriListesi.innerHTML = '';
        return;
    }

    takvimOneriListesi.innerHTML = results.map((h, i) => {
        const sayi = muayeneSayilari[h.tc] || 0;
        const badge = sayi > 0 ? ` <span class="oneri-badge">${sayi}</span>` : '';
        return `<div class="oneri-item" data-index="${i}">
            <strong>${escapeHtml(h.adiSoyadi)}</strong>${badge}
            <div class="oneri-detay">${escapeHtml(h.kogus || 'Koğuş bilgisi yok')} | TC: ${escapeHtml(h.tc)}</div>
        </div>`;
    }).join('');
    takvimOneriListesi.classList.add('active');

    takvimOneriListesi.querySelectorAll('.oneri-item').forEach(item => {
        item.addEventListener('click', () => {
            const idx = parseInt(item.dataset.index);
            takvimHastaEkle(results[idx]);
        });
    });
});

takvimHastaAraInput.addEventListener('keydown', (e) => {
    const items = takvimOneriListesi.querySelectorAll('.oneri-item');
    if (!items.length) return;

    if (e.key === 'ArrowDown') {
        e.preventDefault();
        takvimSelectedIndex = Math.min(takvimSelectedIndex + 1, items.length - 1);
        updateTakvimSelection(items);
    } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        takvimSelectedIndex = Math.max(takvimSelectedIndex - 1, 0);
        updateTakvimSelection(items);
    } else if (e.key === 'Enter') {
        e.preventDefault();
        if (takvimSelectedIndex >= 0 && takvimSelectedIndex < items.length) {
            items[takvimSelectedIndex].click();
        }
    } else if (e.key === 'Escape') {
        takvimOneriListesi.classList.remove('active');
        takvimOneriListesi.innerHTML = '';
        takvimSelectedIndex = -1;
    }
});

function updateTakvimSelection(items) {
    items.forEach((item, i) => {
        item.classList.toggle('selected', i === takvimSelectedIndex);
    });
    if (takvimSelectedIndex >= 0) {
        items[takvimSelectedIndex].scrollIntoView({ block: 'nearest' });
    }
}

// Manual add button - add by name only
takvimManuelEkleBtn.addEventListener('click', () => {
    const isim = takvimHastaAraInput.value.trim();
    if (!isim || seciliGun === null) return;
    
    // Check if patient exists in database
    const existingPatient = hastalar.find(h => 
        turkishLowerCase(h.adiSoyadi) === turkishLowerCase(isim)
    );
    
    if (existingPatient) {
        takvimHastaEkle(existingPatient);
    } else {
        // Add as manual entry without full patient data
        // Use timestamp + random component for unique ID
        const randomSuffix = Math.floor(Math.random() * 1000);
        const manuelHasta = {
            tc: 'MANUEL-' + Date.now() + '-' + randomSuffix,
            adiSoyadi: isim,
            kogus: 'Manuel Giriş',
            babaAdi: '',
            dogumYeriTarihi: ''
        };
        takvimHastaEkle(manuelHasta);
    }
});

function takvimHastaEkle(hasta) {
    if (seciliGun === null) return;
    
    const kayitTarihi = new Date(takvimYil, takvimAy, seciliGun);
    const kayitlar = muayeneKayitlariGetir();
    
    // Check if patient already added to this day
    const mevcutKayit = kayitlar.find(k => {
        const kTarih = new Date(k.tarih);
        return k.tc === hasta.tc && 
               kTarih.getFullYear() === takvimYil &&
               kTarih.getMonth() === takvimAy &&
               kTarih.getDate() === seciliGun;
    });
    
    if (mevcutKayit) {
        alert('Bu hasta zaten bu güne eklenmiş!');
        return;
    }
    
    // Add to calendar
    kayitlar.push({
        tc: hasta.tc,
        adiSoyadi: hasta.adiSoyadi,
        kogus: hasta.kogus || 'Manuel Giriş',
        tarih: kayitTarihi.toISOString()
    });
    
    muayeneKayitlariKaydet(kayitlar);
    
    takvimHastaAraInput.value = '';
    takvimOneriListesi.classList.remove('active');
    takvimOneriListesi.innerHTML = '';
    takvimSelectedIndex = -1;
    
    takvimCiz();
    gunDetayGoster();
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

// Bulk import functionality
const bulkImportText = document.getElementById('bulkImportText');
const bulkImportBtn = document.getElementById('bulkImportBtn');
const bulkImportStatus = document.getElementById('bulkImportStatus');

bulkImportBtn.addEventListener('click', () => {
    const text = bulkImportText.value.trim();
    if (!text) {
        bulkImportStatus.textContent = 'Lütfen liste metnini yapıştırın!';
        bulkImportStatus.className = 'import-status error';
        return;
    }
    
    try {
        const results = parseBulkImportText(text);
        
        if (results.length === 0) {
            bulkImportStatus.textContent = 'Hiç hasta kaydı bulunamadı!';
            bulkImportStatus.className = 'import-status error';
            return;
        }
        
        const kayitlar = muayeneKayitlariGetir();
        let eklenenSayisi = 0;
        let atlanmaSayisi = 0;
        
        results.forEach(result => {
            // Check for duplicates based on TC and date
            const mevcutKayit = kayitlar.find(k => {
                const kTarih = new Date(k.tarih);
                const rTarih = new Date(result.tarih);
                return k.tc === result.tc && 
                       kTarih.getFullYear() === rTarih.getFullYear() &&
                       kTarih.getMonth() === rTarih.getMonth() &&
                       kTarih.getDate() === rTarih.getDate();
            });
            
            if (!mevcutKayit) {
                // Use data from parser which already has koğuş if found
                kayitlar.push({
                    tc: result.tc,
                    adiSoyadi: result.adiSoyadi,
                    kogus: result.kogus || 'İçe Aktarılan',
                    tarih: result.tarih
                });
                eklenenSayisi++;
            } else {
                atlanmaSayisi++;
            }
        });
        
        muayeneKayitlariKaydet(kayitlar);
        takvimCiz();
        
        bulkImportStatus.textContent = `✓ ${eklenenSayisi} hasta eklendi${atlanmaSayisi > 0 ? `, ${atlanmaSayisi} kayıt zaten mevcut (atlandı)` : ''}`;
        bulkImportStatus.className = 'import-status success';
        
        // Clear textarea after successful import
        bulkImportText.value = '';
        
    } catch (err) {
        bulkImportStatus.textContent = '✗ Hata: ' + err.message;
        bulkImportStatus.className = 'import-status error';
    }
});

function parseBulkImportText(text) {
    const results = [];
    const lines = text.split('\n');
    
    // MBYS format pattern explanation:
    // Group 1: TC number with asterisks (e.g., 10*******34)
    // Group 2: Full name (e.g., DOĞUKAN KUŞ or ALİCAN BENER DURUKAN)
    // Group 3: Date in DD/MM/YYYY format (e.g., 11/02/2026)
    // Example line: 10*******34	MBYS		DOĞUKAN KUŞ			11/02/2026 09:20:55	İşleme Alındı
    // The pattern captures: TC, skips MBYS and empty tabs, captures name, then captures date
    // Case-insensitive to handle both uppercase and mixed case names
    const linePattern = /^(\d{2}\*+\d{2})\s+MBYS\s+([A-Za-zÇĞİÖŞÜçğıöşü][A-Za-zÇĞİÖŞÜçğıöşü\s]*?)\s+(\d{2}\/\d{2}\/\d{4})/i;
    
    lines.forEach(line => {
        const match = line.match(linePattern);
        if (match) {
            const tcPartial = match[1];  // TC with asterisks (e.g., 18*******76)
            const adiSoyadi = match[2].trim();  // Full name
            const tarihStr = match[3];  // Date string
            
            // Parse date (DD/MM/YYYY format)
            const dateParts = tarihStr.split('/');
            if (dateParts.length === 3) {
                const day = parseInt(dateParts[0]);
                const month = parseInt(dateParts[1]) - 1; // JS months are 0-indexed
                const year = parseInt(dateParts[2]);
                const tarih = new Date(year, month, day);
                
                // Try to find patient by name and TC partial match
                let tc = tcPartial;
                let foundPatient = null;
                
                // Extract TC prefix and suffix from partial TC (e.g., 18*******76 -> prefix: 18, suffix: 76)
                const tcPrefix = tcPartial.substring(0, 2);
                const tcSuffix = tcPartial.substring(tcPartial.length - 2);
                
                // Find all patients with matching name
                const matchingByName = hastalar.filter(h => 
                    turkishLowerCase(h.adiSoyadi) === turkishLowerCase(adiSoyadi)
                );
                
                if (matchingByName.length === 1) {
                    // Single match by name - use it
                    foundPatient = matchingByName[0];
                } else if (matchingByName.length > 1) {
                    // Multiple matches - use TC partial to disambiguate
                    foundPatient = matchingByName.find(h => 
                        h.tc.startsWith(tcPrefix) && h.tc.endsWith(tcSuffix)
                    );
                }
                
                if (foundPatient) {
                    tc = foundPatient.tc;
                    results.push({
                        tc: tc,
                        adiSoyadi: foundPatient.adiSoyadi,
                        kogus: foundPatient.kogus,
                        babaAdi: foundPatient.babaAdi || '',
                        dogumYeriTarihi: foundPatient.dogumYeriTarihi || '',
                        tarih: tarih.toISOString()
                    });
                } else {
                    // Not found in database - add with partial info
                    results.push({
                        tc: tcPartial,
                        adiSoyadi: adiSoyadi,
                        kogus: 'İçe Aktarılan',
                        tarih: tarih.toISOString()
                    });
                }
            }
        }
    });
    
    return results;
}
