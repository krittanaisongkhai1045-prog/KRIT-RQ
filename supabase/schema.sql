-- Inspection Desk — ตั้งค่า Supabase (รันทั้งไฟล์ใน SQL Editor ครั้งเดียว รันซ้ำได้)
--
-- แนวคิดสิทธิ์
--   * ผู้ที่ล็อกอิน (สมาชิกที่แอดมินเชิญ) สร้างเอกสารได้ → ผู้สร้างเป็น "เจ้าของเอกสาร"
--   * เจ้าของเอกสารกำหนดได้ว่าใครอ่านได้ (ทุกคน / เฉพาะสมาชิก / เฉพาะที่ระบุ) และใครแก้ไขได้ (ระบุอีเมล)
--   * เปลี่ยนสถานะ/แก้เนื้อหาได้ตลอดโดยเจ้าของและผู้ที่ได้สิทธิ์แก้ไข
--   * แอดมิน (ตาราง app_owners) แก้ไข "ข้อมูลโครงการ" และดูแล/แก้ได้ทุกเอกสาร
--   * "เอกสาร" = ชุดใบตรวจ (OPEN + CLOSE + DEFECT ของชุดนั้น), QC DEFECT 1 จุด, แบบหน้างาน 1 แผ่น

-- 1) แอดมิน — แก้อีเมลด้านล่างให้เป็นของคุณก่อนรัน
create table if not exists public.app_owners (email text primary key);
alter table public.app_owners enable row level security;   -- ไม่มี policy = ไม่มีใครอ่านตารางนี้ตรงๆ ได้
insert into public.app_owners (email) values ('krittanaisongkhai1045@gmail.com') on conflict do nothing;

create or replace function public.me() returns text
language sql stable as $$ select lower(coalesce(auth.jwt() ->> 'email', '')) $$;

create or replace function public.is_admin() returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.app_owners where lower(email) = public.me());
$$;
grant execute on function public.me(), public.is_admin() to anon, authenticated;

-- 2) เอกสารทั้งหมดเก็บเป็น JSON แถวละเอกสารย่อย พร้อมสิทธิ์
--    grp = รหัสกลุ่มเอกสาร (ชุดใบตรวจใช้รหัสใบ OPEN, อย่างอื่นใช้รหัสตัวเอง) แถวในกลุ่มเดียวกันใช้สิทธิ์ชุดเดียวกัน
create table if not exists public.docs (
  collection  text        not null,          -- meta | requests | defects | plans
  id          text        not null,
  data        jsonb       not null,
  grp         text        not null default '',
  owner_id    uuid        default auth.uid(),
  owner_email text,
  access      text        not null default 'public' check (access in ('public','members','listed')),
  readers     text[]      not null default '{}',
  editors     text[]      not null default '{}',
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now(),
  primary key (collection, id)
);
-- ถ้าเคยสร้างตาราง docs จากสคีมาเก่า ให้เพิ่มคอลัมน์ใหม่ (รันซ้ำได้ ไม่กระทบข้อมูลเดิม)
alter table public.docs add column if not exists grp         text not null default '';
alter table public.docs add column if not exists owner_id    uuid default auth.uid();
alter table public.docs add column if not exists owner_email text;
alter table public.docs add column if not exists access      text not null default 'public';
alter table public.docs add column if not exists readers     text[] not null default '{}';
alter table public.docs add column if not exists editors     text[] not null default '{}';
alter table public.docs add column if not exists created_at  timestamptz not null default now();
alter table public.docs add column if not exists updated_at  timestamptz not null default now();
create index if not exists docs_grp_idx on public.docs (grp);
alter table public.docs replica identity full;
alter table public.docs enable row level security;

-- เลขที่รันนิ่ง (ใบตรวจ / QC) ออกโดยเซิร์ฟเวอร์ กันเลขซ้ำเมื่อหลายคนสร้างพร้อมกัน
create table if not exists public.counters (k text primary key, n integer not null);
alter table public.counters enable row level security;

create or replace function public.next_no(p_k text, p_start integer default 1) returns integer
language plpgsql security definer set search_path = public as $$
declare v integer;
begin
  if auth.uid() is null then raise exception 'login required' using errcode = '42501'; end if;
  insert into public.counters (k, n) values (p_k, greatest(p_start, 1))
  on conflict (k) do update set n = public.counters.n + 1
  returning n into v;
  return v;
end $$;
grant execute on function public.next_no(text, integer) to authenticated;

create or replace function public.set_counter(p_k text, p_next integer) returns void
language plpgsql security definer set search_path = public as $$
begin
  if not public.is_admin() then raise exception 'admin only' using errcode = '42501'; end if;
  insert into public.counters (k, n) values (p_k, greatest(p_next - 1, 0))
  on conflict (k) do update set n = greatest(p_next - 1, 0);
end $$;
grant execute on function public.set_counter(text, integer) to authenticated;

