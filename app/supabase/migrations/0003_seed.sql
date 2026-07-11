-- ============================================================================
-- LJ-BIO portal — seed data (from the prototype). Runs as migration owner,
-- so RLS is bypassed. Idempotent-ish: guarded by "on conflict do nothing"
-- where practical. Safe to run on a fresh database.
-- ============================================================================

-- --- employee directory (no auth linkage yet; people claim rows on signup) ---
insert into public.profiles (name, email, dept, role, status, init, avatar_bg) values
  ('이일형', 'ilhyung.lee@bio-lj.com',  '대표이사',     'admin',   'approved', '이', '#0C0F0D'),
  ('지경준', 'kyungjun.ji@bio-lj.com',  '경영지원',     'admin',   'approved', '지', '#0E7B4E'),
  ('최민수', 'minsu.choi@bio-lj.com',   '해외영업',     'manager', 'approved', '최', '#7A4DD1'),
  ('박지원', 'jiwon.park@bio-lj.com',   'RA (인허가)',  'manager', 'approved', '박', '#2A6FDB'),
  ('김서연', 'seoyeon.kim@bio-lj.com',  '해외영업',     'staff',   'approved', '김', '#C6803A'),
  ('정우성', 'wooseong.jung@bio-lj.com','물류',         'staff',   'approved', '정', '#D14D8B'),
  ('한소희', 'sohee.han@bio-lj.com',    '마케팅',       'staff',   'approved', '한', '#1E9E5A'),
  -- pending signup requests (Admin → 계정 승인)
  ('윤채원', 'chaewon.yoon@bio-lj.com', '해외영업팀',   'staff',   'pending',  '윤', '#2A6FDB'),
  ('강태호', 'taeho.kang@bio-lj.com',   '물류팀',       'staff',   'pending',  '강', '#C6803A'),
  ('이하늘', 'haneul.lee@bio-lj.com',   'RA팀',         'manager', 'pending',  '이', '#0E7B4E')
on conflict (email) do nothing;

-- --- segments (사업 부문) + finance ------------------------------------------
insert into public.segments (id, name, color, orders, revenue, sort) values
  ('wholesale', '의약품 도매',    '#2A6FDB', 342, 4820000000, 0),
  ('pharmexp',  '의약품 수출',    '#0E7B4E', 128, 3160000000, 1),
  ('cosmexp',   '화장품 수출',    '#D14D8B', 210, 1875000000, 2),
  ('deviceexp', '의료기기 수출',  '#C6803A', 46,  2240000000, 3),
  ('itconsult', 'IT 컨설팅',      '#7A4DD1', 18,  640000000,  4)
on conflict (id) do nothing;

-- --- contract types ----------------------------------------------------------
insert into public.contract_types (name, sort) values
  ('표준 공급계약서', 0), ('독점 판매계약서', 1), ('위탁 판매계약서', 2),
  ('비밀유지계약서 (NDA)', 3), ('물류·운송 계약서', 4);

-- --- notices -----------------------------------------------------------------
insert into public.notices (tag, title, body, author, created_at) values
  ('중요',   '2026 하반기 중국 의료기기 수출 인허가 일정 공지', 'NMPA 등록 갱신 및 신규 신청 일정이 확정되었습니다. 하반기 수출 예정 품목은 7월 22일까지 서류를 제출해 주시기 바랍니다.', 'RA팀 박지원', '2026-07-09'),
  ('계약',   '태국 필러 제품 신규 파트너사 계약 체결 안내', '방콕 소재 유통 파트너사와 독점 공급 계약을 체결했습니다. 초도 물량 5,000ea 선적이 7월 14일 예정입니다.', '해외영업 최민수', '2026-07-08'),
  ('규정',   '일본 화장품 수출 라벨링 규정 변경 (7월 시행)', '일본 약기법 개정에 따라 전성분 표기 및 주의사항 라벨 양식이 변경됩니다. 7월 이후 선적 물량부터 적용됩니다.', '마케팅 한소희', '2026-07-05'),
  ('시스템', '사내 전자결재 시스템 정기 점검 안내 (7/15)', '7월 15일 오전 2시~4시 시스템 점검이 진행됩니다. 해당 시간 결재 및 문서 생성이 일시 중단됩니다.', '경영지원 지경준', '2026-07-04'),
  ('인사',   '2026년 여름 휴가 신청 안내', '7~8월 여름 휴가 신청을 받습니다. 근태·HR 메뉴에서 신청해 주시고, 팀별 업무 공백이 없도록 협의 바랍니다.', '경영지원 지경준', '2026-07-01');

