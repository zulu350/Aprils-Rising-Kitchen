import { Prisma } from "@/generated/prisma/client";
import { parseStaffPayment, parseStaffStatus } from "@/lib/staff-orders";

export const STAFF_LIST_DEFAULT_LIMIT = 50;
export const STAFF_LIST_MAX_LIMIT = 100;

export type StaffListSort =
  | "placedAt_desc"
  | "fulfillmentDate_desc"
  | "fulfillmentDate_asc"
  | "total_desc";

export type StaffListQuery = {
  q?: string;
  phone?: string;
  email?: string;
  name?: string;
  item?: string;
  menuItemId?: string;
  statuses?: string[];
  payment?: "paid" | "unpaid";
  fulfillmentType?: "pickup" | "delivery";
  from?: string;
  to?: string;
  placedFrom?: Date;
  placedTo?: Date;
  deliveryCity?: string;
  minTotalCents?: number;
  maxTotalCents?: number;
  hasPhone?: boolean;
  hasEmail?: boolean;
  limit: number;
  offset: number;
  sort: StaffListSort;
};

function digitsOnly(value: string): string {
  return value.replace(/\D/g, "");
}

function parseBool(raw: string | null): boolean | undefined {
  if (raw === null || raw === "") return undefined;
  const key = raw.trim().toLowerCase();
  if (key === "true" || key === "1" || key === "yes") return true;
  if (key === "false" || key === "0" || key === "no") return false;
  return undefined;
}

function parseYmd(raw: string | null): string | undefined {
  if (!raw || !/^\d{4}-\d{2}-\d{2}$/.test(raw.trim())) return undefined;
  return raw.trim();
}

function parsePlacedBound(raw: string | null, endOfDay: boolean): Date | undefined {
  if (!raw?.trim()) return undefined;
  const value = raw.trim();
  if (/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    return new Date(
      endOfDay ? `${value}T23:59:59.999Z` : `${value}T00:00:00.000Z`,
    );
  }
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? undefined : parsed;
}

function parseDollarsToCents(raw: string | null): number | undefined {
  if (raw === null || raw.trim() === "") return undefined;
  const n = Number(raw);
  if (!Number.isFinite(n)) return undefined;
  return Math.round(n * 100);
}

export function parseStaffListSearch(
  search: URLSearchParams,
): { ok: true; query: StaffListQuery } | { ok: false; error: string } {
  const statusesRaw = search.get("status");
  const statuses: string[] = [];
  if (statusesRaw?.trim()) {
    for (const part of statusesRaw.split(",")) {
      const parsed = parseStaffStatus(part);
      if (!parsed.ok) return parsed;
      statuses.push(parsed.value);
    }
  }

  let payment: "paid" | "unpaid" | undefined;
  const paymentRaw = search.get("payment");
  if (paymentRaw?.trim()) {
    const parsed = parseStaffPayment(paymentRaw);
    if (!parsed.ok) return parsed;
    payment = parsed.value;
  }

  const fulfillmentRaw = search.get("fulfillmentType")?.trim().toLowerCase();
  if (
    fulfillmentRaw &&
    fulfillmentRaw !== "pickup" &&
    fulfillmentRaw !== "delivery"
  ) {
    return { ok: false, error: "fulfillmentType must be pickup or delivery." };
  }

  const sortRaw = search.get("sort")?.trim() || "placedAt_desc";
  const sort = sortRaw as StaffListSort;
  if (
    sort !== "placedAt_desc" &&
    sort !== "fulfillmentDate_desc" &&
    sort !== "fulfillmentDate_asc" &&
    sort !== "total_desc"
  ) {
    return {
      ok: false,
      error:
        "sort must be placedAt_desc, fulfillmentDate_desc, fulfillmentDate_asc, or total_desc.",
    };
  }

  let limit = STAFF_LIST_DEFAULT_LIMIT;
  const limitRaw = search.get("limit");
  if (limitRaw) {
    const n = Math.floor(Number(limitRaw));
    if (!Number.isFinite(n) || n < 1) {
      return { ok: false, error: "limit must be 1–100." };
    }
    limit = Math.min(STAFF_LIST_MAX_LIMIT, n);
  }

  let offset = 0;
  const offsetRaw = search.get("offset") ?? search.get("page");
  if (offsetRaw) {
    const n = Math.floor(Number(offsetRaw));
    if (!Number.isFinite(n) || n < 0) {
      return { ok: false, error: "offset must be 0 or greater." };
    }
    // page=1 means offset 0 if they sent page
    offset = search.has("page") && !search.has("offset") ? Math.max(0, (n - 1) * limit) : n;
  }

  const hasPhone = parseBool(search.get("hasPhone"));
  const hasEmail = parseBool(search.get("hasEmail"));
  if (search.get("hasPhone") && hasPhone === undefined) {
    return { ok: false, error: "hasPhone must be true or false." };
  }
  if (search.get("hasEmail") && hasEmail === undefined) {
    return { ok: false, error: "hasEmail must be true or false." };
  }

  return {
    ok: true,
    query: {
      q: search.get("q")?.trim() || undefined,
      phone: search.get("phone")?.trim() || undefined,
      email: search.get("email")?.trim() || undefined,
      name: search.get("name")?.trim() || undefined,
      item: search.get("item")?.trim() || undefined,
      menuItemId: search.get("menuItemId")?.trim() || undefined,
      statuses: statuses.length ? statuses : undefined,
      payment,
      fulfillmentType:
        fulfillmentRaw === "pickup" || fulfillmentRaw === "delivery"
          ? fulfillmentRaw
          : undefined,
      from: parseYmd(search.get("from")),
      to: parseYmd(search.get("to")),
      placedFrom: parsePlacedBound(search.get("placedFrom"), false),
      placedTo: parsePlacedBound(search.get("placedTo"), true),
      deliveryCity: search.get("deliveryCity")?.trim() || undefined,
      minTotalCents: parseDollarsToCents(search.get("minTotal")),
      maxTotalCents: parseDollarsToCents(search.get("maxTotal")),
      hasPhone,
      hasEmail,
      limit,
      offset,
      sort,
    },
  };
}

