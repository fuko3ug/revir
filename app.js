// Blok ve Koğuş Yapılandırması
const BLOCKS = {
    'A': { cells: 14, day: 'Perşembe' },
    'B': { cells: 14, day: 'Çarşamba' },
    'C': { cells: 11, day: 'Cuma' },
    'D': { cells: 14, day: 'Pazartesi' },
    'E': { cells: 14, day: 'Salı' }
};

// 2 haftalık süre (milisaniye cinsinden)
const TWO_WEEKS_MS = 14 * 24 * 60 * 60 * 1000;

// LocalStorage'dan verileri yükle
let examinations = JSON.parse(localStorage.getItem('examinations')) || [];

// Sayfa yüklendiğinde
document.addEventListener('DOMContentLoaded', function() {
    initializeApp();
});

function initializeApp() {
    // Blok seçiminde koğuşları güncelle
    document.getElementById('block').addEventListener('change', updateCellOptions);
    
    // Form gönderimini dinle
    document.getElementById('examinationForm').addEventListener('submit', handleFormSubmit);
    
    // Bugünün tarihini varsayılan olarak ayarla
    document.getElementById('examinationDate').valueAsDate = new Date();
    
    // Geçmişi göster
    displayExaminationHistory();
}

// Koğuş seçeneklerini güncelle
function updateCellOptions() {
    const blockSelect = document.getElementById('block');
    const cellSelect = document.getElementById('cell');
    const selectedBlock = blockSelect.value;
    
    cellSelect.innerHTML = '<option value="">-- Koğuş Seçiniz --</option>';
    
    if (selectedBlock && BLOCKS[selectedBlock]) {
        const cellCount = BLOCKS[selectedBlock].cells;
        for (let i = 1; i <= cellCount; i++) {
            const option = document.createElement('option');
            option.value = `${selectedBlock.toLowerCase()}${i}`;
            option.textContent = `${selectedBlock.toUpperCase()}${i}`;
            cellSelect.appendChild(option);
        }
    }
}

// Form gönderimini işle
function handleFormSubmit(e) {
    e.preventDefault();
    
    const block = document.getElementById('block').value;
    const cell = document.getElementById('cell').value;
    const prisonerName = document.getElementById('prisonerName').value.trim();
    const examinationDate = document.getElementById('examinationDate').value;
    const notes = document.getElementById('notes').value.trim();
    
    // 2 haftalık kuralı kontrol et
    const eligibilityCheck = checkEligibility(cell, prisonerName, new Date(examinationDate));
    
    if (!eligibilityCheck.eligible) {
        showMessage(eligibilityCheck.message, 'error');
        return;
    }
    
    // Muayene kaydını oluştur
    const examination = {
        id: Date.now().toString(),
        block: block,
        cell: cell,
        prisonerName: prisonerName,
        examinationDate: examinationDate,
        notes: notes,
        createdAt: new Date().toISOString()
    };
    
    // Kaydet
    examinations.push(examination);
    saveToLocalStorage();
    
    // Formu temizle
    document.getElementById('examinationForm').reset();
    document.getElementById('cell').innerHTML = '<option value="">-- Önce Blok Seçiniz --</option>';
    document.getElementById('examinationDate').valueAsDate = new Date();
    
    // Mesajı göster
    showMessage(`✅ ${prisonerName} için muayene kaydı başarıyla oluşturuldu. Sonraki muayene hakkı: ${eligibilityCheck.nextDate}`, 'success');
    
    // Geçmişi güncelle
    displayExaminationHistory();
}

// 2 haftalık uygunluk kontrolü
function checkEligibility(cell, prisonerName, examinationDate) {
    // Aynı kişinin son muayenesini bul
    const previousExaminations = examinations.filter(exam => 
        exam.cell === cell && exam.prisonerName.toLowerCase() === prisonerName.toLowerCase()
    ).sort((a, b) => new Date(b.examinationDate) - new Date(a.examinationDate));
    
    if (previousExaminations.length === 0) {
        // İlk muayene
        const nextDate = new Date(examinationDate.getTime() + TWO_WEEKS_MS);
        return {
            eligible: true,
            message: 'İlk muayene kaydı',
            nextDate: formatDate(nextDate)
        };
    }
    
    const lastExamination = previousExaminations[0];
    const lastExamDate = new Date(lastExamination.examinationDate);
    const daysDifference = (examinationDate - lastExamDate) / (24 * 60 * 60 * 1000);
    
    if (daysDifference < 14) {
        const nextEligibleDate = new Date(lastExamDate.getTime() + TWO_WEEKS_MS);
        return {
            eligible: false,
            message: `⚠️ ${prisonerName} son muayenesinden 14 gün geçmedi. Son muayene: ${formatDate(lastExamDate)}. Sonraki uygun tarih: ${formatDate(nextEligibleDate)}`,
            nextDate: formatDate(nextEligibleDate)
        };
    }
    
    const nextDate = new Date(examinationDate.getTime() + TWO_WEEKS_MS);
    return {
        eligible: true,
        message: 'Muayene için uygundur',
        nextDate: formatDate(nextDate)
    };
}

