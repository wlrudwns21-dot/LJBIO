import type { ComponentType } from "react";
import Dashboard from "./Dashboard";
import Notices from "./Notices";
import Inquiries from "./Inquiries";
import Tasks from "./Tasks";
import Schedule from "./Schedule";
import Chat from "./Chat";
import Mail from "./Mail";
import Approvals from "./Approvals";
import Docs from "./Docs";
import Finance from "./Finance";
import Partners from "./Partners";
import Files from "./Files";
import Hr from "./Hr";
import Admin from "./Admin";

export type SectionKey =
  | "dashboard"
  | "notices"
  | "inquiries"
  | "tasks"
  | "schedule"
  | "chat"
  | "mail"
  | "approvals"
  | "docs"
  | "finance"
  | "partners"
  | "files"
  | "hr"
  | "admin";

export interface SectionDef {
  key: SectionKey;
  icon: string;
  nav: string;
  title: string;
  sub: string;
  /** which nav-badge counter to display, if any */
  badge?: "chat" | "mail" | "approvals" | "hr" | "admin" | "inquiries";
  Component: ComponentType;
}

/** Order + metadata mirror the prototype's navDefs / secMeta. */
export const SECTIONS: SectionDef[] = [
  { key: "dashboard", icon: "▦", nav: "대시보드", title: "대시보드", sub: "오늘의 업무 현황을 한눈에", Component: Dashboard },
  { key: "notices", icon: "📢", nav: "공지사항", title: "공지사항", sub: "전사 주요 소식 및 규정 안내", Component: Notices },
  { key: "inquiries", icon: "📬", nav: "고객 문의", title: "고객 문의", sub: "홈페이지 문의하기 접수 · 응대", badge: "inquiries", Component: Inquiries },
  { key: "tasks", icon: "✓", nav: "업무 과제", title: "업무 과제 관리", sub: "과제별 단계 진행과 코멘트", Component: Tasks },
  { key: "schedule", icon: "📅", nav: "일정 관리", title: "일정 관리", sub: "팀 일정과 마감 캘린더", Component: Schedule },
  { key: "chat", icon: "💬", nav: "메시지", title: "메시지", sub: "전사 단톡방과 1:1 대화", badge: "chat", Component: Chat },
  { key: "mail", icon: "✉", nav: "메일", title: "메일", sub: "구글 메일 연동 · 사내·거래처 메일함", badge: "mail", Component: Mail },
  { key: "approvals", icon: "🖋", nav: "전자결재", title: "전자결재", sub: "문서 상신 · 승인 및 날인 관리", badge: "approvals", Component: Approvals },
  { key: "docs", icon: "📄", nav: "문서 생성", title: "문서 자동 생성", sub: "수출입 서류를 자동으로 작성", Component: Docs },
  { key: "finance", icon: "📊", nav: "재무 현황", title: "재무 현황", sub: "사업 부문별 매출 · 주문 현황", Component: Finance },
  { key: "partners", icon: "🏢", nav: "거래처 관리", title: "거래처 관리", sub: "거래처 정보 · 사업자등록증 · 계약", Component: Partners },
  { key: "files", icon: "📁", nav: "파일 관리", title: "파일 관리", sub: "사업 부문별 업무 문서 저장소", Component: Files },
  { key: "hr", icon: "🏖", nav: "근태 · HR", title: "근태 · HR", sub: "휴가 및 출장 관리", badge: "hr", Component: Hr },
  { key: "admin", icon: "⚙", nav: "관리자", title: "관리자", sub: "계정 · 사업 부문 · 계약유형 · 직인 관리", badge: "admin", Component: Admin },
];
