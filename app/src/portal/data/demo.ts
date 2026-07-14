/**
 * Demo dataset — mirrors supabase/migrations/0003_seed.sql so the portal is
 * fully explorable without a backend (when VITE_SUPABASE_* is unset). Sections
 * import these as their initial state in demo mode; with Supabase configured
 * they fetch the same shape from the database instead. READ-ONLY: treat as
 * seed and copy before mutating in component state.
 */
import type {
  Segment,
  Notice,
  TaskFull,
  Conversation,
  Message,
  Mail,
  Approval,
  Partner,
  FileRow,
  Leave,
  CalendarEvent,
  Profile,
  Inquiry,
} from "@/types/database";

export const demoMe = {
  name: "지경준",
  role: "admin" as const,
  dept: "경영지원",
  init: "지",
  email: "kyungjun.ji@bio-lj.com",
};

export const demoMembers = [
  { name: "이일형", email: "ilhyung.lee@bio-lj.com", dept: "대표이사", role: "admin", init: "이", avatar_bg: "#0C0F0D", can_approve: true, is_ceo: true },
  { name: "지경준", email: "kyungjun.ji@bio-lj.com", dept: "경영지원", role: "admin", init: "지", avatar_bg: "#0E7B4E", can_approve: true, is_ceo: false },
  { name: "최민수", email: "minsu.choi@bio-lj.com", dept: "해외영업", role: "manager", init: "최", avatar_bg: "#7A4DD1", can_approve: true, is_ceo: false },
  { name: "박지원", email: "jiwon.park@bio-lj.com", dept: "RA (인허가)", role: "manager", init: "박", avatar_bg: "#2A6FDB", can_approve: true, is_ceo: false },
  { name: "김서연", email: "seoyeon.kim@bio-lj.com", dept: "해외영업", role: "staff", init: "김", avatar_bg: "#C6803A", can_approve: false, is_ceo: false },
  { name: "정우성", email: "wooseong.jung@bio-lj.com", dept: "물류", role: "staff", init: "정", avatar_bg: "#D14D8B", can_approve: false, is_ceo: false },
  { name: "한소희", email: "sohee.han@bio-lj.com", dept: "마케팅", role: "staff", init: "한", avatar_bg: "#1E9E5A", can_approve: false, is_ceo: false },
];

export const demoPending: Partial<Profile>[] = [
  { id: "p1", name: "윤채원", email: "chaewon.yoon@bio-lj.com", dept: "해외영업팀", role: "staff", init: "윤", avatar_bg: "#2A6FDB", created_at: "2026-07-10" },
  { id: "p2", name: "강태호", email: "taeho.kang@bio-lj.com", dept: "물류팀", role: "staff", init: "강", avatar_bg: "#C6803A", created_at: "2026-07-10" },
  { id: "p3", name: "이하늘", email: "haneul.lee@bio-lj.com", dept: "RA팀", role: "manager", init: "이", avatar_bg: "#0E7B4E", created_at: "2026-07-09" },
];

export const demoSegments: Segment[] = [
  { id: "wholesale", name: "의약품 도매", color: "#2A6FDB", orders: 342, revenue: 4820000000, sort: 0, created_at: "" },
  { id: "pharmexp", name: "의약품 수출", color: "#0E7B4E", orders: 128, revenue: 3160000000, sort: 1, created_at: "" },
  { id: "cosmexp", name: "화장품 수출", color: "#D14D8B", orders: 210, revenue: 1875000000, sort: 2, created_at: "" },
  { id: "deviceexp", name: "의료기기 수출", color: "#C6803A", orders: 46, revenue: 2240000000, sort: 3, created_at: "" },
  { id: "itconsult", name: "IT 컨설팅", color: "#7A4DD1", orders: 18, revenue: 640000000, sort: 4, created_at: "" },
];

export const demoContractTypes = [
  "표준 공급계약서",
  "독점 판매계약서",
  "위탁 판매계약서",
  "비밀유지계약서 (NDA)",
  "물류·운송 계약서",
];

