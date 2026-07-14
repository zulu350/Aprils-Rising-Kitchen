import { NextResponse } from "next/server";
import {
  isOrderStatus,
  isPaymentStatus,
} from "@/lib/admin-orders";
import { isAdminAuthenticated } from "@/lib/auth";
import { prisma } from "@/lib/db";

export const runtime = "nodejs";

type Params = { params: Promise<{ id: string }> };

export async function GET(_request: Request, { params }: Params) {
  if (!(await isAdminAuthenticated())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  const order = await prisma.order.findUnique({
    where: { id },
    include: { items: true },
  });

  if (!order) {
    return NextResponse.json({ error: "Order not found" }, { status: 404 });
  }

  return NextResponse.json({
    order: {
      ...order,
      pickupAddress:
        order.fulfillment === "pickup"
          ? process.env.PICKUP_ADDRESS?.trim() || null
          : null,
    },
  });
}

export async function PATCH(request: Request, { params }: Params) {
  if (!(await isAdminAuthenticated())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  let body: { status?: string; paymentStatus?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const data: { status?: string; paymentStatus?: string } = {};
  if (body.status !== undefined) {
    if (!isOrderStatus(body.status)) {
      return NextResponse.json({ error: "Invalid status" }, { status: 400 });
    }
    data.status = body.status;
  }
  if (body.paymentStatus !== undefined) {
    if (!isPaymentStatus(body.paymentStatus)) {
      return NextResponse.json(
        { error: "Invalid payment status" },
        { status: 400 },
      );
    }
    data.paymentStatus = body.paymentStatus;
  }

  if (Object.keys(data).length === 0) {
    return NextResponse.json({ error: "Nothing to update" }, { status: 400 });
  }

  try {
    const order = await prisma.order.update({
      where: { id },
      data,
      include: { items: true },
    });
    return NextResponse.json({ order });
  } catch {
    return NextResponse.json({ error: "Order not found" }, { status: 404 });
  }
}

export async function DELETE(_request: Request, { params }: Params) {
  if (!(await isAdminAuthenticated())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;

  try {
    // OrderItem rows cascade-delete via Prisma schema relation
    const order = await prisma.order.delete({
      where: { id },
    });
    return NextResponse.json({
      ok: true,
      orderNumber: order.orderNumber,
    });
  } catch {
    return NextResponse.json({ error: "Order not found" }, { status: 404 });
  }
}
