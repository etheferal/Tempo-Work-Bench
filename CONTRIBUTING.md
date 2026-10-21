# Katkıda bulunma rehberi

Katkılarınız için teşekkürler! 🎉

## Geliştirme ortamı

```bash
npm install
cp .env.example .env
npm run db:push && npm run db:seed
npm run dev
```

PR açmadan önce şunların yeşil olduğundan emin olun:

```bash
npm run typecheck   # strict TS
npm run lint        # ESLint
npm test            # birim testler
npm run build       # üretim derlemesi
```

CI (`.github/workflows/ci.yml`) bu dört adımı her PR'da otomatik koşar.

## Yol haritasından bir konu seçin

Aşağıdaki alanlar özellikle katkıya açıktır:

- Recurring tasks & hatırlatıcılar
- Task'lara dosya eki (upload)
- Gantt / zaman çizelgesi görünümü
- WebSocket ile canlı senkronizasyon (presence)
- i18n (EN / TR)

Küçük bir yardım bile değerli: README düzeltmeleri, typo'lar, test kapsamı artışı.

## Commit & PR kuralları

- Commit mesajları: `feat:`, `fix:`, `docs:`, `refactor:`, `test:`, `chore:` önekleri.
- PR başlığı kısa ve emredici olsun; "Ne / Neden / Nasıl test edildi" formatında açıklama yazın.
- Yeni bir API endpoint'i ekliyorsanız: Zod şeması (`src/lib/validations.ts`) + rol guard'ı
  (`src/lib/api-utils.ts`) + tablo güncellemesi (`README.md#-api-overview`) zorunludur.
- Yeni bir UI bileşeni: `src/components/ui/` primitiflerini yeniden kullanın, yeni bağımlılık
  eklemekten kaçının.

Teşekkürler! ⭐
