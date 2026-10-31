import { Router, type IRouter } from "express";
import { getExchangeRates } from "../lib/exchangeRates";
import { sendError } from "../lib/httpErrors";

const router: IRouter = Router();

/** Public: indicative FCFA rates for the simulator's currency field. */
router.get("/", async (req, res) => {
  try {
    const rates = await getExchangeRates();
    res.set("Cache-Control", rates.status === "ok" ? "public, max-age=900" : "no-store");
    res.json(rates);
  } catch (err) {
    sendError(req, res, err);
  }
});

export default router;
