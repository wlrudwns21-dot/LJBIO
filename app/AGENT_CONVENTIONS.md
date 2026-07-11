# Porting conventions (read before implementing a section/page)

You are porting **one file** of the LJ-BIO app from the Claude Design prototype
at `/home/claude/repo/project/Portal.dc.html` (portal) or
`/home/claude/repo/project/{Home,About,Business,Global,Contact}.dc.html` (public
site) into this React + Vite + TypeScript app. **Recreate the visual output
faithfully** (pixel-level: same colors, sizes, spacing, copy). The prototype
uses `{{ }}` templates rendered against a `Component extends DCLogic` class —
the **template** (HTML, lines ~92–1232) is the markup; the **`renderVals()`**
block and helper methods (lines ~1449–2062) are the logic. Translate both into
idiomatic React.

## Golden rules
- **Only create/edit the ONE file you are assigned.** Do not touch shared files,
  the registry, other sections, or `demo.ts`. If you need a helper that doesn't
  exist, inline it in your file.
- Match the prototype's inline styles closely. Keep Korean copy verbatim.
- The reference implementation to imitate is `src/portal/sections/Dashboard.tsx`
  — read it first for the exact demo-data + Supabase pattern.
- Build must stay green: `cd /home/claude/repo/app && npm run build`.

## Available shared imports (import, never edit)
- `@/lib/theme` → `theme`, `priorityStyle(p)`, `fieldStyle(f)`, `noticeTagStyle(t)`,
  `roleLabel(r)`, `roleStyle(r)`, `fmtKRW(n)`, plus `theme.palette` (segment colors).
- `@/lib/supabase` → `supabase`, `isSupabaseConfigured`.
- `@/context/AuthContext` → `useAuth()` (`.profile`, `.role`, etc.).
- `@/types/database` → all row types (`Task`, `TaskFull`, `Notice`, `Approval`,
  `Partner`, `Mail`, `Segment`, `Leave`, `FileRow`, `Conversation`, `Message`,
  `CalendarEvent`, `Profile`, `ContractType`, ...).
- `@/portal/ui` → `Modal`, `useToast()` (the prototype's `flash`), `Field`,
  `PBtn`, `Card`, `SectionBar`, `fieldStyle`, `labelStyle`.
- `../nav` → `useSectionNav()` returns `go(sectionKey)` to jump between sections.
- `../data/demo` → typed demo seed (`demoTasks`, `demoNotices`, `demoApprovals`,
  `demoPartners`, `demoMails`, `demoSegments`, `demoLeaves`, `demoFiles`,
  `demoConversations`, `demoEvents`, `demoContractTypes`, `demoMembers`,
  `demoPending`, `demoMe`). READ-ONLY — copy before mutating in state.
- `../data/taskUtils` → `taskPct(t)`, `taskStatus(t)`, `nextStageStatus(s)`.

## Data pattern (demo ↔ Supabase)
```tsx
const [rows, setRows] = useState<Notice[]>(demoNotices);   // demo seed as initial state
useEffect(() => {
  if (!isSupabaseConfigured) return;                        // demo mode: keep seed
  supabase.from("notices").select("*").order("created_at", { ascending: false })
    .then(({ data }) => data && setRows(data as Notice[]));
}, []);
```
- **Mutations:** update local state optimistically AND, when
  `isSupabaseConfigured`, persist via `supabase.from(table).insert/update/delete`.
  A small helper is fine, e.g.:
  ```tsx
  async function persist(fn: () => Promise<any>) { if (isSupabaseConfigured) await fn(); }
  ```
- Use `useToast()` for the prototype's `this.flash("...")` confirmations.
- The current user is admin (지경준) — `useAuth().profile` or `demoMe` as fallback.

## Supabase table/column reference (snake_case)
See `supabase/migrations/0001_schema.sql`. Key ones:
- `notices(tag,title,body,author,created_at)`
- `tasks(title,country,field,assignee,priority,due)` +
  `task_stages(task_id,name,status,sort)` + `task_comments(stage_id,author,init,avatar_bg,body,created_at)`
- `approvals(seq,type,title,seg_id,drafter,d_init,d_bg,amount,due,content,status,approver,approved_at)`
- `partners(...snake_case..., docs jsonb)`, `contract_types(name,sort)`
- `mails(folder,from_name,from_email,from_init,avatar_bg,to_addr,subject,preview,body,unread,starred,attachments,sent_at)`
- `segments(id,name,color,orders,revenue,sort)`, `files(name,ext,category,seg_id,size,uploader)`
- `leaves(name,dept,init,avatar_bg,type,range,days,status)`
- `calendar_events(title,type,event_date,day,mon,time)`, `settings(key,value)`
- `profiles(name,email,dept,role,status,init,avatar_bg)`

Note: the demo objects already use these field names where they map to DB columns
(e.g. `avatar_bg`, `created_at`), except a few UI-only extras on demo objects
(`date`, `online`, `unread`, `last`, `me`, `messages`) documented in `demo.ts`.

## Responsive class names (already styled in portal.css)
Use these classNames on grid containers so mobile rules apply:
`g-stats` (stat grid → 2col), `g-2col` (→1col), `g-kanban` (→horizontal scroll),
`g-chat`, `g-mail`, `g-files`, `g-members`, `g-schedule`, `g-docs`, and
`doc-paper` (the document preview sheet).