export const demoNotices: Notice[] = [
  { id: "1", tag: "중요", title: "2026 하반기 중국 의료기기 수출 인허가 일정 공지", body: "NMPA 등록 갱신 및 신규 신청 일정이 확정되었습니다. 하반기 수출 예정 품목은 7월 22일까지 서류를 제출해 주시기 바랍니다.", author: "RA팀 박지원", created_at: "2026-07-09" },
  { id: "2", tag: "계약", title: "태국 필러 제품 신규 파트너사 계약 체결 안내", body: "방콕 소재 유통 파트너사와 독점 공급 계약을 체결했습니다. 초도 물량 5,000ea 선적이 7월 14일 예정입니다.", author: "해외영업 최민수", created_at: "2026-07-08" },
  { id: "3", tag: "규정", title: "일본 화장품 수출 라벨링 규정 변경 (7월 시행)", body: "일본 약기법 개정에 따라 전성분 표기 및 주의사항 라벨 양식이 변경됩니다. 7월 이후 선적 물량부터 적용됩니다.", author: "마케팅 한소희", created_at: "2026-07-05" },
  { id: "4", tag: "시스템", title: "사내 전자결재 시스템 정기 점검 안내 (7/15)", body: "7월 15일 오전 2시~4시 시스템 점검이 진행됩니다. 해당 시간 결재 및 문서 생성이 일시 중단됩니다.", author: "경영지원 지경준", created_at: "2026-07-04" },
  { id: "5", tag: "인사", title: "2026년 여름 휴가 신청 안내", body: "7~8월 여름 휴가 신청을 받습니다. 근태·HR 메뉴에서 신청해 주시고, 팀별 업무 공백이 없도록 협의 바랍니다.", author: "경영지원 지경준", created_at: "2026-07-01" },
];

