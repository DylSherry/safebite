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

async function verifyAdmin(idToken: string): Promise<boolean> {
  try {
    const decoded = await admin.auth().verifyIdToken(idToken);
    const userDoc = await db.collection("users").doc(decoded.uid).get();
    return userDoc.data()?.role === "admin";
  } catch {
    return false;
  }
}

function computeSafetyScore(allergens: any) {
  if (!allergens || !Array.isArray(allergens)) return 100;
  const count = allergens.filter((a) => typeof a === "string" && a.toLowerCase() !== "none").length;
  return Math.max(0, 100 - count * 10);
}

export async function PUT(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const authHeader = req.headers.get("authorization") || "";
  const idToken = authHeader.replace("Bearer ", "");

  if (!idToken || !(await verifyAdmin(idToken))) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }

  try {
    const { id: productId } = await params; // unwrap promise
    const body = await req.json();
    const score = computeSafetyScore(body.allergens);
    // Ensure numeric fields are stored as numbers, not strings
    const stockVal = body.stock !== undefined && body.stock !== "" ? Number(body.stock) : undefined;
    const priceVal = body.price !== undefined ? Number(body.price) : undefined;

    await db.collection("products").doc(productId).update({
      ...body,
      ...(priceVal !== undefined && { price: priceVal }),
      ...(stockVal !== undefined && !isNaN(stockVal) && { stock: stockVal }),
      safety_score: score,
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    });

    return NextResponse.json({
      ok: true,
      product: {
        id: productId,
        ...body,
        safety_score: score,
      },
    });
  } catch (err) {
    return NextResponse.json({ error: "Failed to update product" }, { status: 500 });
  }
}

export async function DELETE(req: Request, { params }: { params: { id: string } }) {
  const authHeader = req.headers.get("authorization") || "";
  const idToken = authHeader.replace("Bearer ", "");

  if (!idToken || !(await verifyAdmin(idToken))) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }

  try {
    const productId = params.id;
    await db.collection("products").doc(productId).delete();

    return NextResponse.json({
      ok: true,
      message: "Product deleted successfully",
    });
  } catch (err) {
    return NextResponse.json({ error: "Failed to delete product" }, { status: 500 });
  }
}