// Muayene geçmişini göster
function displayExaminationHistory(filter = 'all', searchTerm = '') {
    const historyContainer = document.getElementById('examinationHistory');
    
    let filteredExaminations = [...examinations];
    
    // Blok filtreleme
    if (filter !== 'all') {
        filteredExaminations = filteredExaminations.filter(exam => exam.block === filter);
    }
    
    // Arama filtresi
    if (searchTerm) {
        filteredExaminations = filteredExaminations.filter(exam => 
            exam.prisonerName.toLowerCase().includes(searchTerm.toLowerCase()) ||
            exam.cell.toLowerCase().includes(searchTerm.toLowerCase())
        );
    }
    
    // Tarihe göre sırala (en yeni en üstte)
    filteredExaminations.sort((a, b) => new Date(b.examinationDate) - new Date(a.examinationDate));
    
    if (filteredExaminations.length === 0) {
        historyContainer.innerHTML = '<p class="no-data">Kayıt bulunamadı.</p>';
        return;
    }
    
    historyContainer.innerHTML = filteredExaminations.map(exam => {
        const examDate = new Date(exam.examinationDate);
        const nextEligibleDate = new Date(examDate.getTime() + TWO_WEEKS_MS);
        const isEligibleNow = new Date() >= nextEligibleDate;
        
        return `
            <div class="history-item ${isEligibleNow ? 'eligible' : 'not-eligible'}">
                <div class="history-item-header">
                    <div>
                        <div class="prisoner-info">${exam.prisonerName}</div>
                        <div class="cell-info">${exam.block} Blok - ${exam.cell.toUpperCase()}</div>
                    </div>
                    <div class="examination-date">${formatDate(examDate)}</div>
                </div>
                <div class="next-eligible">
                    ${isEligibleNow ? 
                        '✅ Yeni muayene için uygun' : 
                        `⏳ Sonraki muayene hakkı: ${formatDate(nextEligibleDate)}`
                    }
                </div>
                ${exam.notes ? `<div class="notes">📝 ${exam.notes}</div>` : ''}
                <button class="delete-btn" onclick="deleteExamination('${exam.id}')">🗑️ Sil</button>
            </div>
        `;
    }).join('');
}

// Muayene kaydını sil
function deleteExamination(id) {
    if (confirm('Bu muayene kaydını silmek istediğinizden emin misiniz?')) {
        examinations = examinations.filter(exam => exam.id !== id);
        saveToLocalStorage();
        displayExaminationHistory();
        showMessage('Kayıt başarıyla silindi.', 'success');
    }
}

// Blok filtreleme
function filterByBlock(block) {
    // Aktif buton stilini güncelle
    document.querySelectorAll('.filter-btn').forEach(btn => {
        btn.classList.remove('active');
    });
    event.target.classList.add('active');
    
    displayExaminationHistory(block);
}

// Muayene arama
function searchExaminations() {
    const searchTerm = document.getElementById('searchInput').value;
    displayExaminationHistory('all', searchTerm);
}

// Aramayı temizle
function clearSearch() {
    document.getElementById('searchInput').value = '';
    displayExaminationHistory('all');
}