export const demoTasks: TaskFull[] = [
  { id: "1", title: "중국 첨단 의료기기 NMPA 인허가", country: "CN · 의료기기", field: "인허가", assignee: "박지원", priority: "긴급", due: "2026-07-22", status: "doing", created_at: "",
    stages: [
      { id: "1a", task_id: "1", name: "제품 기술문서 준비", status: "done", sort: 0, comments: [{ id: "c1", stage_id: "1a", author: "박지원", init: "박", avatar_bg: "#0E7B4E", body: "기술문서 및 시험성적서 번역본 첨부 완료했습니다.", created_at: "7/2 10:12" }] },
      { id: "1b", task_id: "1", name: "NMPA 사전 적합성 검토", status: "done", sort: 1, comments: [{ id: "c2", stage_id: "1b", author: "지경준", init: "지", avatar_bg: "#2A6FDB", body: "현지 대행사 검토 통과. 본심사 진행합시다.", created_at: "7/6 15:40" }] },
      { id: "1c", task_id: "1", name: "본심사 신청 및 대응", status: "doing", sort: 2, comments: [{ id: "c3", stage_id: "1c", author: "박지원", init: "박", avatar_bg: "#0E7B4E", body: "추가 자료 요청 대응 중 — 라벨 샘플 재제출 필요.", created_at: "7/9 09:22" }] },
      { id: "1d", task_id: "1", name: "등록증 발급", status: "todo", sort: 3, comments: [] },
    ] },
  { id: "2", title: "태국 필러 제품 수출 선적 (5,000ea)", country: "TH · 필러", field: "물류", assignee: "정우성", priority: "높음", due: "2026-07-14", status: "review", created_at: "",
    stages: [
      { id: "2a", task_id: "2", name: "발주 확인 및 재고 배정", status: "done", sort: 0, comments: [{ id: "c4", stage_id: "2a", author: "정우성", init: "정", avatar_bg: "#C6803A", body: "5,000ea 재고 확보 완료.", created_at: "7/5 11:00" }] },
      { id: "2b", task_id: "2", name: "PL / CI 서류 작성", status: "doing", sort: 1, comments: [{ id: "c5", stage_id: "2b", author: "최민수", init: "최", avatar_bg: "#7A4DD1", body: "인보이스 단가 CIF 기준으로 통일 부탁해요.", created_at: "7/9 14:05" }] },
      { id: "2c", task_id: "2", name: "수출 통관 서류 제출", status: "todo", sort: 2, comments: [] },
      { id: "2d", task_id: "2", name: "선적 및 B/L 발행", status: "todo", sort: 3, comments: [] },
    ] },
  { id: "3", title: "일본 K-뷰티 화장품 라벨 현지화", country: "JP · 화장품", field: "마케팅", assignee: "한소희", priority: "보통", due: "2026-07-28", status: "doing", created_at: "",
    stages: [
      { id: "3a", task_id: "3", name: "전성분 일본어 표기 검수", status: "done", sort: 0, comments: [] },
      { id: "3b", task_id: "3", name: "약기법 라벨 규정 반영", status: "doing", sort: 1, comments: [{ id: "c6", stage_id: "3b", author: "한소희", init: "한", avatar_bg: "#D14D8B", body: "7월 시행 신규 라벨링 규정 반영 중입니다.", created_at: "7/8 16:30" }] },
      { id: "3c", task_id: "3", name: "현지 파트너 최종 승인", status: "todo", sort: 2, comments: [] },
    ] },
  { id: "4", title: "중국 헬스케어 인프라 공급 계약", country: "CN · 장비", field: "계약", assignee: "최민수", priority: "높음", due: "2026-08-05", status: "todo", created_at: "",
    stages: [
      { id: "4a", task_id: "4", name: "파트너사 실사 및 견적", status: "done", sort: 0, comments: [] },
      { id: "4b", task_id: "4", name: "계약 조건 협의", status: "doing", sort: 1, comments: [{ id: "c7", stage_id: "4b", author: "최민수", init: "최", avatar_bg: "#7A4DD1", body: "결제 조건 T/T 30% 선급 협의 중.", created_at: "7/7 13:10" }] },
      { id: "4c", task_id: "4", name: "계약서 작성 및 검토", status: "todo", sort: 2, comments: [] },
      { id: "4d", task_id: "4", name: "계약 체결", status: "todo", sort: 3, comments: [] },
    ] },
  { id: "5", title: "태국 유통 IT 플랫폼 기획", country: "TH · IT", field: "IT", assignee: "지경준", priority: "보통", due: "2026-08-20", status: "doing", created_at: "",
    stages: [
      { id: "5a", task_id: "5", name: "요구사항 정의", status: "done", sort: 0, comments: [] },
      { id: "5b", task_id: "5", name: "화면 설계 / 프로토타입", status: "doing", sort: 1, comments: [] },
      { id: "5c", task_id: "5", name: "개발 착수", status: "todo", sort: 2, comments: [] },
    ] },
  { id: "6", title: "월간 수출 실적 리포트 작성", country: "전사", field: "영업", assignee: "김서연", priority: "보통", due: "2026-07-31", status: "todo", created_at: "",
    stages: [
      { id: "6a", task_id: "6", name: "데이터 취합", status: "todo", sort: 0, comments: [] },
      { id: "6b", task_id: "6", name: "리포트 작성", status: "todo", sort: 1, comments: [] },
    ] },
];

