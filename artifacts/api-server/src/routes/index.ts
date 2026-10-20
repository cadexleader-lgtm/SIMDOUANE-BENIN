import { Router, type IRouter } from "express";
import healthRouter from "./health";
import simulationsRouter from "./simulations";
import { plansRouter, subscriptionRouter } from "./subscriptions";
import profileRouter from "./profile";
import adminRouter from "./admin";
import upgradeRequestRouter from "./upgrade-request";

const router: IRouter = Router();

router.use(healthRouter);
router.use("/simulations", simulationsRouter);
router.use("/subscription-plans", plansRouter);
router.use("/subscription", subscriptionRouter);
router.use("/profile", profileRouter);
router.use("/admin", adminRouter);
router.use("/upgrade-request", upgradeRequestRouter);

export default router;
