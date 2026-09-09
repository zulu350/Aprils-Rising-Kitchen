import { NextResponse } from "next/server";
import { isAdminAuthenticated } from "@/lib/auth";
import { prisma } from "@/lib/db";
import {
  estimateDrivingMiles,
  formatDestination,
  homeAddress,
  pickLastStop,
} from "@/lib/mileage";

export const runtime = "nodejs";

type Params = { params: Promise<{ id: string }> };

export async function GET(request: Request, { params }: Params) {
  if (!(await isAdminAuthenticated())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  const from = new URL(request.url).searchParams.get("from") ?? "home";
  if (from !== "home" && from !== "last" && from !== "return") {
    return NextResponse.json(
      { error: "from must be home, last, or return." },
      { status: 400 },
    );
  }

  const order = await prisma.order.findUnique({
    where: { id },
    select: {
      id: true,
      orderNumber: true,
      fulfillment: true,
      preferredDate: true,
      deliveryCity: true,
      deliveryAddress: true,
    },
  });
  if (!order) {
    return NextResponse.json({ error: "Order not found" }, { status: 404 });
  }
  if (order.fulfillment !== "delivery") {
    return NextResponse.json(
      { error: "Miles are only estimated on delivery orders." },
      { status: 400 },
    );
  }

  const stop = formatDestination(order.deliveryAddress, order.deliveryCity);
  if (!stop) {
    return NextResponse.json(
      { error: "This order needs a delivery address first." },
      { status: 400 },
    );
  }

  let origin: string | null = null;
  let dest = stop;
  let fromLabel = "Home";

  if (from === "return") {
    const bakery = homeAddress();
    origin = stop;
    fromLabel = order.orderNumber;
    if (!bakery) {
      return NextResponse.json(
        {
          error:
            "Set MILEAGE_HOME (or PICKUP_ADDRESS) in Netlify to estimate the drive home.",
        },
        { status: 400 },
      );
    }
    dest = bakery;
  } else if (from === "home") {
    origin = homeAddress();
    fromLabel = "Home";
    if (!origin) {
      return NextResponse.json(
        {
          error:
            "Set MILEAGE_HOME (or PICKUP_ADDRESS) in Netlify to estimate from home.",
        },
        { status: 400 },
      );
    }
  } else {
    const peers = await prisma.order.findMany({
      where: {
        id: { not: order.id },
        fulfillment: "delivery",
        preferredDate: order.preferredDate,
        status: { not: "cancelled" },
      },
      select: {
        id: true,
        orderNumber: true,
        customerName: true,
        deliveryCity: true,
        deliveryAddress: true,
        deliveryMiles: true,
        updatedAt: true,
      },
      orderBy: { updatedAt: "desc" },
    });
    const last = pickLastStop(peers);
    origin = last
      ? formatDestination(last.deliveryAddress, last.deliveryCity)
      : null;
    fromLabel = last ? last.orderNumber : "Last stop";
    if (!origin) {
      return NextResponse.json(
        { error: "No other delivery stop on this day to estimate from." },
        { status: 400 },
      );
    }
  }

  if (!origin) {
    return NextResponse.json(
      { error: "Could not determine a starting address." },
      { status: 400 },
    );
  }

  try {
    const miles = await estimateDrivingMiles(origin, dest);
    return NextResponse.json({
      miles,
      milesFrom: fromLabel,
      origin,
      destination: dest,
    });
  } catch (err) {
    const message =
      err instanceof Error ? err.message : "Could not estimate miles.";
    console.error("Mileage estimate failed:", message);
    return NextResponse.json({ error: message }, { status: 502 });
  }
}
