# Moments On Time — Website + CRM

HTML/CSS/JavaScript only, using Supabase for database, authentication and Storage.

## Setup

1. Open `supabase/setup.sql` in the Supabase SQL Editor and run it.
2. Create a Supabase Auth email/password user.
3. Add that Auth user's UUID to `public.admin_users` using the SQL comment at the end of `setup.sql`.
4. Put your Supabase publishable/anon key in `config.js`.
5. Serve the folder from a local web server (for example VS Code Live Server). Do not open the HTML files directly with `file://`.

## Supabase Storage

The SQL creates a public `site-media` bucket. Admins can upload/delete:
- Website logo: `branding/...`
- Service images: `services/...`
- Top 4 category images: `categories/...`

The CRM deletes replaced/removed storage files when their storage path is known.

## Site settings

The CRM Site settings page now manages:
- Hero title/text
- Instagram, phone, WhatsApp and email
- Website logo upload / replace / delete
- Currency code (USD, EUR, LBP, GBP)
- Currency symbol (for example `$`)

Service prices on the public website use the configured currency symbol and code.

## Services

Service images are uploaded directly to Supabase Storage from the CRM. When editing a service you can replace the image or remove it. Deleting a service also deletes its stored image when the storage path is known.

## Customer form

Phone / WhatsApp is required in the website form and the database insert policy also requires a non-empty phone value.

## Sign out

CRM sign out calls Supabase `signOut()` and immediately returns to the CRM login screen. The auth state listener also handles `SIGNED_OUT` sessions.
