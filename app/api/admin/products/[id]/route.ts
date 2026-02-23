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

export async function PUT(req: Request, { params }: { params: { id: string } }) {
  const authHeader = req.headers.get("authorization") || "";
  const idToken = authHeader.replace("Bearer ", "");

  if (!idToken || !(await verifyAdmin(idToken))) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }

  try {
    const productId = params.id;
    const body = await req.json();

    await db.collection("products").doc(productId).update({
      ...body,
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    });

    return NextResponse.json({
      ok: true,
      product: {
        id: productId,
        ...body,
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
