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

export async function GET(req: Request) {
  const authHeader = req.headers.get("authorization") || "";
  const idToken = authHeader.replace("Bearer ", "");

  if (!idToken || !(await verifyAdmin(idToken))) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }

  try {
    const snapshot = await db.collection("products").orderBy("name").get();
    const products = snapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    }));
    return NextResponse.json({ ok: true, products });
  } catch (err) {
    return NextResponse.json({ error: "Failed to fetch products" }, { status: 500 });
  }
}

function computeSafetyScore(allergens: any) {
  if (!allergens || !Array.isArray(allergens)) return 100;
  const count = allergens.filter((a) => typeof a === "string" && a.toLowerCase() !== "none").length;
  return Math.max(0, 100 - count * 10);
}

export async function POST(req: Request) {
  const authHeader = req.headers.get("authorization") || "";
  const idToken = authHeader.replace("Bearer ", "");

  if (!idToken || !(await verifyAdmin(idToken))) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }

  try {
    const body = await req.json();
    const score = computeSafetyScore(body.allergens);
    const docRef = db.collection("products").doc();
    await docRef.set({
      ...body,
      safety_score: score,
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    });

    return NextResponse.json({
      ok: true,
      product: {
        id: docRef.id,
        ...body,
        safety_score: score,
      },
    });
  } catch (err) {
    return NextResponse.json({ error: "Failed to create product" }, { status: 500 });
  }
}
