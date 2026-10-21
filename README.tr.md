<p align="center">
  <img src="public/logo.svg" width="96" alt="Tempo logo" />
</p>

<h1 align="center">Tempo</h1>

<p align="center"><b>Modern, tam yığın (full-stack) proje ve görev yönetim platformu.</b></p>

> Bu dosya Türkçe özettir. Ayrıntılı teknik bilgi ve İngilizce ana dokümantasyon için
> **[README.md](README.md)** ve **[ARCHITECTURE.md](ARCHITECTURE.md)** dosyalarına bakın.

## Neler var?

| Alan | Öne çıkanlar |
| --- | --- |
| **Kanban panoları** | Sürükle-bırak (@dnd-kit), optimistic güncelleme, satır içi kart ekleme, yeniden adlandırılabilir sütunlar |
| **Gantt zaman çizelgesi** | Her pano ikinci bir görünümle gelir: tarihli görevler kaydırılabilir bir gün ızgarasına çubuk olarak dizilir, "bugün" işaretli |
| **Görevler** | Markdown açıklamalar, atananlar, 4 öncelik seviyesi, bitiş tarihleri, etiketler, checklist'ler, yorumlar |
| **Dosya ekleri** | Göreve 5 MB'a kadar görsel/PDF/metin/zip ekleme — tip beyaz listesi, güvenli isim üretimi, yalnızca üyelere sunum |
| **Workspace'ler** | Kullanıcı başına çoklu çalışma alanı, OWNER/ADMIN/MEMBER rolleri, süreli e-posta davet linkleri |
| **Bildirimler & aktivite** | Çalışma alanı bazlı aktivite akışı, atama ve yorum bildirimleri |
| **Dashboard** | Haftalık tamamlama grafiği, öncelik dağılımı, gecikmiş görev takibi |
| **Komut paleti** | ⌘K / Ctrl+K — görev, proje ve workspace arama + hızlı eylemler |
| **İki dilli arayüz** | Üst çubuktaki, ⌘K'daki ve ayarlardaki tek tuşla EN/TR geçişi — yenilemede kalıcı, tip güvenli sözlük |

## Hızlı başlangıç

```bash
git clone https://github.com/<kullanici-adin>/tempo.git
cd tempo
npm install
cp .env.example .env       # Windows: copy .env.example .env
# NEXTAUTH_SECRET değerine uzun rastgele bir dizgi yazın
npm run db:push
npm run db:seed
npm run dev                # http://localhost:3000
```

**Demo hesabı:** `demo@tempo.app` / `demo1234` — hazır workspace'ler, projeler ve görevlerle
birlikte tüm özellikleri hemen gezebilirsiniz. Yeni kayıt olan her kullanıcıya otomatik
onboarding panosu oluşturulur.

## Test & kalite

```bash
npm test          # Vitest birim testleri
npm run typecheck # strict TypeScript
npm run lint      # ESLint
npm run build     # üretim derlemesi
```

CI (GitHub Actions) tüm bu adımları her push/PR'da çalıştırır.

## Notlar

- Varsayılan veritabanı **SQLite**'tır (sıfır konfigürasyon); PostgreSQL'e geçiş
  [ARCHITECTURE.md](ARCHITECTURE.md#neden-sqlite) içinde 3 satırlık anlatılmıştır.
- Windows'ta klasör yolunda Türkçe karakter varsa testler için
  `npx vitest run --environment=node src/lib` komutunu kullanın (detaylar README'de).

## Lisans

MIT — katkılar için [CONTRIBUTING.md](CONTRIBUTING.md) rehberine göz atın.
