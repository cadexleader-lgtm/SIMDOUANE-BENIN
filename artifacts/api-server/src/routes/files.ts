import { Router } from "express";
import { getFileStore, LocalFileStore } from "../lib/files/fileStore";

// Serves the short-lived download links of the local file store (development
// and tests). With Supabase, links point to Supabase Storage directly.
const router = Router();

router.get("/local/:token", async (req, res) => {
  const store = getFileStore();
  if (!(store instanceof LocalFileStore)) {
    res.status(404).json({ error: "Not found" });
    return;
  }
  const file = await store.readWithToken(String(req.params.token));
  if (!file) {
    res.status(403).json({ error: "LINK_INVALID_OR_EXPIRED" });
    return;
  }
  res.setHeader("Content-Type", file.contentType);
  res.setHeader(
    "Content-Disposition",
    `attachment; filename="document"; filename*=UTF-8''${encodeURIComponent(file.fileName)}`,
  );
  res.setHeader("X-Content-Type-Options", "nosniff");
  res.setHeader("Cache-Control", "private, no-store");
  res.send(file.data);
});

export default router;
