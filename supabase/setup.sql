-- Moments On Time — Supabase setup
-- Run this in the Supabase SQL Editor.
-- Then create one Auth user and add that user's UUID to admin_users.

create extension if not exists pgcrypto;

create table if not exists public.admin_users (
  user_id uuid primary key references auth.users(id) on delete cascade,
  created_at timestamptz not null default now()
);

create or replace function public.is_mot_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.admin_users
    where user_id = auth.uid()
  );
$$;

grant execute on function public.is_mot_admin() to anon, authenticated;

create table if not exists public.services (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  category text not null,
  description text,
  image_url text,
  image_storage_path text,
  price numeric(12,2),
  is_active boolean not null default true,
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.category_images (
  id uuid primary key default gen_random_uuid(),
  category text not null unique,
  image_url text,
  storage_path text,
  updated_at timestamptz not null default now()
);

create table if not exists public.site_settings (
  id integer primary key default 1 check (id = 1),
  hero_title text default 'Made for the moments that matter.',
  hero_text text default 'Souvenirs, gifts, mirrors and custom pieces made with care.',
  phone text,
  whatsapp text,
  instagram_url text default 'https://www.instagram.com/momentsontime.lb/',
  email text,
  logo_url text,
  logo_storage_path text,
  currency_code text not null default 'USD',
  currency_symbol text not null default '$',
  updated_at timestamptz not null default now()
);

insert into public.site_settings (id)
values (1)
on conflict (id) do nothing;

-- Safe upgrades for an existing database.
alter table public.site_settings add column if not exists logo_url text;
alter table public.site_settings add column if not exists logo_storage_path text;
alter table public.site_settings add column if not exists currency_code text not null default 'USD';
alter table public.site_settings add column if not exists currency_symbol text not null default '$';
create table if not exists public.inquiries (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  phone text not null,
  email text,
  service text,
  message text,
  status text not null default 'new' check (status in ('new','contacted','completed','cancelled')),
  created_at timestamptz not null default now()
);

-- Safe upgrades for an existing database.
alter table public.services add column if not exists image_storage_path text;
alter table public.inquiries add column if not exists phone text;
update public.inquiries set phone = '' where phone is null;
alter table public.inquiries alter column phone set not null;

-- updated_at trigger
create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists services_updated_at on public.services;
create trigger services_updated_at
before update on public.services
for each row execute function public.set_updated_at();

drop trigger if exists category_images_updated_at on public.category_images;
create trigger category_images_updated_at
before update on public.category_images
for each row execute function public.set_updated_at();

drop trigger if exists site_settings_updated_at on public.site_settings;
create trigger site_settings_updated_at
before update on public.site_settings
for each row execute function public.set_updated_at();

-- RLS
alter table public.services enable row level security;
alter table public.category_images enable row level security;
alter table public.site_settings enable row level security;
alter table public.inquiries enable row level security;
alter table public.admin_users enable row level security;

drop policy if exists "public read active services" on public.services;
create policy "public read active services"
on public.services for select to anon, authenticated
using (is_active = true or public.is_mot_admin());

drop policy if exists "admins insert services" on public.services;
create policy "admins insert services" on public.services for insert to authenticated
with check (public.is_mot_admin());

drop policy if exists "admins update services" on public.services;
create policy "admins update services"
on public.services for update to authenticated
using (public.is_mot_admin()) with check (public.is_mot_admin());

drop policy if exists "admins delete services" on public.services;
create policy "admins delete services"
on public.services for delete to authenticated
using (public.is_mot_admin());

drop policy if exists "public read category images" on public.category_images;
create policy "public read category images"
on public.category_images for select to anon, authenticated
using (true);

drop policy if exists "admins manage category images" on public.category_images;
create policy "admins manage category images"
on public.category_images for all to authenticated
using (public.is_mot_admin()) with check (public.is_mot_admin());

drop policy if exists "public read site settings" on public.site_settings;
create policy "public read site settings"
on public.site_settings for select to anon, authenticated
using (true);

drop policy if exists "admins update site settings" on public.site_settings;
create policy "admins update site settings"
on public.site_settings for update to authenticated
using (public.is_mot_admin()) with check (public.is_mot_admin());

drop policy if exists "public create inquiries" on public.inquiries;
create policy "public create inquiries"
on public.inquiries for insert to anon, authenticated
with check (phone is not null and length(trim(phone)) > 0);

drop policy if exists "admins read inquiries" on public.inquiries;
create policy "admins read inquiries"
on public.inquiries for select to authenticated
using (public.is_mot_admin());

drop policy if exists "admins update inquiries" on public.inquiries;
create policy "admins update inquiries"
on public.inquiries for update to authenticated
using (public.is_mot_admin()) with check (public.is_mot_admin());

drop policy if exists "admins delete inquiries" on public.inquiries;
create policy "admins delete inquiries"
on public.inquiries for delete to authenticated
using (public.is_mot_admin());

-- Admin users: each admin can see their own row.
drop policy if exists "admins read own admin row" on public.admin_users;
create policy "admins read own admin row"
on public.admin_users for select to authenticated
using (user_id = auth.uid());

-- STORAGE: public bucket for website images
insert into storage.buckets (id, name, public)
values ('site-media', 'site-media', true)
on conflict (id) do update set public = true;

drop policy if exists "public view site media" on storage.objects;
create policy "public view site media"
on storage.objects for select
using (bucket_id = 'site-media');

drop policy if exists "admins upload site media" on storage.objects;
create policy "admins upload site media"
on storage.objects for insert to authenticated
with check (bucket_id = 'site-media' and public.is_mot_admin());

drop policy if exists "admins update site media" on storage.objects;
create policy "admins update site media"
on storage.objects for update to authenticated
using (bucket_id = 'site-media' and public.is_mot_admin())
with check (bucket_id = 'site-media' and public.is_mot_admin());

drop policy if exists "admins delete site media" on storage.objects;
create policy "admins delete site media"
on storage.objects for delete to authenticated
using (bucket_id = 'site-media' and public.is_mot_admin());

-- Data API grants
grant select on public.services to anon, authenticated;
grant insert, update, delete on public.services to authenticated;
grant select on public.category_images to anon, authenticated;
grant insert, update, delete on public.category_images to authenticated;
grant select on public.site_settings to anon, authenticated;
grant update on public.site_settings to authenticated;
grant insert on public.inquiries to anon, authenticated;
grant select, update, delete on public.inquiries to authenticated;
grant select on public.admin_users to authenticated;

-- AFTER creating your Auth user, replace the UUID below and run:
-- insert into public.admin_users (user_id) values ('YOUR-AUTH-USER-UUID');