export const demoConversations: (Conversation & { messages: (Partial<Message> & { me?: boolean })[]; online?: boolean; unread?: number; last?: string })[] = [
  { id: "0", name: "전사 단톡방", is_group: true, role_label: "", init: "전", avatar_bg: "#0C0F0D", members: 7, sort: 0, created_at: "", online: true, unread: 3, last: "오후 2:12",
    messages: [
      { author: "이일형", init: "이", avatar_bg: "#0C0F0D", body: "다들 이번 주 태국 필러 선적 건 잘 챙겨주세요. 회사 첫 독점 공급 물량입니다.", created_at: "오전 9:02" },
      { author: "최민수", init: "최", avatar_bg: "#7A4DD1", body: "네 대표님, PL/CI 오늘 전자결재로 상신했습니다.", created_at: "오전 9:10" },
      { author: "박지원", init: "박", avatar_bg: "#0E7B4E", body: "중국 NMPA 라벨 재제출 건도 금주 마무리 예정입니다.", created_at: "오전 9:15" },
      { me: true, body: "수출서류 결재는 제가 오늘 중 확인하고 날인하겠습니다.", created_at: "오전 9:20" },
      { author: "한소희", init: "한", avatar_bg: "#D14D8B", body: "일본 화장품 라벨 규정 변경분 공지에 올려뒀어요 :)", created_at: "오후 2:12" },
    ] },
  { id: "1", name: "최민수", is_group: false, role_label: "해외영업 팀장", init: "최", avatar_bg: "#7A4DD1", members: 0, sort: 1, created_at: "", online: true, unread: 0, last: "오후 2:05",
    messages: [
      { me: false, body: "태국 필러 선적 건 PL/CI 오늘 중으로 마무리 가능할까요?", created_at: "오후 1:58" },
      { me: true, body: "네, 인보이스 CIF 단가로 통일해서 초안 완료했습니다. 검토 부탁드려요.", created_at: "오후 2:03" },
      { me: false, body: "좋아요. 통관 서류는 정우성 대리랑 같이 챙겨주세요.", created_at: "오후 2:05" },
    ] },
  { id: "2", name: "박지원", is_group: false, role_label: "RA 담당", init: "박", avatar_bg: "#0E7B4E", members: 0, sort: 2, created_at: "", online: true, unread: 2, last: "오전 9:22",
    messages: [
      { me: false, body: "NMPA 본심사에서 라벨 샘플 재제출 요청 왔습니다.", created_at: "오전 9:20" },
      { me: false, body: "디자인팀에 수정 요청 넣어주실 수 있을까요?", created_at: "오전 9:22" },
    ] },
  { id: "3", name: "한소희", is_group: false, role_label: "마케팅", init: "한", avatar_bg: "#D14D8B", members: 0, sort: 3, created_at: "", online: false, unread: 0, last: "어제",
    messages: [
      { me: false, body: "일본 라벨 규정 변경 공지 확인하셨죠?", created_at: "어제 오후 5:10" },
      { me: true, body: "네 확인했어요. 과제에 반영해뒀습니다 👍", created_at: "어제 오후 5:30" },
    ] },
  { id: "4", name: "정우성", is_group: false, role_label: "물류", init: "정", avatar_bg: "#C6803A", members: 0, sort: 4, created_at: "", online: false, unread: 0, last: "어제",
    messages: [
      { me: true, body: "태국 선적 재고 배정 완료됐나요?", created_at: "어제 오전 11:02" },
      { me: false, body: "네 5,000ea 확보 완료했습니다.", created_at: "어제 오전 11:15" },
    ] },
  { id: "5", name: "김서연", is_group: false, role_label: "해외영업", init: "김", avatar_bg: "#2A6FDB", members: 0, sort: 5, created_at: "", online: true, unread: 0, last: "월요일",
    messages: [{ me: false, body: "월간 수출 실적 리포트 양식 공유 가능할까요?", created_at: "월 오후 3:00" }] },
];