-- ทริกเกอร์: แถวใหม่ในกลุ่มเดิมรับสิทธิ์/เจ้าของจากกลุ่ม (เช่น ผู้ได้สิทธิ์แก้ไขสร้างรอบ CLOSE เพิ่ม)
create or replace function public.docs_before_insert() returns trigger
language plpgsql security definer set search_path = public as $$
declare g public.docs%rowtype;
begin
  if auth.uid() is null then raise exception 'login required' using errcode = '42501'; end if;
  if new.collection = 'meta' and not public.is_admin() then
    raise exception 'admin only' using errcode = '42501';
  end if;
  if coalesce(new.grp, '') = '' then new.grp := new.id; end if;
  select * into g from public.docs
   where grp = new.grp and not (collection = new.collection and id = new.id)
   order by created_at limit 1;
  if found then
    if not (g.owner_id = auth.uid() or public.is_admin() or public.me() = any (g.editors)) then
      raise exception 'no permission' using errcode = '42501';
    end if;
    new.owner_id := g.owner_id; new.owner_email := g.owner_email;
    new.access := g.access; new.readers := g.readers; new.editors := g.editors;
  else
    new.owner_id := auth.uid(); new.owner_email := public.me();
    if new.collection = 'meta' then new.access := 'public'; end if;
  end if;
  new.updated_at := now();
  return new;
end $$;

-- ทริกเกอร์: เฉพาะเจ้าของ/แอดมินที่เปลี่ยนเจ้าของและสิทธิ์ได้ (ผู้ได้สิทธิ์แก้ไขแก้ได้แค่เนื้อหา)
create or replace function public.docs_before_update() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if not (old.owner_id = auth.uid() or public.is_admin()) then
    new.owner_id := old.owner_id; new.owner_email := old.owner_email;
    new.access := old.access; new.readers := old.readers; new.editors := old.editors;
  end if;
  new.grp := old.grp;
  new.updated_at := now();
  return new;
end $$;

drop trigger if exists docs_bi on public.docs;
drop trigger if exists docs_bu on public.docs;
create trigger docs_bi before insert on public.docs for each row execute function public.docs_before_insert();
create trigger docs_bu before update on public.docs for each row execute function public.docs_before_update();

-- เจ้าของ/แอดมินกำหนดสิทธิ์ทั้งกลุ่มเอกสารในครั้งเดียว
create or replace function public.set_acl(p_grp text, p_access text, p_readers text[], p_editors text[]) returns void
language plpgsql security definer set search_path = public as $$
begin
  if p_access not in ('public','members','listed') then raise exception 'bad access'; end if;
  if not exists (select 1 from public.docs where grp = p_grp and (owner_id = auth.uid() or public.is_admin())) then
    raise exception 'only owner' using errcode = '42501';
  end if;
  update public.docs set
    access  = p_access,
    readers = coalesce((select array_agg(distinct lower(trim(x))) from unnest(p_readers) x where trim(x) <> ''), '{}'),
    editors = coalesce((select array_agg(distinct lower(trim(x))) from unnest(p_editors) x where trim(x) <> ''), '{}')
  where grp = p_grp;
end $$;
grant execute on function public.set_acl(text, text, text[], text[]) to authenticated;

-- 3) นโยบายอ่าน/เขียน
drop policy if exists "docs read"   on public.docs;
drop policy if exists "docs insert" on public.docs;
drop policy if exists "docs update" on public.docs;
drop policy if exists "docs delete" on public.docs;

create policy "docs read" on public.docs for select using (
  access = 'public'
  or owner_id = auth.uid()
  or public.is_admin()
  or (auth.uid() is not null and (access = 'members' or public.me() = any (readers) or public.me() = any (editors)))
);
create policy "docs insert" on public.docs for insert with check (
  auth.uid() is not null
  and (owner_id = auth.uid() or public.me() = any (editors) or public.is_admin())
);
create policy "docs update" on public.docs for update
  using      (owner_id = auth.uid() or public.is_admin() or public.me() = any (editors))
  with check (owner_id = auth.uid() or public.is_admin() or public.me() = any (editors));
-- ลบ: เจ้าของ/แอดมินลบได้ทุกอย่าง, ผู้ได้สิทธิ์แก้ไขลบได้เฉพาะรายการย่อย (DEFECT / รอบ CLOSE) ไม่ลบใบ OPEN, QC หรือแบบ
create policy "docs delete" on public.docs for delete using (
  owner_id = auth.uid() or public.is_admin()
  or (public.me() = any (editors) and collection = 'defects' and coalesce(data ->> 'qc', '') <> 'true')
  or (public.me() = any (editors) and collection = 'requests' and coalesce(data ->> 'type', '') <> 'OPEN')
);

-- Realtime
do $$ begin
  alter publication supabase_realtime add table public.docs;
exception when duplicate_object then null; end $$;

-- 4) ที่เก็บรูป (bucket สาธารณะ: อ่านได้ทุกคนที่รู้ลิงก์ เขียนได้เฉพาะสมาชิกที่ล็อกอิน)
--    หมายเหตุ: ชื่อไฟล์รูปเป็นรหัสสุ่ม เดาไม่ได้ แต่ถ้ามีคนรู้ลิงก์รูปโดยตรงก็เปิดได้แม้เอกสารเป็นแบบไม่เปิดสาธารณะ
insert into storage.buckets (id, name, public) values ('inspection-images', 'inspection-images', true)
on conflict (id) do nothing;

drop policy if exists "img read"   on storage.objects;
drop policy if exists "img insert" on storage.objects;
drop policy if exists "img update" on storage.objects;
drop policy if exists "img delete" on storage.objects;
create policy "img read"   on storage.objects for select using (bucket_id = 'inspection-images');
create policy "img insert" on storage.objects for insert with check (bucket_id = 'inspection-images' and auth.uid() is not null);
create policy "img update" on storage.objects for update using (bucket_id = 'inspection-images' and (owner = auth.uid() or public.is_admin()));
create policy "img delete" on storage.objects for delete using (bucket_id = 'inspection-images' and public.is_admin());