-- --- tasks + stages + comments ----------------------------------------------
insert into public.tasks (title, country, field, assignee, priority, due) values
  ('중국 첨단 의료기기 NMPA 인허가',        'CN · 의료기기', '인허가',   '박지원', '긴급', '2026-07-22'),
  ('태국 필러 제품 수출 선적 (5,000ea)',    'TH · 필러',     '물류',     '정우성', '높음', '2026-07-14'),
  ('일본 K-뷰티 화장품 라벨 현지화',        'JP · 화장품',   '마케팅',   '한소희', '보통', '2026-07-28'),
  ('중국 헬스케어 인프라 공급 계약',        'CN · 장비',     '계약',     '최민수', '높음', '2026-08-05'),
  ('태국 유통 IT 플랫폼 기획',              'TH · IT',       'IT',       '지경준', '보통', '2026-08-20'),
  ('월간 수출 실적 리포트 작성',            '전사',          '영업',     '김서연', '보통', '2026-07-31');

insert into public.task_stages (task_id, name, status, sort)
select t.id, s.name, s.status, s.sort from public.tasks t join (values
  ('중국 첨단 의료기기 NMPA 인허가', '제품 기술문서 준비',   'done',  0),
  ('중국 첨단 의료기기 NMPA 인허가', 'NMPA 사전 적합성 검토','done',  1),
  ('중국 첨단 의료기기 NMPA 인허가', '본심사 신청 및 대응',  'doing', 2),
  ('중국 첨단 의료기기 NMPA 인허가', '등록증 발급',          'todo',  3),
  ('태국 필러 제품 수출 선적 (5,000ea)', '발주 확인 및 재고 배정', 'done',  0),
  ('태국 필러 제품 수출 선적 (5,000ea)', 'PL / CI 서류 작성',      'doing', 1),
  ('태국 필러 제품 수출 선적 (5,000ea)', '수출 통관 서류 제출',    'todo',  2),
  ('태국 필러 제품 수출 선적 (5,000ea)', '선적 및 B/L 발행',       'todo',  3),
  ('일본 K-뷰티 화장품 라벨 현지화', '전성분 일본어 표기 검수', 'done',  0),
  ('일본 K-뷰티 화장품 라벨 현지화', '약기법 라벨 규정 반영',   'doing', 1),
  ('일본 K-뷰티 화장품 라벨 현지화', '현지 파트너 최종 승인',   'todo',  2),
  ('중국 헬스케어 인프라 공급 계약', '파트너사 실사 및 견적', 'done',  0),
  ('중국 헬스케어 인프라 공급 계약', '계약 조건 협의',        'doing', 1),
  ('중국 헬스케어 인프라 공급 계약', '계약서 작성 및 검토',   'todo',  2),
  ('중국 헬스케어 인프라 공급 계약', '계약 체결',             'todo',  3),
  ('태국 유통 IT 플랫폼 기획', '요구사항 정의',        'done',  0),
  ('태국 유통 IT 플랫폼 기획', '화면 설계 / 프로토타입','doing', 1),
  ('태국 유통 IT 플랫폼 기획', '개발 착수',            'todo',  2),
  ('월간 수출 실적 리포트 작성', '데이터 취합', 'todo', 0),
  ('월간 수출 실적 리포트 작성', '리포트 작성', 'todo', 1)
) as s(task_title, name, status, sort) on t.title = s.task_title;

insert into public.task_comments (stage_id, author, init, avatar_bg, body, created_at)
select ts.id, c.author, c.init, c.av_bg, c.body, now() from public.task_stages ts
join public.tasks t on ts.task_id = t.id
join (values
  ('중국 첨단 의료기기 NMPA 인허가', '제품 기술문서 준비',    '박지원', '박', '#0E7B4E', '기술문서 및 시험성적서 번역본 첨부 완료했습니다.'),
  ('중국 첨단 의료기기 NMPA 인허가', 'NMPA 사전 적합성 검토', '지경준', '지', '#2A6FDB', '현지 대행사 검토 통과. 본심사 진행합시다.'),
  ('중국 첨단 의료기기 NMPA 인허가', '본심사 신청 및 대응',   '박지원', '박', '#0E7B4E', '추가 자료 요청 대응 중 — 라벨 샘플 재제출 필요.'),
  ('태국 필러 제품 수출 선적 (5,000ea)', '발주 확인 및 재고 배정', '정우성', '정', '#C6803A', '5,000ea 재고 확보 완료.'),
  ('태국 필러 제품 수출 선적 (5,000ea)', 'PL / CI 서류 작성',      '최민수', '최', '#7A4DD1', '인보이스 단가 CIF 기준으로 통일 부탁해요.'),
  ('일본 K-뷰티 화장품 라벨 현지화', '약기법 라벨 규정 반영', '한소희', '한', '#D14D8B', '7월 시행 신규 라벨링 규정 반영 중입니다.'),
  ('중국 헬스케어 인프라 공급 계약', '계약 조건 협의',        '최민수', '최', '#7A4DD1', '결제 조건 T/T 30% 선급 협의 중.')
) as c(task_title, stage_name, author, init, av_bg, body)
  on t.title = c.task_title and ts.name = c.stage_name;

