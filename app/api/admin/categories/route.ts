import admin from "firebase-admin";
import { NextResponse } from "next/server";

if (!admin.apps.length) {
  const sa = process.env.FIREBASE_SERVICE_ACCOUNT;
  if (!sa) throw new Error("FIREBASE_SERVICE_ACCOUNT env var is required on the server");
  admin.initializeApp({ credential: admin.credential.cert(JSON.parse(sa)) });
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
  const idToken = (req.headers.get("authorization") || "").replace("Bearer ", "");
  if (!idToken || !(await verifyAdmin(idToken)))
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });

  try {
    const snap = await db.collection("categories").orderBy("name").get();
    const categories = snap.docs.map((d) => ({ id: d.id, ...(d.data() as { name: string }) }));
    return NextResponse.json({ ok: true, categories });
  } catch {
    return NextResponse.json({ error: "Failed to fetch categories" }, { status: 500 });
  }
}

export async function POST(req: Request) {
  const idToken = (req.headers.get("authorization") || "").replace("Bearer ", "");
  if (!idToken || !(await verifyAdmin(idToken)))
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });

  try {
    const { name } = await req.json();
    if (!name?.trim()) return NextResponse.json({ error: "Name is required" }, { status: 400 });
    const ref = await db.collection("categories").add({
      name: name.trim(),
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
    });
    return NextResponse.json({ ok: true, id: ref.id, name: name.trim() });
  } catch {
    return NextResponse.json({ error: "Failed to create category" }, { status: 500 });
  }
}
