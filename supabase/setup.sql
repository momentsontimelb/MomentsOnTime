-- Moments On Time — Supabase setup / upgrade
-- Run this in the Supabase SQL Editor.
create extension if not exists pgcrypto;

create table if not exists public.admin_users (
  user_id uuid primary key references auth.users(id) on delete cascade,
  created_at timestamptz not null default now()
);
create or replace function public.is_mot_admin() returns boolean language sql stable security definer set search_path=public as $$ select exists(select 1 from public.admin_users where user_id=auth.uid()); $$;
grant execute on function public.is_mot_admin() to anon, authenticated;

create table if not exists public.categories (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  image_url text,
  storage_path text,
  sort_order integer not null default 1,
  is_visible boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.services (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  category text not null,
  description text,
  image_url text,
  image_storage_path text,
  price numeric(12,2),
  is_active boolean not null default true,
  sort_order integer not null default 1,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.category_images (
  id uuid primary key default gen_random_uuid(), category text not null unique, image_url text, storage_path text, updated_at timestamptz not null default now()
);

create table if not exists public.site_settings (
  id integer primary key default 1 check (id=1),
  hero_title text default 'Made for the moments that matter.', hero_text text default 'Souvenirs, gifts, mirrors and custom pieces made with care.', phone text, whatsapp text,
  instagram_url text default 'https://www.instagram.com/momentsontime.lb/', email text, logo_url text, logo_storage_path text,
  currency_symbol text not null default '$', category_limit integer not null default 4, service_limit integer not null default 4,
  categories_title text default 'Our categories', categories_intro text default 'Discover our curated collections, made for every kind of moment.', services_title text default 'Made with meaning', services_intro text default 'Browse our latest pieces and personalized creations.',
  about_eyebrow text default 'Moments On Time', about_title text default 'Every detail tells your story.', about_quote text default '“A timeless keepsake for a love that lasts forever.”', about_text text default 'We create memorable gifts, souvenirs, mirrors and personalized pieces for engagements, weddings, birthdays, celebrations and the little moments worth keeping.',
  contact_eyebrow text default 'Let’s create yours', contact_title text default 'Tell us about your moment.', contact_intro text default 'Send a request and we’ll get back to you with the details.', contact_side_text text default 'For custom orders, include the occasion, preferred style, date and any personalization you want. You can also message us on Instagram.', updated_at timestamptz not null default now()
);
insert into public.site_settings(id) values(1) on conflict(id) do nothing;
alter table public.site_settings add column if not exists logo_url text;
alter table public.site_settings add column if not exists logo_storage_path text;
alter table public.site_settings add column if not exists currency_symbol text not null default '$';
alter table public.site_settings add column if not exists category_limit integer not null default 4;
alter table public.site_settings add column if not exists service_limit integer not null default 4;
alter table public.site_settings add column if not exists categories_title text; alter table public.site_settings add column if not exists categories_intro text; alter table public.site_settings add column if not exists services_title text; alter table public.site_settings add column if not exists services_intro text; alter table public.site_settings add column if not exists about_eyebrow text; alter table public.site_settings add column if not exists about_title text; alter table public.site_settings add column if not exists about_quote text; alter table public.site_settings add column if not exists about_text text; alter table public.site_settings add column if not exists contact_eyebrow text; alter table public.site_settings add column if not exists contact_title text; alter table public.site_settings add column if not exists contact_intro text; alter table public.site_settings add column if not exists contact_side_text text;
alter table public.site_settings drop column if exists currency_code;
alter table public.site_settings add column if not exists brand_name text; alter table public.site_settings add column if not exists nav_categories text; alter table public.site_settings add column if not exists nav_services text; alter table public.site_settings add column if not exists nav_about text; alter table public.site_settings add column if not exists nav_contact text; alter table public.site_settings add column if not exists nav_cta text; alter table public.site_settings add column if not exists hero_eyebrow text; alter table public.site_settings add column if not exists hero_primary_cta text; alter table public.site_settings add column if not exists hero_secondary_cta text; alter table public.site_settings add column if not exists categories_eyebrow text; alter table public.site_settings add column if not exists category_more_label text; alter table public.site_settings add column if not exists services_eyebrow text; alter table public.site_settings add column if not exists service_more_label text; alter table public.site_settings add column if not exists form_name_label text; alter table public.site_settings add column if not exists form_phone_label text; alter table public.site_settings add column if not exists form_email_label text; alter table public.site_settings add column if not exists form_service_label text; alter table public.site_settings add column if not exists form_message_label text; alter table public.site_settings add column if not exists form_service_placeholder text; alter table public.site_settings add column if not exists form_message_placeholder text; alter table public.site_settings add column if not exists form_submit text;
alter table public.categories add column if not exists is_visible boolean not null default true;
update public.site_settings set brand_name=coalesce(brand_name,'Moments On Time'),nav_categories=coalesce(nav_categories,'Categories'),nav_services=coalesce(nav_services,'Collection'),nav_about=coalesce(nav_about,'About'),nav_contact=coalesce(nav_contact,'Contact'),nav_cta=coalesce(nav_cta,'Create a moment'),hero_eyebrow=coalesce(hero_eyebrow,'Gifts • Souvenirs • Mirrors • Custom pieces'),hero_primary_cta=coalesce(hero_primary_cta,'Explore collection'),hero_secondary_cta=coalesce(hero_secondary_cta,'Request a custom piece'),categories_eyebrow=coalesce(categories_eyebrow,'Explore'),category_more_label=coalesce(category_more_label,'Show more'),services_eyebrow=coalesce(services_eyebrow,'The collection'),service_more_label=coalesce(service_more_label,'Show more'),form_name_label=coalesce(form_name_label,'Name *'),form_phone_label=coalesce(form_phone_label,'Phone / WhatsApp *'),form_email_label=coalesce(form_email_label,'Email'),form_service_label=coalesce(form_service_label,'Service / category'),form_message_label=coalesce(form_message_label,'Message'),form_service_placeholder=coalesce(form_service_placeholder,'e.g. engagement gift'),form_message_placeholder=coalesce(form_message_placeholder,'Tell us what you have in mind…'),form_submit=coalesce(form_submit,'Send request');

create sequence if not exists public.inquiry_number_seq;

create table if not exists public.inquiries (
  id uuid primary key default gen_random_uuid(),
  inquiry_number text unique,
  name text not null, phone text not null, email text, service text not null, message text not null,
  notes text, status text not null default 'new' check(status in('new','contacted','approved','completed','cancelled')), created_at timestamptz not null default now()
);

create or replace function public.next_inquiry_number() returns text
language plpgsql
as $$
declare n bigint;
begin
  n := nextval('public.inquiry_number_seq');
  return 'MOT-' || to_char(current_date,'YYYY') || '-' || lpad(n::text,6,'0');
end;
$$;

alter table public.inquiries add column if not exists inquiry_number text;
alter table public.inquiries add column if not exists service text;
alter table public.inquiries add column if not exists message text;
update public.inquiries set inquiry_number='MOT-' || to_char(coalesce(created_at,now()),'YYYY') || '-' || lpad(row_number() over(order by coalesce(created_at,now()),id)::text,6,'0') where inquiry_number is null;
select setval('public.inquiry_number_seq', greatest((select count(*) from public.inquiries),1), true);
alter table public.inquiries alter column inquiry_number set default public.next_inquiry_number();
alter table public.inquiries alter column service set not null;
alter table public.inquiries alter column message set not null;
alter table public.inquiries alter column inquiry_number set not null;
create index if not exists inquiries_inquiry_number_idx on public.inquiries(inquiry_number);
alter table public.inquiries add column if not exists phone text;
update public.inquiries set phone='' where phone is null;
alter table public.inquiries alter column phone set not null;
alter table public.inquiries add column if not exists notes text;
alter table public.inquiries drop constraint if exists inquiries_status_check;
alter table public.inquiries add constraint inquiries_status_check check(status in('new','contacted','approved','completed','cancelled'));

-- Migrate the previous category-image records into the new category table.
insert into public.categories(name,image_url,storage_path,sort_order)
select ci.category,ci.image_url,ci.storage_path,row_number() over(order by ci.category)
from public.category_images ci
where trim(ci.category)<>''
on conflict(name) do update set image_url=coalesce(public.categories.image_url,excluded.image_url),storage_path=coalesce(public.categories.storage_path,excluded.storage_path);

create or replace function public.set_updated_at() returns trigger language plpgsql as $$ begin new.updated_at=now(); return new; end; $$;
drop trigger if exists categories_updated_at on public.categories; create trigger categories_updated_at before update on public.categories for each row execute function public.set_updated_at();
drop trigger if exists services_updated_at on public.services; create trigger services_updated_at before update on public.services for each row execute function public.set_updated_at();
drop trigger if exists site_settings_updated_at on public.site_settings; create trigger site_settings_updated_at before update on public.site_settings for each row execute function public.set_updated_at();

alter table public.categories enable row level security; alter table public.services enable row level security; alter table public.category_images enable row level security; alter table public.site_settings enable row level security; alter table public.inquiries enable row level security; alter table public.admin_users enable row level security;

drop policy if exists "public read categories" on public.categories; create policy "public read categories" on public.categories for select to anon,authenticated using(true);
drop policy if exists "admins manage categories" on public.categories; create policy "admins manage categories" on public.categories for all to authenticated using(public.is_mot_admin()) with check(public.is_mot_admin());
drop policy if exists "public read active services" on public.services; create policy "public read active services" on public.services for select to anon,authenticated using(is_active=true or public.is_mot_admin());
drop policy if exists "admins insert services" on public.services; create policy "admins insert services" on public.services for insert to authenticated with check(public.is_mot_admin());
drop policy if exists "admins update services" on public.services; create policy "admins update services" on public.services for update to authenticated using(public.is_mot_admin()) with check(public.is_mot_admin());
drop policy if exists "admins delete services" on public.services; create policy "admins delete services" on public.services for delete to authenticated using(public.is_mot_admin());
drop policy if exists "public read category images" on public.category_images; create policy "public read category images" on public.category_images for select to anon,authenticated using(true);
drop policy if exists "admins manage category images" on public.category_images; create policy "admins manage category images" on public.category_images for all to authenticated using(public.is_mot_admin()) with check(public.is_mot_admin());
drop policy if exists "public read site settings" on public.site_settings; create policy "public read site settings" on public.site_settings for select to anon,authenticated using(true);
drop policy if exists "admins update site settings" on public.site_settings; create policy "admins update site settings" on public.site_settings for update to authenticated using(public.is_mot_admin()) with check(public.is_mot_admin());
drop policy if exists "public create inquiries" on public.inquiries; create policy "public create inquiries" on public.inquiries for insert to anon,authenticated with check(phone is not null and length(trim(phone))>0 and service is not null and length(trim(service))>0 and message is not null and length(trim(message))>0);
drop policy if exists "admins read inquiries" on public.inquiries; create policy "admins read inquiries" on public.inquiries for select to authenticated using(public.is_mot_admin());
drop policy if exists "admins update inquiries" on public.inquiries; create policy "admins update inquiries" on public.inquiries for update to authenticated using(public.is_mot_admin()) with check(public.is_mot_admin());
drop policy if exists "admins delete inquiries" on public.inquiries; create policy "admins delete inquiries" on public.inquiries for delete to authenticated using(public.is_mot_admin());
drop policy if exists "admins read own admin row" on public.admin_users; create policy "admins read own admin row" on public.admin_users for select to authenticated using(user_id=auth.uid());

insert into storage.buckets(id,name,public) values('site-media','site-media',true) on conflict(id) do update set public=true;
drop policy if exists "public view site media" on storage.objects; create policy "public view site media" on storage.objects for select using(bucket_id='site-media');
drop policy if exists "admins upload site media" on storage.objects; create policy "admins upload site media" on storage.objects for insert to authenticated with check(bucket_id='site-media' and public.is_mot_admin());
drop policy if exists "admins update site media" on storage.objects; create policy "admins update site media" on storage.objects for update to authenticated using(bucket_id='site-media' and public.is_mot_admin()) with check(bucket_id='site-media' and public.is_mot_admin());
drop policy if exists "admins delete site media" on storage.objects; create policy "admins delete site media" on storage.objects for delete to authenticated using(bucket_id='site-media' and public.is_mot_admin());

grant select on public.categories to anon,authenticated; grant insert,update,delete on public.categories to authenticated;
grant select on public.services to anon,authenticated; grant insert,update,delete on public.services to authenticated;
grant select on public.category_images to anon,authenticated; grant insert,update,delete on public.category_images to authenticated;
grant select on public.site_settings to anon,authenticated; grant update on public.site_settings to authenticated;
grant insert,select on public.inquiries to anon,authenticated; grant select,update,delete on public.inquiries to authenticated;
grant select on public.admin_users to authenticated;

-- AFTER creating your Auth user, add its UUID:
-- insert into public.admin_users(user_id) values('YOUR-AUTH-USER-UUID');
