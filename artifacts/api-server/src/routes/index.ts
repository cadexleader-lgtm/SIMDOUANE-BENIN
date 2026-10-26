import { Router, type IRouter } from "express";
import healthRouter from "./health";
import simulationsRouter from "./simulations";
import { plansRouter, subscriptionRouter } from "./subscriptions";
import profileRouter from "./profile";
import adminRouter from "./admin";
import upgradeRequestRouter from "./upgrade-request";
import adminTransitairesRouter from "./admin-transitaires";
import filesRouter from "./files";
import casesRouter from "./cases";
import { transitaireAccessRouter, transitaireSpaceRouter } from "./transitaire-access";

const router: IRouter = Router();

router.use(healthRouter);
router.use("/simulations", simulationsRouter);
router.use("/subscription-plans", plansRouter);
router.use("/subscription", subscriptionRouter);
router.use("/profile", profileRouter);
router.use("/admin", adminRouter);
router.use("/admin", adminTransitairesRouter);
router.use("/upgrade-request", upgradeRequestRouter);
router.use("/transitaire-access", transitaireAccessRouter);
router.use("/transitaire", transitaireSpaceRouter);
router.use("/files", filesRouter);
router.use("/cases", casesRouter);

export default router;