export const demoMails: Mail[] = [
  { id: "1", owner_id: null, folder: "inbox", from_name: "Bangkok MediTrade", from_email: "somchai@bkkmeditrade.co.th", from_init: "B", avatar_bg: "#D14D8B", to_addr: "", subject: "Re: 7월 필러 선적 일정 확인", preview: "Dear Mr. Ji, We confirm the shipment schedule for 5,000ea...", body: "Dear Mr. Ji,\n\nWe confirm the shipment schedule for 5,000ea dermal filler on July 14. Please send us the final Packing List and Commercial Invoice so we can prepare customs clearance in Bangkok.\n\nBest regards,\nSomchai Prasert\nBangkok MediTrade Co., Ltd.", unread: true, starred: true, attachments: [], sent_at: "2026-07-10T15:24:00" },
  { id: "2", owner_id: null, folder: "inbox", from_name: "박지원 (RA팀)", from_email: "jiwon.park@bio-lj.com", from_init: "박", avatar_bg: "#0E7B4E", to_addr: "", subject: "NMPA 본심사 라벨 재제출 요청 건", preview: "NMPA에서 라벨 샘플 재제출 요청이 왔습니다. 수정본 첨부...", body: "대표님,\n\nNMPA 본심사에서 라벨 샘플 재제출 요청이 접수되었습니다. 디자인팀 수정본을 첨부하니 검토 후 회신 부탁드립니다.\n\n박지원 드림", unread: true, starred: false, attachments: [{ name: "NMPA_라벨_수정본_v2.pdf" }], sent_at: "2026-07-09T09:22:00" },
  { id: "3", owner_id: null, folder: "inbox", from_name: "대한바이오켐", from_email: "sales@dhbiochem.co.kr", from_init: "대", avatar_bg: "#2A6FDB", to_addr: "", subject: "히알루론산 원료 견적서 송부", preview: "요청하신 5,000L 견적서를 첨부합니다. 단가/납기 확인 요청...", body: "안녕하세요,\n\n요청하신 히알루론산 원료 5,000L 견적서를 첨부합니다. 단가 및 납기 확인 후 회신 부탁드립니다.\n\n대한바이오켐 영업팀 드림", unread: false, starred: false, attachments: [{ name: "견적서_HA원료_5000L.xlsx" }], sent_at: "2026-07-08T13:10:00" },
  { id: "4", owner_id: null, folder: "inbox", from_name: "경영지원 시스템", from_email: "noreply@bio-lj.com", from_init: "경", avatar_bg: "#84908A", to_addr: "", subject: "[시스템] 전자결재 승인 알림", preview: "상하이 보세창고 임대료 지출 결의가 승인되었습니다.", body: "전자결재 알림\n\n상하이 보세창고 임대료 3분기 지출 결의 (LJ-AP-2026-0001) 가 대표이사 승인 및 날인 완료되었습니다.", unread: false, starred: false, attachments: [], sent_at: "2026-07-08T11:02:00" },
  { id: "5", owner_id: null, folder: "sent", from_name: "지경준", from_email: "kyungjun.ji@bio-lj.com", from_init: "지", avatar_bg: "#0E7B4E", to_addr: "somchai@bkkmeditrade.co.th", subject: "PL / CI 최종본 송부", preview: "Attached are the final PL and CI for the July 14 shipment...", body: "Dear Somchai,\n\nAttached are the final Packing List and Commercial Invoice for the July 14 shipment. Please confirm the documents.\n\nBest regards,\nKyungjun Ji", unread: false, starred: false, attachments: [{ name: "PL_CI_20260714.pdf" }], sent_at: "2026-07-10T16:05:00" },
  { id: "6", owner_id: null, folder: "drafts", from_name: "지경준", from_email: "kyungjun.ji@bio-lj.com", from_init: "지", avatar_bg: "#0E7B4E", to_addr: "", subject: "8월 수출 일정 공유 (작성 중)", preview: "초안 작성 중…", body: "", unread: false, starred: false, attachments: [], sent_at: "2026-07-11T10:30:00" },
];

// 전자결재 시드 데이터는 제거되었습니다 (임시 데이터). 상신하면 채워집니다.
export const demoApprovals: Approval[] = [];

