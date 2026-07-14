-- ============================================================================
-- LJ-BIO — 파일을 DB(base64)가 아니라 Supabase Storage에 저장
--   · 'documents' 비공개 버킷 생성
--   · 승인 로그인 사용자(authenticated)만 업로드·열람·삭제
--   · 실제 열람 통제는 DB 행 RLS(문서 보안등급/결재선/거래처)로 유지되고,
--     Storage 경로는 그 행을 읽을 수 있어야 얻을 수 있으므로 사실상 함께 보호됩니다.
-- 실행: Supabase → SQL Editor → 붙여넣기 → Run.
-- ============================================================================

insert into storage.buckets (id, name, public, file_size_limit)
values ('documents', 'documents', false, 104857600)  -- 100MB/파일
on conflict (id) do nothing;

-- 이미 버킷이 있으면 파일 용량 제한을 100MB로 올림(재실행 안전)
update storage.buckets set file_size_limit = 104857600 where id = 'documents';

drop policy if exists "documents_read"   on storage.objects;
drop policy if exists "documents_insert" on storage.objects;
drop policy if exists "documents_update" on storage.objects;
drop policy if exists "documents_delete" on storage.objects;

create policy "documents_read" on storage.objects
  for select to authenticated using (bucket_id = 'documents');
create policy "documents_insert" on storage.objects
  for insert to authenticated with check (bucket_id = 'documents');
create policy "documents_update" on storage.objects
  for update to authenticated using (bucket_id = 'documents');
create policy "documents_delete" on storage.objects
  for delete to authenticated using (bucket_id = 'documents');
