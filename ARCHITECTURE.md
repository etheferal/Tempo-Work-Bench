# Mimari — Tempo

Bu doküman Tempo'nun teknik kararlarını, veri modelini ve veri akışını özetler.

## Genel bakış

```
┌─────────────────────────────────────────────────────────────┐
│                        Browser (client)                     │
│                                                             │
│  React 18 + React Query (src/lib/hooks.ts)                  │
│  - Optimistic DnD (src/lib/board.ts: applyMove)             │
│  - ⌘K palette, dark mode, form'lar                          │
└───────────────┬─────────────────────────────────────────────┘
                │ fetch (JSON)
┌───────────────▼─────────────────────────────────────────────┐
│                 Next.js 14 App Router (server)              │
│                                                             │
│  (app) route group → getServerSession ile korumalı sayfalar │
│  api/               → ~20 REST endpoint                     │
│                        │                                    │
│                        ├─ Zod doğrulama (lib/validations)    │
│                        ├─ Rol & üyelik guard'ları (api-utils)│
│                        └─ Aktivite/Bildirim yardımcıları     │
└───────────────┬─────────────────────────────────────────────┘
                │ Prisma ORM
┌───────────────▼─────────────────────────────────────────────┐
│              SQLite (dev)  ·  PostgreSQL (prod hazır)        │
└─────────────────────────────────────────────────────────────┘
```

## Veri modeli

```
User 1─┬─* Member *─1 Workspace 1─* Project 1─* Column 1─* Task
       ├─* Invite (workspace'a davet)        │               ├─* TaskLabel ─ Label
       ├─* Task (assignee / creator)          │               ├─* ChecklistItem
       ├─* Comment (yorumlar)                 │               └─* Comment
       ├─* Activity (workspace log)           └─* Activity
       └─* Notification
```

Önemli tasarım noktaları:

- **SQLite enum desteği yoktur** → roller (`OWNER/ADMIN/MEMBER`) ve öncelikler
  (`LOW..URGENT`) string olarak saklanır, Zod şemaları ile doğrulanır.
- **`Column.isDone`** → bir kolon "done" olarak işaretlenirse, içine taşınan task'lar
  `completedAt` alır; dashboard grafikleri ve "tamamlandı" sayaçları bu alandan beslenir.