-- --- conversations + messages ------------------------------------------------
insert into public.conversations (name, is_group, role_label, init, avatar_bg, members, sort) values
  ('전사 단톡방', true,  '',            '전', '#0C0F0D', 7, 0),
  ('최민수',      false, '해외영업 팀장','최', '#7A4DD1', 0, 1),
  ('박지원',      false, 'RA 담당',      '박', '#0E7B4E', 0, 2),
  ('한소희',      false, '마케팅',       '한', '#D14D8B', 0, 3),
  ('정우성',      false, '물류',         '정', '#C6803A', 0, 4),
  ('김서연',      false, '해외영업',     '김', '#2A6FDB', 0, 5);

insert into public.messages (conversation_id, author, init, avatar_bg, body, created_at)
select c.id, m.author, m.init, m.av_bg, m.body, now() + (m.ord || ' seconds')::interval
from public.conversations c join (values
  ('전사 단톡방', '이일형', '이', '#0C0F0D', '다들 이번 주 태국 필러 선적 건 잘 챙겨주세요. 회사 첫 독점 공급 물량입니다.', 1),
  ('전사 단톡방', '최민수', '최', '#7A4DD1', '네 대표님, PL/CI 오늘 전자결재로 상신했습니다.', 2),
  ('전사 단톡방', '박지원', '박', '#0E7B4E', '중국 NMPA 라벨 재제출 건도 금주 마무리 예정입니다.', 3),
  ('전사 단톡방', '지경준', '지', '#0E7B4E', '수출서류 결재는 제가 오늘 중 확인하고 날인하겠습니다.', 4),
  ('전사 단톡방', '한소희', '한', '#D14D8B', '일본 화장품 라벨 규정 변경분 공지에 올려뒀어요 :)', 5),
  ('최민수', '최민수', '최', '#7A4DD1', '태국 필러 선적 건 PL/CI 오늘 중으로 마무리 가능할까요?', 1),
  ('최민수', '지경준', '지', '#0E7B4E', '네, 인보이스 CIF 단가로 통일해서 초안 완료했습니다. 검토 부탁드려요.', 2),
  ('최민수', '최민수', '최', '#7A4DD1', '좋아요. 통관 서류는 정우성 대리랑 같이 챙겨주세요.', 3),
  ('박지원', '박지원', '박', '#0E7B4E', 'NMPA 본심사에서 라벨 샘플 재제출 요청 왔습니다.', 1),
  ('박지원', '박지원', '박', '#0E7B4E', '디자인팀에 수정 요청 넣어주실 수 있을까요?', 2),
  ('한소희', '한소희', '한', '#D14D8B', '일본 라벨 규정 변경 공지 확인하셨죠?', 1),
  ('한소희', '지경준', '지', '#0E7B4E', '네 확인했어요. 과제에 반영해뒀습니다 👍', 2),
  ('정우성', '지경준', '지', '#0E7B4E', '태국 선적 재고 배정 완료됐나요?', 1),
  ('정우성', '정우성', '정', '#C6803A', '네 5,000ea 확보 완료했습니다.', 2),
  ('김서연', '김서연', '김', '#2A6FDB', '월간 수출 실적 리포트 양식 공유 가능할까요?', 1)
) as m(conv, author, init, av_bg, body, ord) on c.name = m.conv;

