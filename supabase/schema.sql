-- Inspection Desk — ตั้งค่า Supabase (รันทั้งไฟล์ใน SQL Editor ครั้งเดียว)
-- แนวคิด: ทุกคนอ่านข้อมูลได้ แต่เขียนได้เฉพาะอีเมลที่อยู่ในตาราง app_owners

-- 1) เจ้าของ (ผู้แก้ไข) — แก้อีเมลด้านล่างให้เป็นของคุณก่อนรัน
create table if not exists public.app_owners (email text primary key);
alter table public.app_owners enable row level security;   -- ไม่มี policy = ไม่มีใครอ่านตารางนี้ตรงๆ ได้
insert into public.app_owners (email) values ('Krittanaisongkhai1045@gmail.com') on conflict do nothing;

create or replace function public.is_owner() returns boolean
language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from public.app_owners
    where lower(email) = lower(coalesce(auth.jwt() ->> 'email', ''))
  );
$$;
grant execute on function public.is_owner() to anon, authenticated;

-- 2) เอกสารทั้งหมด (project / library / requests / defects) เก็บเป็น JSON แถวละเอกสาร
create table if not exists public.docs (
  collection text        not null,
  id         text        not null,
  data       jsonb       not null,
  updated_at timestamptz not null default now(),
  primary key (collection, id)
);
alter table public.docs enable row level security;

drop policy if exists "docs read"   on public.docs;
drop policy if exists "docs insert" on public.docs;
drop policy if exists "docs update" on public.docs;
drop policy if exists "docs delete" on public.docs;
create policy "docs read"   on public.docs for select using (true);   -- ทุกคนดูได้ (อยากให้ต้องล็อกอินก่อนดู ให้เปลี่ยนเป็น auth.role() = 'authenticated')
create policy "docs insert" on public.docs for insert with check (public.is_owner());
create policy "docs update" on public.docs for update using (public.is_owner()) with check (public.is_owner());
create policy "docs delete" on public.docs for delete using (public.is_owner());

-- ให้คนที่เปิดดูเห็นการเปลี่ยนแปลงทันที (Realtime)
alter publication supabase_realtime add table public.docs;

-- 3) ที่เก็บรูป (Storage bucket สาธารณะ อ่านได้ทุกคน เขียนได้เฉพาะเจ้าของ)
insert into storage.buckets (id, name, public) values ('inspection-images', 'inspection-images', true)
on conflict (id) do nothing;

drop policy if exists "img read"   on storage.objects;
drop policy if exists "img insert" on storage.objects;
drop policy if exists "img update" on storage.objects;
drop policy if exists "img delete" on storage.objects;
create policy "img read"   on storage.objects for select using (bucket_id = 'inspection-images');
create policy "img insert" on storage.objects for insert with check (bucket_id = 'inspection-images' and public.is_owner());
create policy "img update" on storage.objects for update using (bucket_id = 'inspection-images' and public.is_owner());
create policy "img delete" on storage.objects for delete using (bucket_id = 'inspection-images' and public.is_owner());