export function staffListPrismaWhere(
  query: StaffListQuery,
): Prisma.OrderWhereInput {
  const and: Prisma.OrderWhereInput[] = [];

  if (query.q) {
    and.push({
      OR: [
        { customerName: { contains: query.q, mode: "insensitive" } },
        { phone: { contains: query.q, mode: "insensitive" } },
        { email: { contains: query.q, mode: "insensitive" } },
        { orderNumber: { contains: query.q, mode: "insensitive" } },
      ],
    });
  }
  if (query.name) {
    and.push({ customerName: { contains: query.name, mode: "insensitive" } });
  }
  if (query.email) {
    and.push({ email: { contains: query.email, mode: "insensitive" } });
  }
  if (query.phone) {
    const orPhone: Prisma.OrderWhereInput[] = [
      { phone: { contains: query.phone, mode: "insensitive" } },
    ];
    const digits = digitsOnly(query.phone);
    if (digits.length >= 4 && digits !== query.phone) {
      orPhone.push({ phone: { contains: digits } });
    }
    and.push({ OR: orPhone });
  }
  if (query.item) {
    and.push({
      items: { some: { name: { contains: query.item, mode: "insensitive" } } },
    });
  }
  if (query.menuItemId) {
    and.push({ items: { some: { menuItemId: query.menuItemId } } });
  }
  if (query.statuses?.length) {
    and.push({ status: { in: query.statuses } });
  }
  if (query.payment) {
    and.push({ paymentStatus: query.payment });
  }
  if (query.fulfillmentType) {
    and.push({ fulfillment: query.fulfillmentType });
  }
  if (query.from) {
    and.push({ preferredDate: { gte: query.from } });
  }
  if (query.to) {
    and.push({ preferredDate: { lte: query.to } });
  }
  if (query.placedFrom) {
    and.push({ createdAt: { gte: query.placedFrom } });
  }
  if (query.placedTo) {
    and.push({ createdAt: { lte: query.placedTo } });
  }
  if (query.deliveryCity) {
    and.push({
      deliveryCity: { equals: query.deliveryCity, mode: "insensitive" },
    });
  }
  if (query.minTotalCents !== undefined) {
    and.push({ totalCents: { gte: query.minTotalCents } });
  }
  if (query.maxTotalCents !== undefined) {
    and.push({ totalCents: { lte: query.maxTotalCents } });
  }
  if (query.hasPhone === true) {
    and.push({ NOT: { OR: [{ phone: "" }, { phone: "—" }] } });
  }
  if (query.hasPhone === false) {
    and.push({ OR: [{ phone: "" }, { phone: "—" }] });
  }
  if (query.hasEmail === true) {
    and.push({ NOT: { email: "" } });
  }
  if (query.hasEmail === false) {
    and.push({ email: "" });
  }

  return and.length ? { AND: and } : {};
}

export function staffListOrderBy(
  sort: StaffListSort,
): Prisma.OrderOrderByWithRelationInput[] {
  switch (sort) {
    case "fulfillmentDate_desc":
      return [{ preferredDate: "desc" }, { createdAt: "desc" }];
    case "fulfillmentDate_asc":
      return [{ preferredDate: "asc" }, { createdAt: "desc" }];
    case "total_desc":
      return [{ totalCents: "desc" }, { createdAt: "desc" }];
    default:
      return [{ createdAt: "desc" }];
  }
}

export function phoneDigitsMatch(
  storedPhone: string,
  queryPhone: string,
): boolean {
  const stored = digitsOnly(storedPhone);
  const want = digitsOnly(queryPhone);
  if (want.length < 4) return storedPhone.toLowerCase().includes(queryPhone.toLowerCase());
  return stored.includes(want);
}