-- --- mails (지경준's mailbox) ------------------------------------------------
insert into public.mails (owner_id, folder, from_name, from_email, from_init, avatar_bg, to_addr, subject, preview, body, unread, starred, attachments, sent_at)
select p.id, x.folder, x.from_name, x.from_email, x.from_init, x.av_bg, x.to_addr, x.subject, x.preview, x.body, x.unread, x.starred, x.attachments::jsonb, x.sent_at::timestamptz
from public.profiles p join (values
  ('inbox',  'Bangkok MediTrade', 'somchai@bkkmeditrade.co.th', 'B', '#D14D8B', '', 'Re: 7월 필러 선적 일정 확인', 'Dear Mr. Ji, We confirm the shipment schedule for 5,000ea...', E'Dear Mr. Ji,\n\nWe confirm the shipment schedule for 5,000ea dermal filler on July 14. Please send us the final Packing List and Commercial Invoice so we can prepare customs clearance in Bangkok.\n\nBest regards,\nSomchai Prasert\nBangkok MediTrade Co., Ltd.', true, true, '[]', '2026-07-10 15:24'),
  ('inbox',  '박지원 (RA팀)', 'jiwon.park@bio-lj.com', '박', '#0E7B4E', '', 'NMPA 본심사 라벨 재제출 요청 건', 'NMPA에서 라벨 샘플 재제출 요청이 왔습니다. 수정본 첨부...', E'대표님,\n\nNMPA 본심사에서 라벨 샘플 재제출 요청이 접수되었습니다. 디자인팀 수정본을 첨부하니 검토 후 회신 부탁드립니다.\n\n박지원 드림', true, false, '[{"name":"NMPA_라벨_수정본_v2.pdf"}]', '2026-07-09 09:22'),
  ('inbox',  '대한바이오켐', 'sales@dhbiochem.co.kr', '대', '#2A6FDB', '', '히알루론산 원료 견적서 송부', '요청하신 5,000L 견적서를 첨부합니다. 단가/납기 확인 요청...', E'안녕하세요,\n\n요청하신 히알루론산 원료 5,000L 견적서를 첨부합니다. 단가 및 납기 확인 후 회신 부탁드립니다.\n\n대한바이오켐 영업팀 드림', false, false, '[{"name":"견적서_HA원료_5000L.xlsx"}]', '2026-07-08 13:10'),
  ('inbox',  '경영지원 시스템', 'noreply@bio-lj.com', '경', '#84908A', '', '[시스템] 전자결재 승인 알림', '상하이 보세창고 임대료 지출 결의가 승인되었습니다.', E'전자결재 알림\n\n상하이 보세창고 임대료 3분기 지출 결의 (LJ-AP-2026-0001) 가 대표이사 승인 및 날인 완료되었습니다.', false, false, '[]', '2026-07-08 11:02'),
  ('sent',   '지경준', 'kyungjun.ji@bio-lj.com', '지', '#0E7B4E', 'somchai@bkkmeditrade.co.th', 'PL / CI 최종본 송부', 'Attached are the final PL and CI for the July 14 shipment...', E'Dear Somchai,\n\nAttached are the final Packing List and Commercial Invoice for the July 14 shipment. Please confirm the documents.\n\nBest regards,\nKyungjun Ji', false, false, '[{"name":"PL_CI_20260714.pdf"}]', '2026-07-10 16:05'),
  ('drafts', '지경준', 'kyungjun.ji@bio-lj.com', '지', '#0E7B4E', '', '8월 수출 일정 공유 (작성 중)', '초안 작성 중…', '', false, false, '[]', '2026-07-11 10:30')
) as x(folder, from_name, from_email, from_init, av_bg, to_addr, subject, preview, body, unread, starred, attachments, sent_at)
  on p.email = 'kyungjun.ji@bio-lj.com';

-- --- approvals (전자결재): 시드 없음 (실제 상신 데이터로 채워집니다) ----------

-- --- partners (거래처) --------------------------------------------------------
insert into public.partners (name, rep, biz_no, biz_type, biz_item, address, phone, contact_name, contact_email, deal_type, seg_id, contract_type, memo, docs, created_at) values
  ('Bangkok MediTrade Co., Ltd.', 'Somchai Prasert', '0105-556-7788', '도소매', '의료기기 · 화장품', '128 Silom Rd, Bang Rak, Bangkok, Thailand', '+66-2-123-4567', '김서연', 'seoyeon.kim@bio-lj.com', '매출', 'cosmexp', '독점 판매계약서', '태국 필러 독점 유통 파트너.', '{"bizReg":{"name":"BKK_MediTrade_사업자등록증.pdf"},"bankbook":null,"contract":{"name":"독점공급계약서_최종.pdf"}}', '2026-06-20'),
  ('대한바이오켐(주)', '이정호', '214-88-01234', '제조', '화장품 원료', '경기도 안산시 단원구 산단로 123', '031-486-1200', '한소희', 'sohee.han@bio-lj.com', '매입', 'cosmexp', '표준 공급계약서', '히알루론산 원료 공급사.', '{"bizReg":{"name":"대한바이오켐_사업자등록증.jpg"},"bankbook":{"name":"대한바이오켐_통장사본.jpg"},"contract":null}', '2026-06-15'),
  ('上海 헬스로지스틱스', 'Wang Lei', '91310000-0000', '물류', '보세창고 · 운송', 'Pudong New Area, Shanghai, China', '+86-21-5555-0000', '정우성', 'wooseong.jung@bio-lj.com', '매입', 'pharmexp', '물류·운송 계약서', '상하이 보세창고 운영.', '{"bizReg":null,"bankbook":null,"contract":{"name":"물류위탁계약서_2026.pdf"}}', '2026-05-30'),
  ('서울종합약품 도매', '박상현', '110-81-45678', '도매', '의약품', '서울특별시 중구 을지로 145', '02-2233-4455', '김서연', 'seoyeon.kim@bio-lj.com', '매출', 'wholesale', '표준 공급계약서', '국내 의약품 도매 거래처.', '{"bizReg":{"name":"서울종합약품_사업자등록증.pdf"},"bankbook":{"name":"통장사본.jpg"},"contract":{"name":"공급계약서.pdf"}}', '2026-06-01');

-- --- files -------------------------------------------------------------------
insert into public.files (name, ext, category, seg_id, size, uploader, created_at) values
  ('중국_NMPA_인허가신청서_v3.pdf',            'PDF', '인허가',   'deviceexp', '2.4 MB', '박지원', '2026-07-09'),
  ('태국_필러_PackingList_20260714.xlsx',      'XLS', '수출서류', 'cosmexp',   '184 KB', '정우성', '2026-07-09'),
  ('Commercial_Invoice_태국_5000ea.pdf',       'PDF', '수출서류', 'cosmexp',   '96 KB',  '최민수', '2026-07-09'),
  ('일본_화장품_라벨_가이드_2026.pdf',         'PDF', '규정',     'cosmexp',   '5.1 MB', '한소희', '2026-07-08'),
  ('2026_수출_표준계약서_템플릿.docx',         'DOC', '계약',     'pharmexp',  '312 KB', '지경준', '2026-07-06'),
  ('중국_헬스케어_공급_견적서.xlsx',           'XLS', '견적',     'deviceexp', '241 KB', '최민수', '2026-07-05'),
  ('국내_의약품_공급계약_20260701.pdf',        'PDF', '계약',     'wholesale', '420 KB', '지경준', '2026-07-01'),
  ('유통ERP_구축_제안서_v2.pptx',              'DOC', '견적',     'itconsult', '3.8 MB', '지경준', '2026-07-03'),
  ('의약품_도매_거래처_단가표_3Q.xlsx',        'XLS', '견적',     'wholesale', '156 KB', '김서연', '2026-06-30');

-- --- leaves (근태 · HR) -------------------------------------------------------
insert into public.leaves (name, dept, init, avatar_bg, type, range, days, status) values
  ('최민수', '해외영업', '최', '#7A4DD1', '출장', '7/18 ~ 7/20', '3일',  'pending'),
  ('한소희', '마케팅',   '한', '#D14D8B', '연차', '8/1 ~ 8/2',   '2일',  'pending'),
  ('김서연', '해외영업', '김', '#2A6FDB', '연차', '7/24',        '1일',  'approved'),
  ('정우성', '물류',     '정', '#C6803A', '반차', '7/16 오후',   '0.5일','approved'),
  ('박지원', 'RA',       '박', '#0E7B4E', '출장', '7/29 ~ 7/30', '2일',  'approved');

-- --- calendar events ---------------------------------------------------------
insert into public.calendar_events (title, type, event_date, day, mon, time) values
  ('중국 파트너사 화상회의',   '회의', '2026-07-11', '11', 'JUL', '오후 3:00'),
  ('태국 필러 선적 마감',      '마감', '2026-07-14', '14', 'JUL', '종일'),
  ('전자결재 시스템 점검',     '점검', '2026-07-15', '15', 'JUL', '오전 2:00'),
  ('일본 출장 (최민수 팀장)',  '출장', '2026-07-18', '18', 'JUL', '3일간'),
  ('NMPA 본심사 자료 제출',    '제출', '2026-07-22', '22', 'JUL', '오후 5:00'),
  ('월간 영업 전략 회의',      '회의', '2026-07-25', '25', 'JUL', '오전 10:00');
