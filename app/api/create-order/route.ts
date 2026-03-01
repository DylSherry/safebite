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

    // Validate item shape
    for (const item of items) {
      if (!item.id || typeof item.quantity !== "number" || item.quantity < 1) {
        return NextResponse.json({ error: "Invalid item in cart" }, { status: 400 });
      }
    }

    const orderRef = db.collection("orders").doc();
    const productRefs = (items as { id: string }[]).map((item) =>
      db.collection("products").doc(item.id)
    );

    // Run everything in a transaction so stock decrements are atomic.
    // NOTE: Firebase Admin SDK transactions require sequential reads (no Promise.all).
    await db.runTransaction(async (tx) => {
      // ── Read phase ───────────────────────────────────────────────────────
      const productSnaps: admin.firestore.DocumentSnapshot[] = [];
      for (const ref of productRefs) {
        productSnaps.push(await tx.get(ref));
      }

      // ── Validation phase ─────────────────────────────────────────────────
      for (let i = 0; i < items.length; i++) {
        const snap = productSnaps[i];
        if (!snap.exists) {
          throw new Error(`Product "${items[i].name || items[i].id}" no longer exists`);
        }
        const data = snap.data()!;
        // Coerce to number in case Firestore stored it as a string
        const currentStock = Number(data.stock);
        if (!isNaN(currentStock)) {
          if (currentStock < items[i].quantity) {
            throw new Error(
              `"${data.name}" only has ${currentStock} unit${currentStock === 1 ? "" : "s"} left in stock`
            );
          }
        }
      }

      // ── Write phase ──────────────────────────────────────────────────────
      tx.set(orderRef, {
        uid,
        items,
        total,
        delivery,
        paymentMethod,
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
      });

      for (let i = 0; i < items.length; i++) {
        const data = productSnaps[i].data()!;
        const currentStock = Number(data.stock);
        const updates: Record<string, unknown> = {
          // Always increment salesCount by the quantity ordered
          salesCount: admin.firestore.FieldValue.increment(items[i].quantity),
        };

        if (!isNaN(currentStock)) {
          console.log(
            `[create-order] Decrementing stock for "${data.name}" (${items[i].id}): ${currentStock} → ${currentStock - items[i].quantity}`
          );
          updates.stock = admin.firestore.FieldValue.increment(-items[i].quantity);
        } else {
          console.log(
            `[create-order] Skipping stock update for "${data.name}" (${items[i].id}): stock field is "${data.stock}" (not a number)`
          );
        }

        tx.update(productRefs[i], updates);
      }
    });

    console.log(`[create-order] Order ${orderRef.id} created successfully for uid ${uid}`);
    return NextResponse.json({ ok: true, orderId: orderRef.id });
  } catch (err) {
    console.error("[create-order] Error:", err);
    const message = err instanceof Error ? err.message : "Failed to create order";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
