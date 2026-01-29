# 🏥 Cezaevi Revir Muayene Sistemi

Cezaevi revir muayene takip ve yönetim sistemi. Bu uygulama, farklı blokların haftalık muayene programlarını yönetir ve her mahkumun 2 haftada 1 muayene hakkını sistematik olarak takip eder.

## 📋 Özellikler

### Haftalık Muayene Programı
- **Pazartesi**: D Blok (d1-d14, 14 koğuş)
- **Salı**: E Blok (e1-e14, 14 koğuş)
- **Çarşamba**: B Blok (b1-b14, 14 koğuş)
- **Perşembe**: A Blok (a1-a14, 14 koğuş)
- **Cuma**: C Blok (c1-c11, 11 koğuş)

### Temel Özellikler
- ✅ 2 haftalık muayene hakkı kontrolü
- ✅ Blok ve koğuş bazlı kayıt yönetimi
- ✅ Mahkum bazlı muayene geçmişi
- ✅ Sonraki muayene tarihinin otomatik hesaplanması
- ✅ Arama ve filtreleme özellikleri
- ✅ XML formatında veri dışa/içe aktarma
- ✅ LocalStorage ile veri saklama
- ✅ Responsive (mobil uyumlu) tasarım

## 🚀 Kullanım

### Kurulum
1. Projeyi klonlayın veya indirin
2. `index.html` dosyasını bir web tarayıcısında açın
3. Uygulama herhangi bir sunucu kurulumu gerektirmez

### Muayene Kaydı Ekleme
1. Sol paneldeki haftalık programı kontrol edin
2. Sağ panelden:
   - Blok seçin (A, B, C, D veya E)
   - Koğuş numarasını seçin
   - Mahkum adı soyadını girin
   - Muayene tarihini seçin
   - İsteğe bağlı notlar ekleyin
3. "Muayene Kaydet" butonuna tıklayın
4. Sistem otomatik olarak 2 haftalık kuralı kontrol eder

### 2 Haftalık Kural
- Her mahkum son muayenesinden 14 gün sonra yeni muayene hakkı kazanır
- Sistem, 14 gün dolmadan yapılan kayıt denemelerini engeller
- Muayene geçmişinde sonraki uygun tarih gösterilir

### Veri Yönetimi

#### XML Dışa Aktarma
1. "XML Olarak İndir" butonuna tıklayın
2. Tüm muayene kayıtları XML formatında indirilir
3. Dosya adı: `revir_muayeneleri_YYYYMMDD_HHMM.xml`

#### XML İçe Aktarma
1. "XML'den İçe Aktar" butonuna tıklayın
2. Daha önce dışa aktarılmış XML dosyasını seçin
3. Veriler mevcut kayıtlara eklenir

#### Örnek Veri
Proje, `sample_data.xml` dosyasında örnek veri içerir. Bu dosyayı içe aktararak sistemi test edebilirsiniz.

### Arama ve Filtreleme
- **Mahkum Adı ile Arama**: Arama kutusuna mahkum adını yazın
- **Koğuş ile Arama**: Koğuş numarasını (örn: d1, e5) yazın
- **Blok Filtreleme**: Blok butonlarına tıklayarak sadece o bloka ait kayıtları görün
- **Temizle**: Tüm filtreleri kaldırır

## 📁 Dosya Yapısı

```
revir/
├── index.html          # Ana HTML dosyası
├── styles.css          # CSS stilleri
├── app.js              # JavaScript uygulama mantığı
├── sample_data.xml     # Örnek veri dosyası
├── .gitignore          # Git ignore kuralları
└── README.md           # Dokümantasyon
```

## 🔧 Teknik Detaylar

### Veri Saklama
- **LocalStorage**: Tarayıcıda yerel veri saklama
- **XML**: Veri dışa/içe aktarma formatı

### Blok Yapılandırması
```javascript
const BLOCKS = {
    'A': { cells: 14, day: 'Perşembe' },
    'B': { cells: 14, day: 'Çarşamba' },
    'C': { cells: 11, day: 'Cuma' },
    'D': { cells: 14, day: 'Pazartesi' },
    'E': { cells: 14, day: 'Salı' }
};
```

### XML Veri Yapısı
```xml
<?xml version="1.0" encoding="UTF-8"?>
<revirMuayeneleri>
  <metadata>
    <exportDate>...</exportDate>
    <totalRecords>...</totalRecords>
  </metadata>
  <muayeneler>
    <muayene>
      <id>...</id>
      <blok>...</blok>
      <kogus>...</kogus>
      <mahkumAdi>...</mahkumAdi>
      <muayeneTarihi>...</muayeneTarihi>
      <notlar>...</notlar>
      <kayitTarihi>...</kayitTarihi>
    </muayene>
  </muayeneler>
</revirMuayeneleri>
```

## 🎨 Kullanıcı Arayüzü

- **Modern ve Kullanıcı Dostu**: Gradient arka plan, card-based tasarım
- **Responsive**: Mobil, tablet ve masaüstü cihazlarda uyumlu
- **Renkli Blok Göstergeler**: Her gün için farklı renk kodlaması
- **Anlık Geri Bildirim**: Başarı, hata ve uyarı mesajları

## 🔒 Güvenlik ve Veri

- Tüm veriler tarayıcıda saklanır (LocalStorage)
- Sunucu tarafı depolama gerektirmez
- XML dışa aktarma ile yedekleme yapılabilir
- Veri temizleme öncesi çift onay istenir

## 📱 Tarayıcı Desteği

- Chrome (önerilen)
- Firefox
- Safari
- Edge
- Diğer modern tarayıcılar

## 🤝 Katkıda Bulunma

Bu proje açık kaynak olarak geliştirilmektedir. Öneriler ve katkılar memnuniyetle karşılanır.

## 📄 Lisans

Bu proje MIT lisansı altında sunulmaktadır.

## 📞 İletişim

Sorularınız veya önerileriniz için issue açabilirsiniz.