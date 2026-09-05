import { randomBytes } from "node:crypto";
import { prisma } from "@/lib/db";
import {
  sendNewOrderEmails,
  staffCreateBakeryEmailEnabled,
} from "@/lib/email";
import { nextOrderNumber } from "@/lib/orders";
import {
  parseStaffListSearch,
  phoneDigitsMatch,
  staffListOrderBy,
  staffListPrismaWhere,
} from "@/lib/staff-order-search";
import {
  quoteStaffCreate,
  toStaffOrderRow,
  type StaffCreateBody,
} from "@/lib/staff-orders";
import {
  isStaffAuthorized,
  staffUnauthorizedResponse,
} from "@/lib/staff-auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const LIST_INCLUDE = {
  items: {
    select: { quantity: true, name: true, menuItemId: true },
  },
} as const;

/**
 * Search / list. Empty filters return the newest `limit` orders (default 50, max 100).
 * GET only — no email, no writes.
 */
export async function GET(request: Request) {
  if (!isStaffAuthorized(request)) {
    return staffUnauthorizedResponse();
  }

  const generatedAt = new Date().toISOString();
  const parsed = parseStaffListSearch(new URL(request.url).searchParams);
  if (!parsed.ok) {
    return Response.json(
      { error: parsed.error, generatedAt },
      { status: 400, headers: { "Cache-Control": "no-store" } },
    );
  }

  const query = parsed.query;
  const where = staffListPrismaWhere({ ...query, phone: undefined });
  const orderBy = staffListOrderBy(query.sort);

  try {
    if (query.phone) {
      const rows = await prisma.order.findMany({
        where,
        include: LIST_INCLUDE,
        orderBy,
        take: 2000,
      });
      const matched = rows.filter((row) =>
        phoneDigitsMatch(row.phone, query.phone!),
      );
      const page = matched.slice(query.offset, query.offset + query.limit);
      const nextOffset =
        query.offset + page.length < matched.length
          ? query.offset + query.limit
          : null;
      return Response.json(
        {
          generatedAt,
          count: page.length,
          orders: page.map((order) => toStaffOrderRow(order)),
          nextOffset,
        },
        { headers: { "Cache-Control": "no-store" } },
      );
    }

    const rows = await prisma.order.findMany({
      where,
      include: LIST_INCLUDE,
      orderBy,
      skip: query.offset,
      take: query.limit + 1,
    });
    const hasMore = rows.length > query.limit;
    const page = hasMore ? rows.slice(0, query.limit) : rows;
    return Response.json(
      {
        generatedAt,
        count: page.length,
        orders: page.map((order) => toStaffOrderRow(order)),
        nextOffset: hasMore ? query.offset + query.limit : null,
      },
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch (err) {
    console.error("Staff order list failed:", err);
    return Response.json(
      { error: "Could not list orders.", generatedAt },
      { status: 503, headers: { "Cache-Control": "no-store" } },
    );
  }
}

function newAccessToken(): string {
  return randomBytes(24).toString("base64url");
}

/**
 * Staff/manual create. Status starts Confirmed, matching kitchen New order.
 * Bakery inbox is notified; customer is not emailed. On TLS EOF after POST,
 * GET Active before creating again — do not POST twice.
 */
export async function POST(request: Request) {
  if (!isStaffAuthorized(request)) {
    return staffUnauthorizedResponse();
  }

  const generatedAt = new Date().toISOString();
  let body: StaffCreateBody;
  try {
    body = (await request.json()) as StaffCreateBody;
  } catch {
    return Response.json(
      { error: "Invalid JSON body.", generatedAt },
      { status: 400, headers: { "Cache-Control": "no-store" } },
    );
  }

  const quoted = quoteStaffCreate(body);
  if (!quoted.ok) {
    return Response.json(
      { error: quoted.error, generatedAt },
      { status: 400, headers: { "Cache-Control": "no-store" } },
    );
  }

  const { input, quote } = { input: quoted.quote.input, quote: quoted.quote };

  try {
    const orderNumber = await nextOrderNumber(async () => {
      const rows = await prisma.order.findMany({
        select: { orderNumber: true },
      });
      return rows.map((r) => r.orderNumber);
    });

    const order = await prisma.order.create({
      data: {
        orderNumber,
        accessToken: newAccessToken(),
        customerName: input.customerName.trim(),
        email: "",
        phone: input.phone?.trim() || "—",
        fulfillment: input.fulfillment,
        deliveryCity:
          input.fulfillment === "delivery"
            ? input.deliveryCity?.trim() || null
            : null,
        deliveryAddress:
          input.fulfillment === "delivery"
            ? input.deliveryAddress?.trim() || null
            : null,
        preferredDate: input.preferredDate,
        preferredTimeWindow: input.preferredTimeWindow?.trim() || null,
        notes: input.notes?.trim() || null,
        status: "confirmed",
        paymentMethod: input.paymentMethod,
        paymentStatus: quote.preview.payment === "Paid" ? "paid" : "unpaid",
        subtotalCents: quote.subtotalCents,
        deliveryFeeCents: quote.deliveryFeeCents,
        totalCents: quote.totalCents,
        items: {
          create: quote.lines.map((line) => ({
            menuItemId: line.menuItemId,
            name: line.name,
            unitLabel: line.unit,
            quantity: line.quantity,
            unitPriceCents: line.unitPriceCents,
            lineTotalCents: line.lineTotalCents,
          })),
        },
      },
      include: { items: true },
    });

    let bakeryEmail = false;
    if (staffCreateBakeryEmailEnabled()) {
      try {
        const mailed = await sendNewOrderEmails({
          id: order.id,
          orderNumber: order.orderNumber,
          accessToken: order.accessToken,
          customerName: order.customerName,
          email: "",
          phone: order.phone,
          fulfillment: order.fulfillment,
          deliveryCity: order.deliveryCity,
          deliveryAddress: order.deliveryAddress,
          preferredDate: order.preferredDate,
          preferredTimeWindow: order.preferredTimeWindow,
          notes: order.notes,
          paymentMethod: order.paymentMethod,
          paymentStatus: order.paymentStatus,
          subtotalCents: order.subtotalCents,
          deliveryFeeCents: order.deliveryFeeCents,
          totalCents: order.totalCents,
          createdAt: order.createdAt.toISOString(),
          createdVia: "staff-api",
          items: order.items.map((item) => ({
            name: item.name,
            unitLabel: item.unitLabel,
            quantity: item.quantity,
            unitPriceCents: item.unitPriceCents,
            lineTotalCents: item.lineTotalCents,
          })),
        });
        bakeryEmail = mailed.kitchen;
      } catch (err) {
        console.error("Staff create bakery email error:", err);
      }
    }

    return Response.json(
      {
        generatedAt: new Date().toISOString(),
        order: toStaffOrderRow(order),
        email: { bakery: bakeryEmail },
      },
      { status: 201, headers: { "Cache-Control": "no-store" } },
    );
  } catch (err) {
    console.error("Staff create order failed:", err);
    return Response.json(
      { error: "Could not create that order.", generatedAt },
      { status: 503, headers: { "Cache-Control": "no-store" } },
    );
  }
}
