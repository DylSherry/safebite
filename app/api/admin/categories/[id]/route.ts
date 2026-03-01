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

export async function PUT(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const idToken = (req.headers.get("authorization") || "").replace("Bearer ", "");
  if (!idToken || !(await verifyAdmin(idToken)))
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });

  try {
    const { id } = await params;
    const { name } = await req.json();
    if (!name?.trim()) return NextResponse.json({ error: "Name is required" }, { status: 400 });
    await db.collection("categories").doc(id).update({
      name: name.trim(),
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    });
    return NextResponse.json({ ok: true, id, name: name.trim() });
  } catch {
    return NextResponse.json({ error: "Failed to rename category" }, { status: 500 });
  }
}

export async function DELETE(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const idToken = (req.headers.get("authorization") || "").replace("Bearer ", "");
  if (!idToken || !(await verifyAdmin(idToken)))
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });

  try {
    const { id } = await params;
    await db.collection("categories").doc(id).delete();
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: "Failed to delete category" }, { status: 500 });
  }
}
