export const SITE_URL = "https://www.aprilsrisingkitchen.com";

export const BUSINESS = {
  name: "April's Rising Kitchen",
  shortName: "ARK",
  tagline: "Small-batch home bakery · Boise, Idaho",
  email: "info@aprilsrisingkitchen.com",
  phone: "360-383-7464",
  phoneHref: "tel:+13603837464",
  facebook: "https://www.facebook.com/p/Aprils-Rising-Kitchen-61590526407815/",
  /** Google Maps / Business review short link */
  googleMapsReview:
    "https://maps.app.goo.gl/TXRajMkuuTqZ6HMQA",
  serviceArea: "Boise & Meridian",
  timezone: "America/Boise",
  /** Pickup & delivery window on the chosen day — not shop-open hours */
  fulfillmentHours: "1:00–5:00 PM",
} as const;

/** Bake / pickup facts. Do not present 1–5 PM as storefront hours. */
export const HOURS = {
  sourdough:
    "Sourdough: Wednesday and Friday. Order by Monday 5:00 PM for Wednesday, Wednesday 5:00 PM for Friday.",
  rolls:
    "Rolls and treats only: Monday–Friday, about 24 hours' notice.",
  pickupDelivery: `Pickup and delivery: 1:00–5:00 PM that day, ${BUSINESS.serviceArea}.`,
  questions: "Questions: Monday–Friday.",
} as const;

export const PAYMENTS_LINE =
  "Cash · Venmo · Zelle · Card / Apple Pay / Google Pay";

export const COTTAGE_LINE = "Baked in a home kitchen.";
