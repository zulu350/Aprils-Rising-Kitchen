# Future improvements — April's Rising Kitchen order app

Backlog from v1 planning. Revisit when ready (not built yet).

## Suggested next

1. **Venmo / Zelle handles on confirmation**  
   Show real payment handles or QR after order (or when kitchen marks confirmed). Currently: “details when we contact you.”

2. **Delivery fee rules**  
   You mentioned ~$10 in Boise/Meridian and $0.50/mile outside; later deferred. When ready: city base fee + optional mileage from kitchen, shown at checkout.

3. **Deploy / hosting**  
   Run as a long-lived Node process with SQLite on disk (VPS, Railway, Fly, home mini-PC). Not ideal on pure serverless without external DB.

4. **Stronger production secrets**  
   Rotate `ADMIN_PASSWORD` and `SESSION_SECRET`; set real `PICKUP_ADDRESS`.

5. **Card payments**  
   Stripe/Square if you want card checkout later (not required for cottage cash/Venmo/Zelle).

6. **SMS notify**  
   Text kitchen (or customer) on new order via Twilio or similar.

7. **Capacity / blackout dates**  
   Cap loaves per bake day; block holidays.

8. **Postgres migration**  
   If multi-device admin + cloud hosting outgrows SQLite — Prisma makes this straightforward.

9. **Menu admin UI**  
   Edit prices/items without code deploys.

10. **Customer order lookup**  
    “Find my order” by email + order number (beyond shareable confirmation link).

## Done in follow-ups

- [x] Email notify on new orders (kitchen + customer confirmation via SMTP)