// XML'e aktar
function exportToXML() {
    if (examinations.length === 0) {
        showMessage('Dışa aktarılacak veri bulunmamaktadır.', 'warning');
        return;
    }
    
    let xml = '<?xml version="1.0" encoding="UTF-8"?>\n';
    xml += '<revirMuayeneleri>\n';
    xml += '  <metadata>\n';
    xml += `    <exportDate>${new Date().toISOString()}</exportDate>\n`;
    xml += `    <totalRecords>${examinations.length}</totalRecords>\n`;
    xml += '  </metadata>\n';
    xml += '  <muayeneler>\n';
    
    examinations.forEach(exam => {
        xml += '    <muayene>\n';
        xml += `      <id>${escapeXML(exam.id)}</id>\n`;
        xml += `      <blok>${escapeXML(exam.block)}</blok>\n`;
        xml += `      <kogus>${escapeXML(exam.cell)}</kogus>\n`;
        xml += `      <mahkumAdi>${escapeXML(exam.prisonerName)}</mahkumAdi>\n`;
        xml += `      <muayeneTarihi>${escapeXML(exam.examinationDate)}</muayeneTarihi>\n`;
        xml += `      <notlar>${escapeXML(exam.notes || '')}</notlar>\n`;
        xml += `      <kayitTarihi>${escapeXML(exam.createdAt)}</kayitTarihi>\n`;
        xml += '    </muayene>\n';
    });
    
    xml += '  </muayeneler>\n';
    xml += '</revirMuayeneleri>';
    
    // Dosyayı indir
    const blob = new Blob([xml], { type: 'application/xml' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `revir_muayeneleri_${formatDateForFilename(new Date())}.xml`;
    a.click();
    URL.revokeObjectURL(url);
    
    showMessage('XML dosyası başarıyla indirildi.', 'success');
}

// XML'den içe aktar
function importFromXML() {
    document.getElementById('xmlFileInput').click();
}

// XML dosyasını işle
function handleFileImport(event) {
    const file = event.target.files[0];
    if (!file) return;
    
    const reader = new FileReader();
    reader.onload = function(e) {
        try {
            const xmlText = e.target.result;
            const parser = new DOMParser();
            const xmlDoc = parser.parseFromString(xmlText, 'text/xml');
            
            // XML parse hatası kontrolü
            if (xmlDoc.getElementsByTagName('parsererror').length > 0) {
                throw new Error('XML dosyası geçersiz.');
            }
            
            const muayeneNodes = xmlDoc.getElementsByTagName('muayene');
            const importedData = [];
            
            for (let i = 0; i < muayeneNodes.length; i++) {
                const node = muayeneNodes[i];
                const examination = {
                    id: getXMLValue(node, 'id') || Date.now().toString() + i,
                    block: getXMLValue(node, 'blok'),
                    cell: getXMLValue(node, 'kogus'),
                    prisonerName: getXMLValue(node, 'mahkumAdi'),
                    examinationDate: getXMLValue(node, 'muayeneTarihi'),
                    notes: getXMLValue(node, 'notlar'),
                    createdAt: getXMLValue(node, 'kayitTarihi') || new Date().toISOString()
                };
                importedData.push(examination);
            }
            
            if (importedData.length === 0) {
                throw new Error('XML dosyasında veri bulunamadı.');
            }
            
            // Mevcut verilerle birleştir (ID çakışmalarını önle)
            const existingIds = new Set(examinations.map(e => e.id));
            const newData = importedData.filter(e => !existingIds.has(e.id));
            
            examinations = [...examinations, ...newData];
            saveToLocalStorage();
            displayExaminationHistory();
            
            showMessage(`✅ ${newData.length} muayene kaydı başarıyla içe aktarıldı.`, 'success');
        } catch (error) {
            showMessage(`❌ İçe aktarma hatası: ${error.message}`, 'error');
        }
    };
    reader.readAsText(file);
    
    // Input'u temizle
    event.target.value = '';
}

// XML değeri al
function getXMLValue(node, tagName) {
    const elements = node.getElementsByTagName(tagName);
    return elements.length > 0 ? elements[0].textContent : '';
}

// XML için karakter escape
function escapeXML(str) {
    if (!str) return '';
    return str
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&apos;');
}

// Tüm verileri temizle
function clearAllData() {
    if (confirm('⚠️ TÜM muayene kayıtlarını silmek istediğinizden emin misiniz? Bu işlem geri alınamaz!')) {
        if (confirm('Bu işlem tüm verileri kalıcı olarak silecektir. Devam etmek istediğinizden emin misiniz?')) {
            examinations = [];
            saveToLocalStorage();
            displayExaminationHistory();
            showMessage('Tüm veriler temizlendi.', 'success');
        }
    }
}

// LocalStorage'a kaydet
function saveToLocalStorage() {
    localStorage.setItem('examinations', JSON.stringify(examinations));
}

// Mesaj göster
function showMessage(message, type) {
    const messageDiv = document.getElementById('message');
    messageDiv.textContent = message;
    messageDiv.className = `message ${type}`;
    
    // 5 saniye sonra mesajı gizle
    setTimeout(() => {
        messageDiv.style.display = 'none';
    }, 5000);
}

// Tarih formatlama
function formatDate(date) {
    const d = new Date(date);
    const day = String(d.getDate()).padStart(2, '0');
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const year = d.getFullYear();
    return `${day}.${month}.${year}`;
}

// Dosya adı için tarih formatlama
function formatDateForFilename(date) {
    const d = new Date(date);
    const day = String(d.getDate()).padStart(2, '0');
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const year = d.getFullYear();
    const hour = String(d.getHours()).padStart(2, '0');
    const minute = String(d.getMinutes()).padStart(2, '0');
    return `${year}${month}${day}_${hour}${minute}`;
}
