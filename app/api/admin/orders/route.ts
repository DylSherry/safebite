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
  const authHeader = req.headers.get("authorization") || "";
  const idToken = authHeader.replace("Bearer ", "");

  if (!idToken || !(await verifyAdmin(idToken))) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }

  try {
    const snapshot = await db.collection("orders").get();

    // Collect unique UIDs so we can batch-fetch user emails
    const uids = [...new Set(snapshot.docs.map((d) => d.data().uid).filter(Boolean))] as string[];
    const emailMap: Record<string, string> = {};
    await Promise.all(
      uids.map(async (uid) => {
        try {
          const userRecord = await admin.auth().getUser(uid);
          emailMap[uid] = userRecord.email || uid;
        } catch {
          emailMap[uid] = uid;
        }
      })
    );

    const orders = snapshot.docs
      .map((doc) => {
        const data = doc.data();
        return {
          id: doc.id,
          uid:           data.uid,
          userEmail:     emailMap[data.uid] || data.uid || "Unknown",
          items:         data.items,
          total:         data.total,
          delivery:      data.delivery,
          paymentMethod: data.paymentMethod,
          createdAt:     data.createdAt?.toDate?.().toISOString() ?? null,
        };
      })
      .sort((a, b) => {
        if (!a.createdAt) return 1;
        if (!b.createdAt) return -1;
        return b.createdAt.localeCompare(a.createdAt);
      });

    return NextResponse.json({ ok: true, orders });
  } catch (err) {
    console.error("admin/orders GET error", err);
    return NextResponse.json({ error: "Failed to fetch orders" }, { status: 500 });
  }
}


