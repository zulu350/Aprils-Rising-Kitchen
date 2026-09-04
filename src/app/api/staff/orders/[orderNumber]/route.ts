import { prisma } from "@/lib/db";
import {
  parseStaffDate,
  parseStaffNotes,
  parseStaffPayment,
  parseStaffPhone,
  parseStaffStatus,
  toStaffOrderRow,
} from "@/lib/staff-orders";
import {
  isStaffAuthorized,
  staffUnauthorizedResponse,
} from "@/lib/staff-auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type Params = { params: Promise<{ orderNumber: string }> };

type PatchBody = {
  status?: unknown;
  payment?: unknown;
  fulfillmentDate?: unknown;
  fulfillmentType?: unknown;
  customerPhone?: unknown;
  notes?: unknown;
  items?: unknown;
};

function json(data: unknown, status = 200) {
  return Response.json(data, {
    status,
    headers: { "Cache-Control": "no-store" },
  });
}

function normalizeOrderNumber(raw: string): string {
  return decodeURIComponent(raw).trim().toUpperCase();
}

async function findByOrderNumber(orderNumber: string) {
  return prisma.order.findUnique({
    where: { orderNumber },
    include: { items: { select: { quantity: true, name: true } } },
  });
}

/** Read one order so CoS can echo it before a write. */
export async function GET(request: Request, { params }: Params) {
  if (!isStaffAuthorized(request)) {
    return staffUnauthorizedResponse();
  }

  const { orderNumber: raw } = await params;
  const orderNumber = normalizeOrderNumber(raw);
  const generatedAt = new Date().toISOString();

  try {
    const order = await findByOrderNumber(orderNumber);
    if (!order) {
      return json({ error: "Order not found.", generatedAt }, 404);
    }
    return json({ generatedAt, order: toStaffOrderRow(order) });
  } catch (err) {
    console.error("Staff order GET failed:", err);
    return json({ error: "Could not load that order.", generatedAt }, 503);
  }
}

/**
 * 2a writes only: status, Paid/Unpaid, fulfillment date, phone, notes.
 * No item edits, no pickup↔delivery, no customer email.
 */
export async function PATCH(request: Request, { params }: Params) {
  if (!isStaffAuthorized(request)) {
    return staffUnauthorizedResponse();
  }

  const { orderNumber: raw } = await params;
  const orderNumber = normalizeOrderNumber(raw);
  const generatedAt = new Date().toISOString();

  let body: PatchBody;
  try {
    body = (await request.json()) as PatchBody;
  } catch {
    return json({ error: "Invalid JSON body.", generatedAt }, 400);
  }

  if (body.items !== undefined) {
    return json(
      { error: "Item edits are not enabled on this endpoint.", generatedAt },
      400,
    );
  }
  if (body.fulfillmentType !== undefined) {
    return json(
      {
        error:
          "Changing pickup/delivery is not enabled on this endpoint.",
        generatedAt,
      },
      400,
    );
  }

  const data: Record<string, unknown> = {};

  if (body.status !== undefined) {
    const parsed = parseStaffStatus(body.status);
    if (!parsed.ok) return json({ error: parsed.error, generatedAt }, 400);
    data.status = parsed.value;
  }
  if (body.payment !== undefined) {
    const parsed = parseStaffPayment(body.payment);
    if (!parsed.ok) return json({ error: parsed.error, generatedAt }, 400);
    data.paymentStatus = parsed.value;
  }
  if (body.fulfillmentDate !== undefined) {
    const parsed = parseStaffDate(body.fulfillmentDate);
    if (!parsed.ok) return json({ error: parsed.error, generatedAt }, 400);
    data.preferredDate = parsed.value;
  }
  if (body.customerPhone !== undefined) {
    const parsed = parseStaffPhone(body.customerPhone);
    if (!parsed.ok) return json({ error: parsed.error, generatedAt }, 400);
    data.phone = parsed.value;
  }
  if (body.notes !== undefined) {
    const parsed = parseStaffNotes(body.notes);
    if (!parsed.ok) return json({ error: parsed.error, generatedAt }, 400);
    data.notes = parsed.value;
  }

  if (Object.keys(data).length === 0) {
    return json({ error: "Nothing to update.", generatedAt }, 400);
  }

  try {
    const existing = await prisma.order.findUnique({
      where: { orderNumber },
      select: { id: true },
    });
    if (!existing) {
      return json({ error: "Order not found.", generatedAt }, 404);
    }

    const order = await prisma.order.update({
      where: { orderNumber },
      data,
      include: { items: { select: { quantity: true, name: true } } },
    });

    return json({
      generatedAt: new Date().toISOString(),
      order: toStaffOrderRow(order),
    });
  } catch (err) {
    console.error("Staff order PATCH failed:", err);
    return json({ error: "Could not update that order.", generatedAt }, 503);
  }
}
