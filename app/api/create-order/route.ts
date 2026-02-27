import admin from "firebase-admin";
import { NextResponse } from "next/server";

if (!admin.apps.length) {
  const sa = process.env.FIREBASE_SERVICE_ACCOUNT;
  if (!sa) {
    throw new Error("FIREBASE_SERVICE_ACCOUNT env var is required on the server");
  }
  admin.initializeApp({
    credential: admin.credential.cert(JSON.parse(sa)),
  });
}

const db = admin.firestore();

export async function POST(req: Request) {
  // Verify the user is signed in
  const authHeader = req.headers.get("authorization") || "";
  const idToken = authHeader.replace("Bearer ", "");

  if (!idToken) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let uid: string;
  try {
    const decoded = await admin.auth().verifyIdToken(idToken);
    uid = decoded.uid;
  } catch {
    return NextResponse.json({ error: "Invalid token" }, { status: 401 });
  }

  try {
    const body = await req.json();
    const { items, total, delivery, paymentMethod } = body;

    if (!items || !Array.isArray(items) || items.length === 0) {
      return NextResponse.json({ error: "Cart is empty" }, { status: 400 });
    }

    const orderRef = db.collection("orders").doc();
    const order = {
      uid,
      items,
      total,
      delivery,
      paymentMethod,
      status: "confirmed",
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
    };

    await orderRef.set(order);

    return NextResponse.json({
      ok: true,
      orderId: orderRef.id,
    });
  } catch (err) {
    console.error("create-order error", err);
    return NextResponse.json({ error: "Failed to create order" }, { status: 500 });
  }
}