- **Aktivite & bildirim** → işlemin türü + JSON `meta` (insan-okur detaylar). Bildirimler
  yalnızca ilgili kişiye (atanan, yorum yapılan task'ın sahibi) oluşturulur.

## Sürükle-bırak: tek doğru fonksiyon

`src/lib/board.ts` içindeki **saf** `applyMove` / `applyMoveFlat` fonksiyonları:

1. İstemci **optimistic** olarak önbelleği yeni sıraya taşır (`useMoveTask.onMutate`),
2. API aynı fonksiyonu DB verisi üzerinde çalıştırıp sonucu transaction içinde yazar.

Aynı mantığı iki yerde ayrı ayrı yazmak yerine tek kaynak — UI ile DB arasındaki tutarsızlık
sınıfı tasarım gereği ortadan kalkar. Saf olduğu için birim testleri (`src/lib/board.test.ts`)
kapsamıdır.

## Gantt timeline: aynı desen

`src/lib/timeline.ts` yine **saf** bir çekirdektir: `buildTimelineRange` + `layoutTimeline`
çağnızın görüntülenmesinden bağımsız olarak gün aralığını, çubuk konumlarını ve "due'suz"
görevleri hesaplar (`src/lib/timeline.test.ts`). Timeline görünümü (`timeline-view.tsx`)
yalnızca bu hesabı render eder — board verisinin aynısını kullanır, ayrı endpoint yoktur.

## İki dilli arayüz (EN/TR)

`src/lib/dictionary.ts` — **tip güvenli** iki sözlük (EN/TR). `dictionaries.tr` bir
`Record<TranslationKey, string>` olarak tip'lendiği için eksik bir Türkçe çeviri derleme
hatası verir, çalışma zamanı sürprizi olmaz. Sözlük testi (`dictionary.test.ts`) iki dilin
anahtar kümelerinin birebir aynı ve boş metin içermediğini doğrular.

Zincir şu şekilde işler:

```
Topbar / ⌘K / Ayarlar → setLocale("tr") → cookie: tempo-locale=tr → state günceller
                                       ↓ (sayfa yenilenince)
Sunucu: getServerLocale() (cookies) → <html lang="tr"> + LocaleProvider initialLocale="tr"
İstemci: useI18n() → t("dash.greeting", { name }) — {var} interpolasyonlu
Tarihler: date-fns tr locale → "Ekim", "2 gün önce", "Bugün", "Yarın"
```

SSR ve hidrasyon hep aynı dili bastığı için hiçbir "dil kırpılması" yaşanmaz. Not: API
hata mesajları (Zod vb.) İngilizce kalır; yalnızca arayüz katmanı çevrilidir — kapsam
bilinçli olarak böyle tutulmuştur.

## Tekrarlayan görevler

`src/lib/recurrence.ts` (yine saf, testli) bir sonraki tekrarın tarihini hesaplar:
`computeNextDueAt(prevDue, recurrence, now)`. Bir recurring görev "done" kolonuna taşındığında
move endpoint'i bir sonraki occurrence'ı projenin ilk açık kolonunda **aynı içerik, etiketler
ve atananla** oluşturur; gecikmiş seriler otomatik olarak bugünün ötesine "ileri sarılır"
(UTC gün tabanlı, saat diliminden bağımsız). Aktivite akışında `task_recreated` olarak loglanır.

## Görev ekleri (attachments) — güvenlik katmanı

Yüklenen her dosya üç kademeden geçer (`src/lib/attachments.ts`, birim testlidir):

1. **MIME allow-list** — png/jpeg/gif/webp, pdf, txt/md/csv, zip. SVG bilinçli olarak
   reddedilir (inline render XSS vektörü). `text/html` ve çalıştırılabilirler de reddedilir.
2. **İsim sanitization** — path traversal kesilir, Türkçe karakterler transliterasyon yapılır,
   uzantılar ayrıca allow-list'e tabidir (`rapor.PDF` → `rapor.pdf`; `script.php` → `script`).
3. **Boyut limiti** — 5 MB; disk adı `uploads/<taskId>/<uuid>.<ext>` şeklinde sunucu
   tarafından üretilir (kullanıcı adı asla diskte kullanılmaz).

Dosyalar `uploads/` klasöründe (git-ignored) tutulur ve `GET /api/attachments/[id]` üzerinden
**yalnızca aynı workspace üyelerine** akıtılır — erişim `requireTaskAccess` ile doğrulanır.

## Kimlik doğrulama & yetki

- NextAuth v4, **Credentials** sağlayıcısı, bcrypt (cost 10) hash, **JWT session** stratejisi.
- Her API rotası: `requireUserId()` → (gerekiyorsa) `requireMemberOf(workspaceId)` →
  (yönetim işlemlerinde) `assertCanManage(role)`.
- Kayıt sırasında kullanıcıya otomatik "onboarding" workspace'i + başlangıç panosu oluşturulur.

## Neden SQLite?

Sıfır konfigürasyonla `npm run db:push && npm run db:seed && npm run dev` deneyimi. PostgreSQL'e
geçiş 3 satır:

```prisma
datasource db {
  provider = "postgresql"   // sqlite → postgresql
  url      = env("DATABASE_URL")
}
```

```bash
DATABASE_URL="postgresql://tempo:tempo@localhost:5432/tempo" npm run db:push
```

## Test stratejisi

- **Saf mantık testleri** (board sıralaması, slug/due utils, Zod şemaları) — hızlı, ortamsız.
- **Bileşen testi** (TaskCard) — jsdom + Testing Library + user-event.
- **CI** — GitHub Actions: typecheck → lint → vitest → production build.

## Güvenlik notları

- Şifreler bcrypt ile hashli; oturum JWT'leri `NEXTAUTH_SECRET` ile imzalı.
- Tüm gövde/sorgular Zod ile doğrulanır (hata mesajları kullanıcı dostu, 400).
- Markdown render'ı `react-markdown` üzerinden yapılır; ham HTML **çalıştırılmaz** (XSS yüzeyi yok).
- Davet linkleri tek kullanımlık, 7 gün ömürlü token'larla çalışır.
