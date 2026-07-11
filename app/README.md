# LJ-BIO — 공개 홈페이지 + 임직원 업무 포털

엘제이바이오(LJ-BIO)의 **고객용 홈페이지**와 **임직원 업무 포털**을 하나의
React 애플리케이션으로 구현한 프로젝트입니다. Claude Design 프로토타입
(`../project/`)을 실제 운영 가능한 코드로 옮겼습니다.

- **Frontend:** React 18 + Vite + TypeScript + React Router
- **Backend:** Supabase (Postgres · Auth · Row Level Security)
- **Design:** 다크 + 그린 "사이언스" 시스템 · Pretendard + Space Grotesk

## 빠른 시작 (로컬)

```bash
cd app
npm install
cp .env.example .env        # Supabase 키 입력 (아래 참고). 없어도 데모 모드로 동작
npm run dev                 # http://localhost:5173
```

- `/` — 고객 홈페이지 (회사소개 · 사업영역 · 글로벌 · 문의)
- `/portal` — 임직원 업무 포털 (로그인 → 승인 대기 → 대시보드)

> **데모 모드:** `.env`에 Supabase 키가 없으면 인증을 건너뛰고 시드 데이터로
> 포털 전체를 둘러볼 수 있습니다. 실제 계정·저장이 필요하면 아래대로 Supabase를
> 연결하세요.

## Supabase 연결 (실제 운영)

1. [supabase.com](https://supabase.com)에서 프로젝트를 생성합니다.
2. **SQL Editor**에서 `supabase/migrations/`의 파일을 순서대로 실행합니다:
   `0001_schema.sql` → `0002_rls.sql` → `0003_seed.sql`
   (또는 Supabase CLI: `supabase db push`)
3. **Project Settings → API**에서 `Project URL`과 `anon public` 키를 복사해
   `.env`에 넣습니다:
   ```
   VITE_SUPABASE_URL=https://xxxx.supabase.co
   VITE_SUPABASE_ANON_KEY=eyJ...
   ```
4. `npm run dev` 후 회원가입 → 관리자 승인 → 로그인.

### 계정 · 승인 흐름
- 회원가입 시 `auth.users`에 사용자가 생성되고, 트리거(`handle_new_user`)가
  `profiles` 행을 만듭니다. 이메일이 시드된 직원 명단과 일치하면 그 직원 계정에
  연결되고(권한·상태 승계), 아니면 **승인 대기(pending)** 상태로 생성됩니다.
- 관리자(예: `kyungjun.ji@bio-lj.com`)로 로그인 → **관리자** 메뉴에서 승인.
- 첫 관리자를 만들려면 해당 이메일로 가입한 뒤 Supabase 대시보드에서
  `profiles.status='approved'`, `role='admin'`으로 한 번만 직접 설정하면 됩니다.

## 권한 (Row Level Security)
`supabase/migrations/0002_rls.sql`에 정의되어 있습니다.
- **승인된 사용자**만 업무 데이터를 읽고 쓸 수 있습니다.
- **전자결재 문서**는 상신자 본인과 **관리자**만 열람/처리할 수 있습니다.
- **메일**은 소유자 본인만 접근합니다.
- **사업 부문 · 계약서 유형 · 직인 설정**은 팀장 이상/관리자만 변경합니다.

## 스크립트
| 명령 | 설명 |
|------|------|
| `npm run dev` | 개발 서버 |
| `npm run build` | 타입체크 + 프로덕션 빌드 (`dist/`) |
| `npm run preview` | 빌드 결과 미리보기 |
| `npm run typecheck` | 타입체크만 |

## 배포
정적 SPA이므로 Vercel · Netlify · Cloudflare Pages 등 어디든 배포할 수 있습니다.
- **Root/Base directory:** `app`
- **Build command:** `npm run build` · **Output:** `dist`
- 환경변수 `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`를 배포 대시보드에 등록.
- SPA 라우팅을 위해 모든 경로를 `index.html`로 rewrite 하도록 설정하세요
  (Vercel은 자동, Netlify는 `/* /index.html 200`).

## 구조
```
app/
├── index.html
├── src/
│   ├── main.tsx · App.tsx           # 부트 + 라우팅
│   ├── global.css                    # 디자인 토큰 · 전역 스타일
│   ├── lib/            supabase.ts · theme.ts
│   ├── context/        AuthContext.tsx
│   ├── i18n/           LangContext.tsx  (KO/EN)
│   ├── types/          database.ts       (DB 행 타입)
│   ├── site/           SiteChrome + Home/About/Business/Global/Contact
│   └── portal/
│       ├── PortalApp.tsx · PortalShell.tsx · Login.tsx · Pending.tsx
│       ├── ui.tsx      (Modal · Toast · Card · Field)
│       ├── data/       demo.ts · taskUtils.ts   (시드 · 헬퍼)
│       └── sections/   Dashboard · Notices · Tasks · Schedule · Chat ·
│                       Mail · Approvals · Docs · Finance · Partners ·
│                       Files · Hr · Admin
└── supabase/migrations/  0001_schema · 0002_rls · 0003_seed
```

## Gmail 연동 (향후)
메일 메뉴는 현재 UI 프로토타입입니다. 실제 연동 시 `mails` 시드를 Gmail API
응답으로 교체하고(목록은 메시지 ID만, 본문은 열 때 `messages.get`으로 조회),
`sendMail`을 `messages.send`로 연결하면 DB 용량을 최소화할 수 있습니다.
