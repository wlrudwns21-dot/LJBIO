// Hand-written row types matching supabase/migrations/0001_schema.sql.
// (You can later replace this with `supabase gen types typescript`.)

export type Role = "staff" | "manager" | "admin";
export type ApprovalStatus = "pending" | "approved" | "rejected";

export interface Profile {
  id: string;
  user_id: string | null;
  name: string;
  email: string;
  dept: string;
  role: Role;
  status: ApprovalStatus;
  init: string | null;
  avatar_bg: string;
  created_at: string;
}

export interface Segment {
  id: string;
  name: string;
  color: string;
  orders: number;
  revenue: number;
  sort: number;
  created_at: string;
}

export interface Notice {
  id: string;
  tag: string;
  title: string;
  body: string;
  author: string;
  created_at: string;
}

export type StageStatus = "todo" | "doing" | "done";
export type TaskStatus = "todo" | "doing" | "review" | "done";

export interface Task {
  id: string;
  title: string;
  country: string;
  field: string;
  assignee: string;
  priority: "긴급" | "높음" | "보통";
  due: string | null;
  /** 칸반 상태(대기/진행중/검토/완료). 담당자가 직접 지정합니다. */
  status: TaskStatus;
  created_at: string;
}

export interface TaskStage {
  id: string;
  task_id: string;
  name: string;
  status: StageStatus;
  sort: number;
}

export interface TaskComment {
  id: string;
  stage_id: string;
  author: string;
  init: string | null;
  avatar_bg: string;
  body: string;
  created_at: string;
}

export interface TaskFull extends Task {
  stages: (TaskStage & { comments: TaskComment[] })[];
}

export interface Conversation {
  id: string;
  name: string;
  is_group: boolean;
  role_label: string;
  init: string | null;
  avatar_bg: string;
  members: number;
  sort: number;
  created_at: string;
}

export interface Message {
  id: string;
  conversation_id: string;
  sender_id: string | null;
  author: string;
  init: string | null;
  avatar_bg: string;
  body: string;
  created_at: string;
}

export interface Attachment {
  name: string;
  url?: string;
}

export interface Mail {
  id: string;
  owner_id: string | null;
  folder: "inbox" | "sent" | "drafts" | "trash";
  from_name: string;
  from_email: string;
  from_init: string | null;
  avatar_bg: string;
  to_addr: string;
  subject: string;
  preview: string;
  body: string;
  unread: boolean;
  starred: boolean;
  attachments: Attachment[];
  sent_at: string;
}

export interface Approval {
  id: string;
  seq: number;
  type: string;
  title: string;
  seg_id: string | null;
  drafter: string;
  drafter_id: string | null;
  d_init: string | null;
  d_bg: string;
  amount: string;
  due: string | null;
  content: string;
  status: ApprovalStatus;
  approver: string | null;
  approved_at: string | null;
  created_at: string;
}

export interface ContractType {
  id: string;
  name: string;
  sort: number;
  /** Uploaded template file (stored as a base64 data URL) + its filename. */
  template_url?: string | null;
  template_name?: string | null;
}

export interface PartnerDocs {
  bizReg: Attachment | null;
  bankbook: Attachment | null;
  contract: Attachment | null;
}

export interface Partner {
  id: string;
  name: string;
  rep: string;
  biz_no: string;
  biz_type: string;
  biz_item: string;
  address: string;
  phone: string;
  contact_name: string;
  contact_email: string;
  deal_type: "매출" | "매입";
  seg_id: string | null;
  contract_type: string;
  memo: string;
  docs: PartnerDocs;
  created_at: string;
}

export interface FileRow {
  id: string;
  name: string;
  ext: string;
  category: string;
  seg_id: string | null;
  size: string;
  uploader: string;
  storage_path: string | null;
  created_at: string;
}

export interface Leave {
  id: string;
  name: string;
  dept: string;
  init: string | null;
  avatar_bg: string;
  type: string;
  range: string;
  days: string;
  status: ApprovalStatus;
  created_at: string;
}

export interface Inquiry {
  id: string;
  name: string;
  company: string;
  email: string;
  phone: string;
  type: string;
  message: string;
  status: "new" | "read" | "replied" | "archived";
  created_at: string;
}

export interface CalendarEvent {
  id: string;
  title: string;
  type: string;
  event_date: string | null;
  day: string | null;
  mon: string | null;
  time: string;
  created_at: string;
}
