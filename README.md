# April's Rising Kitchen — Order App

Web order-taking app for **April's Rising Kitchen** (Boise cottage bakery): customer storefront + kitchen admin board.

- **Storefront:** menu, cart, checkout, order confirmation  
- **Kitchen:** password-protected order list, status workflow, mark paid  
- **Payments (v1):** cash / Venmo / Zelle preference only (no card processing)  
- **Delivery (v1):** Boise & Meridian noted; no fee calculation yet  
- **Stack:** Next.js (App Router) · TypeScript · Tailwind · Prisma · SQLite  

## Quick start

```bash
cd aprils-rising-kitchen
cp .env.example .env.local   # or use .env
# edit ADMIN_PASSWORD, SESSION_SECRET, PICKUP_ADDRESS, DATABASE_URL

npm install
npm run db:push
npm run dev
```

- Storefront: [http://localhost:3000](http://localhost:3000)  
- Kitchen: [http://localhost:3000/admin](http://localhost:3000/admin)  

Default dev password (if you used the sample): set in `.env` as `ADMIN_PASSWORD`.

## Environment variables

| Variable | Required | Purpose |
|----------|----------|---------|
| `DATABASE_URL` | Yes | SQLite path, e.g. `file:./data/ark.db` |
| `ADMIN_PASSWORD` | Yes | Kitchen login password |
| `SESSION_SECRET` | Recommended | Signs admin session cookies (use a long random string) |
| `PICKUP_ADDRESS` | Optional | Shown only on **pickup** order confirmation + admin detail |

Example (`.env.example`):

```env
DATABASE_URL="file:./data/ark.db"
ADMIN_PASSWORD=change-me
SESSION_SECRET=generate-a-long-random-string
PICKUP_ADDRESS=
```

Never commit real secrets. `.env*` is gitignored; keep `.env.example` as the template.

## Scripts

| Command | Description |
|---------|-------------|
| `npm run dev` | Local development (Turbopack) |
| `npm run build` | Production build |
| `npm run start` | Run production server |
| `npm run db:push` | Apply Prisma schema to SQLite |
| `npm run db:generate` | Regenerate Prisma client |
| `npm run lint` | ESLint |

`postinstall` runs `prisma generate`.

## Email notifications

When a customer places an order, the app can email:

1. **Kitchen** (`ORDER_NOTIFY_EMAIL`, default `info@aprilsrisingkitchen.com`) — full order + link to admin detail  
2. **Customer** — confirmation with order number (disable with `EMAIL_CUSTOMER_CONFIRM=false`)

Configure SMTP in `.env` / `.env.local`:

```env
SMTP_HOST=smtp.example.com
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=your@email.com
SMTP_PASS=your-app-password
SMTP_FROM="April's Rising Kitchen <your@email.com>"
ORDER_NOTIFY_EMAIL=info@aprilsrisingkitchen.com
NEXT_PUBLIC_SITE_URL=https://your-domain.com
```

If SMTP is not set, orders still save; the server logs that email was skipped. Failed sends never fail the checkout.

Common providers: Gmail/Google Workspace app password, Microsoft 365, SendGrid SMTP, Amazon SES, Fastmail, etc.

See also [FUTURE.md](FUTURE.md) for deferred improvements (fees, Venmo handles, deploy, …).

## How ordering works

1. Customer browses `/menu`, adds items (cart in `localStorage`).  
2. Checkout collects contact, pickup **or** delivery (Boise/Meridian), preferred date, payment preference, notes.  
3. Server validates prices from `src/data/menu.ts` and lead times (**48h** loaves, **24h** rolls; mixed carts use the stricter rule, America/Boise).  
4. Order saved to SQLite; customer sees `/order/ARK-####`.  
5. Kitchen logs into `/admin`, updates status and payment.

### Order statuses

`new` → `confirmed` → `baking` → `ready` → `completed`  
Also: `cancelled`

### Menu edits

Edit [`src/data/menu.ts`](src/data/menu.ts) (prices in cents, `available`, lead times). Redeploy / restart after changes.

## Project layout

```
src/
  app/                 # Routes + API
  components/          # UI (storefront + admin)
  data/menu.ts         # Catalog
  lib/                 # cart, auth, db, order rules
  generated/prisma/    # Prisma client (generated)
data/ark.db            # SQLite (local, gitignored)
prisma/schema.prisma
public/images/         # Brand photos + logo
```

## Production notes

- Run as a **long-lived Node process** (`npm run build && npm start`) so SQLite stays on disk. Serverless hosts (e.g. Vercel) are a poor fit for local SQLite without external storage.  
- Change `ADMIN_PASSWORD` and `SESSION_SECRET` before any real use.  
- Set `PICKUP_ADDRESS` for pickup confirmations.  
- Back up `data/ark.db` regularly.  
- Optional later: Postgres via Prisma, email/SMS notify, Venmo/Zelle handles, delivery fee math.

## Brand & contact (app defaults)

- **Business:** April's Rising Kitchen · Boise, Idaho  
- **Phone / text:** 360-383-7464  
- **Email:** info@aprilsrisingkitchen.com  
- **Site reference:** [aprilsrisingkitchen.com](https://aprilsrisingkitchen.com)

## QA checklist (manual)

- [ ] Home loads; hero readable; Contact / Menu CTAs work  
- [ ] Menu lists loaves + rolls; Coming soon not orderable  
- [ ] Cart persists after refresh; qty +/− / remove / clear  
- [ ] Checkout rejects date too soon for 48h loaf  
- [ ] Place pickup order → confirmation + order number  
- [ ] Admin login fails with wrong password  
- [ ] Admin shows new order; status → ready; mark paid  
- [ ] Logout blocks `/api/admin/orders` (401)  

## License

Private / all rights reserved for April's Rising Kitchen unless otherwise agreed.
# Aprils-Rising-Kitchen
