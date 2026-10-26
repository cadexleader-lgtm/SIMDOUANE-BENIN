import { Router } from "express";
import { db } from "@workspace/db";
import { upgradeRequestsTable, usersTable } from "@workspace/db";
import { eq, and, inArray } from "drizzle-orm";
import { requireAuth } from "../middlewares/requireAuth";
import { getOrCreateUser } from "../lib/userUtils";
import { sendError } from "../lib/httpErrors";

const router = Router();

// POST /api/upgrade-request  — user sends a request
router.post("/", requireAuth, async (req, res) => {
  try {
    const clerkUserId = (req as any).clerkUserId as string;
    const user = await getOrCreateUser(clerkUserId, req);

    const {
      planWanted,
      durationMonths,
      mobileMoneyPhone,
      mobileMoneyOperator,
      transactionReference,
      declaredAmount,
      receiptUrl,
      message,
    } = req.body as {
      planWanted?: string;
      durationMonths?: number;
      mobileMoneyPhone?: string;
      mobileMoneyOperator?: string;
      transactionReference?: string;
      declaredAmount?: number;
      receiptUrl?: string;
      message?: string;
    };

    if (!planWanted || !["Standard", "Pro"].includes(planWanted)) {
      res.status(400).json({ error: "A valid paid plan is required" });
      return;
    }
    if (!mobileMoneyPhone || !mobileMoneyOperator || !transactionReference || !declaredAmount || declaredAmount <= 0) {
      res.status(400).json({ error: "Mobile Money phone, operator, reference and amount are required" });
      return;
    }
    if (durationMonths !== undefined && ![1, 3, 6, 12].includes(durationMonths)) {
      res.status(400).json({ error: "Duration must be 1, 3, 6 or 12 months" });
      return;
    }

    // Keep the audit trail. Do not delete a previous request and do not allow
    // multiple requests to be reviewed at the same time for one account.
    const openStatuses = ["pending", "submitted", "payment_under_review", "approved"] as const;
    const existing = await db
      .select({ id: upgradeRequestsTable.id, status: upgradeRequestsTable.status })
      .from(upgradeRequestsTable)
      .where(and(eq(upgradeRequestsTable.userId, user.id), inArray(upgradeRequestsTable.status, openStatuses)));

    if (existing.length) {
      res.status(409).json({
        error: "An upgrade request is already being reviewed",
        requestId: existing[0].id,
        status: existing[0].status,
      });
      return;
    }

    const [request] = await db
      .insert(upgradeRequestsTable)
      .values({
        userId:       user.id,
        userEmail:    user.email,
        userFullName: user.fullName ?? null,
        planWanted:   planWanted ?? null,
        durationMonths: durationMonths ?? null,
        mobileMoneyPhone,
        mobileMoneyOperator,
        transactionReference,
        declaredAmount: String(declaredAmount),
        receiptUrl: receiptUrl ?? null,
        message:      message ?? null,
        status:       "submitted",
      })
      .returning();

    res.status(201).json({ ok: true, id: request.id });
  } catch (err) {
    sendError(req, res, err);
  }
});

export default router;
