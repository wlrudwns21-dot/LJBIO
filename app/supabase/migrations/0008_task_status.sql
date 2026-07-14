-- ============================================================================
-- LJ-BIO — 업무 과제에 '상태(칸반 열)' 컬럼 추가
-- 지금까지는 과제 상태를 단계 진행도로 자동 추정해서, 등록하면 항상 '대기'로만
-- 보였습니다. 이제 담당자가 대기/진행중/검토/완료를 직접 지정할 수 있도록
-- tasks 테이블에 status 컬럼을 둡니다.
-- 실행: Supabase → SQL Editor → 붙여넣기 → Run.
-- ============================================================================

alter table public.tasks
  add column if not exists status text not null default 'todo'
  check (status in ('todo', 'doing', 'review', 'done'));

-- 기존 과제의 초기 상태를 단계 진행도에 맞춰 한 번 보정 (선택 사항이지만 권장)
update public.tasks t set status = sub.st
from (
  select
    s.task_id,
    case
      when count(*) filter (where s.status = 'done') = 0 then 'todo'
      when count(*) filter (where s.status = 'done') = count(*) then 'done'
      when count(*) filter (where s.status = 'doing') > 0 then 'doing'
      else 'review'
    end as st
  from public.task_stages s
  group by s.task_id
) sub
where t.id = sub.task_id;