export const demoPartners: Partner[] = [
  { id: "1", name: "Bangkok MediTrade Co., Ltd.", rep: "Somchai Prasert", biz_no: "0105-556-7788", biz_type: "도소매", biz_item: "의료기기 · 화장품", address: "128 Silom Rd, Bang Rak, Bangkok, Thailand", phone: "+66-2-123-4567", contact_name: "김서연", contact_email: "seoyeon.kim@bio-lj.com", deal_type: "매출", seg_id: "cosmexp", contract_type: "독점 판매계약서", memo: "태국 필러 독점 유통 파트너.", docs: { bizReg: { name: "BKK_MediTrade_사업자등록증.pdf" }, bankbook: null, contract: { name: "독점공급계약서_최종.pdf" } }, created_at: "2026-06-20" },
  { id: "2", name: "대한바이오켐(주)", rep: "이정호", biz_no: "214-88-01234", biz_type: "제조", biz_item: "화장품 원료", address: "경기도 안산시 단원구 산단로 123", phone: "031-486-1200", contact_name: "한소희", contact_email: "sohee.han@bio-lj.com", deal_type: "매입", seg_id: "cosmexp", contract_type: "표준 공급계약서", memo: "히알루론산 원료 공급사.", docs: { bizReg: { name: "대한바이오켐_사업자등록증.jpg" }, bankbook: { name: "대한바이오켐_통장사본.jpg" }, contract: null }, created_at: "2026-06-15" },
  { id: "3", name: "上海 헬스로지스틱스", rep: "Wang Lei", biz_no: "91310000-0000", biz_type: "물류", biz_item: "보세창고 · 운송", address: "Pudong New Area, Shanghai, China", phone: "+86-21-5555-0000", contact_name: "정우성", contact_email: "wooseong.jung@bio-lj.com", deal_type: "매입", seg_id: "pharmexp", contract_type: "물류·운송 계약서", memo: "상하이 보세창고 운영.", docs: { bizReg: null, bankbook: null, contract: { name: "물류위탁계약서_2026.pdf" } }, created_at: "2026-05-30" },
  { id: "4", name: "서울종합약품 도매", rep: "박상현", biz_no: "110-81-45678", biz_type: "도매", biz_item: "의약품", address: "서울특별시 중구 을지로 145", phone: "02-2233-4455", contact_name: "김서연", contact_email: "seoyeon.kim@bio-lj.com", deal_type: "매출", seg_id: "wholesale", contract_type: "표준 공급계약서", memo: "국내 의약품 도매 거래처.", docs: { bizReg: { name: "서울종합약품_사업자등록증.pdf" }, bankbook: { name: "통장사본.jpg" }, contract: { name: "공급계약서.pdf" } }, created_at: "2026-06-01" },
];

export const demoFiles: FileRow[] = [
  { id: "1", name: "중국_NMPA_인허가신청서_v3.pdf", ext: "PDF", category: "인허가", seg_id: "deviceexp", size: "2.4 MB", uploader: "박지원", storage_path: null, created_at: "2026-07-09" },
  { id: "2", name: "태국_필러_PackingList_20260714.xlsx", ext: "XLS", category: "수출서류", seg_id: "cosmexp", size: "184 KB", uploader: "정우성", storage_path: null, created_at: "2026-07-09" },
  { id: "3", name: "Commercial_Invoice_태국_5000ea.pdf", ext: "PDF", category: "수출서류", seg_id: "cosmexp", size: "96 KB", uploader: "최민수", storage_path: null, created_at: "2026-07-09" },
  { id: "4", name: "일본_화장품_라벨_가이드_2026.pdf", ext: "PDF", category: "규정", seg_id: "cosmexp", size: "5.1 MB", uploader: "한소희", storage_path: null, created_at: "2026-07-08" },
  { id: "5", name: "2026_수출_표준계약서_템플릿.docx", ext: "DOC", category: "계약", seg_id: "pharmexp", size: "312 KB", uploader: "지경준", storage_path: null, grade: 2, allowed: [], created_at: "2026-07-06" },
  { id: "6", name: "중국_헬스케어_공급_견적서.xlsx", ext: "XLS", category: "견적", seg_id: "deviceexp", size: "241 KB", uploader: "최민수", storage_path: null, created_at: "2026-07-05" },
  { id: "7", name: "국내_의약품_공급계약_20260701.pdf", ext: "PDF", category: "거래계약", seg_id: "wholesale", size: "420 KB", uploader: "지경준", storage_path: null, grade: 1, allowed: ["minsu.choi@bio-lj.com"], partner: "서울종합약품 도매", created_at: "2026-07-01" },
  { id: "8", name: "유통ERP_구축_제안서_v2.pptx", ext: "DOC", category: "견적", seg_id: "itconsult", size: "3.8 MB", uploader: "지경준", storage_path: null, created_at: "2026-07-03" },
  { id: "9", name: "의약품_도매_거래처_단가표_3Q.xlsx", ext: "XLS", category: "견적", seg_id: "wholesale", size: "156 KB", uploader: "김서연", storage_path: null, created_at: "2026-06-30" },
];

