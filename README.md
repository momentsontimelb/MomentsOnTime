# Moments On Time — Website + CRM v6

HTML/CSS/JavaScript only, powered by Supabase.

## v6 changes
- Site Settings keeps only the currency symbol in the CRM UI; prices display like `$25.00`.
- CRM navigation is a single-page app and avoids unnecessary reinitialization when browser-tab focus/token events occur.
- Dashboard clearly defines Active services and tracks New, Contacted, Completed and Cancelled inquiries.
- Added a full Categories section with add/edit/delete, Supabase image upload, search and image/sort filters.
- Service category is now a dropdown populated from Categories.
- New service/category forms open in modal popups.
- Service sort order is automatically incremental within category and normalized according to category order.
- Added success/error/info banners instead of intrusive alert messages for CRUD feedback.
- Inquiries support internal CRM notes from the View modal.
- Website top four categories now come from the managed `categories` table.
- All website/CRM images continue to use Supabase Storage with logo fallback.

## Setup
1. Put your Supabase publishable/anon key in `config.js`.
2. Run `supabase/setup.sql` in the Supabase SQL Editor. It includes upgrades for existing v5 databases and creates/migrates the `categories` and `inquiries.notes` fields.
3. Create a Supabase Auth user and add its UUID to `admin_users` as shown at the bottom of the SQL file.
4. Open `index.html` for the public website and `crm/index.html` for the CRM.

Never put a Supabase service-role/secret key in browser code.
