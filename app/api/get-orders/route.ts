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

export async function GET(req: Request) {
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
    const snapshot = await db
      .collection("orders")
      .where("uid", "==", uid)
      .get();

    const orders = snapshot.docs
      .map((doc) => {
        const data = doc.data();
        return {
          id: doc.id,
          ...data,
          // Convert Firestore Timestamp to ISO string for JSON serialisation
          createdAt: data.createdAt?.toDate?.().toISOString() ?? null,
        };
      })
      // Sort newest-first in JS (avoids requiring a composite index)
      .sort((a, b) => {
        if (!a.createdAt) return 1;
        if (!b.createdAt) return -1;
        return b.createdAt.localeCompare(a.createdAt);
      });

    return NextResponse.json({ ok: true, orders });
  } catch (err) {
    console.error("get-orders error", err);
    return NextResponse.json({ error: "Failed to fetch orders" }, { status: 500 });
  }
}