export const demoLeaves: Leave[] = [
  { id: "1", name: "최민수", dept: "해외영업", init: "최", avatar_bg: "#7A4DD1", type: "출장", range: "7/18 ~ 7/20", days: "3일", status: "pending", created_at: "" },
  { id: "2", name: "한소희", dept: "마케팅", init: "한", avatar_bg: "#D14D8B", type: "연차", range: "8/1 ~ 8/2", days: "2일", status: "pending", created_at: "" },
  { id: "3", name: "김서연", dept: "해외영업", init: "김", avatar_bg: "#2A6FDB", type: "연차", range: "7/24", days: "1일", status: "approved", created_at: "" },
  { id: "4", name: "정우성", dept: "물류", init: "정", avatar_bg: "#C6803A", type: "반차", range: "7/16 오후", days: "0.5일", status: "approved", created_at: "" },
  { id: "5", name: "박지원", dept: "RA", init: "박", avatar_bg: "#0E7B4E", type: "출장", range: "7/29 ~ 7/30", days: "2일", status: "approved", created_at: "" },
];

export const demoEvents: (CalendarEvent & { day: string; mon: string })[] = [
  { id: "1", title: "중국 파트너사 화상회의", type: "회의", event_date: "2026-07-11", day: "11", mon: "JUL", time: "오후 3:00", created_at: "" },
  { id: "2", title: "태국 필러 선적 마감", type: "마감", event_date: "2026-07-14", day: "14", mon: "JUL", time: "종일", created_at: "" },
  { id: "3", title: "전자결재 시스템 점검", type: "점검", event_date: "2026-07-15", day: "15", mon: "JUL", time: "오전 2:00", created_at: "" },
  { id: "4", title: "일본 출장 (최민수 팀장)", type: "출장", event_date: "2026-07-18", day: "18", mon: "JUL", time: "3일간", created_at: "" },
  { id: "5", title: "NMPA 본심사 자료 제출", type: "제출", event_date: "2026-07-22", day: "22", mon: "JUL", time: "오후 5:00", created_at: "" },
  { id: "6", title: "월간 영업 전략 회의", type: "회의", event_date: "2026-07-25", day: "25", mon: "JUL", time: "오전 10:00", created_at: "" },
];

export const demoInquiries: Inquiry[] = [
  { id: "1", name: "김도현", company: "메디팜 코리아", email: "dohyun.kim@medipharm.co.kr", phone: "010-2345-6789", type: "제휴·유통", message: "귀사의 태국·중국 유통 네트워크를 통한 당사 제품 수출 협업을 문의드립니다. 미팅 가능한 일정 회신 부탁드립니다.", status: "new", created_at: "2026-07-11T09:20:00" },
  { id: "2", name: "Sarah Chen", company: "Shanghai HealthLink", email: "sarah.chen@healthlink.cn", phone: "+86-21-8888-1234", type: "글로벌 진출", message: "We are interested in distributing Korean cosmetic-medical products in China. Please share your partnership terms.", status: "read", created_at: "2026-07-10T16:05:00" },
  { id: "3", name: "박성우", company: "그린바이오", email: "sw.park@greenbio.kr", phone: "010-9876-5432", type: "의약품 허가", message: "의약품 인허가(RA) 컨설팅 견적을 요청드립니다. 품목은 점안액 2종입니다.", status: "replied", created_at: "2026-07-09T11:30:00" },
];
