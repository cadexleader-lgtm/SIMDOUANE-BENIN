/**
 * Phase 2 — accounts, transitaire access, private supporting documents and
 * the security journal. Real PostgreSQL (TEST_DATABASE_URL, emptied between
 * tests), real Express app, local private file store, identity provider stubbed (test/authMock.ts).
 * Only fictitious documents are used.
 */
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import { authAccounts } from "./authMock";
import { FAKE_PDF, PDF, PNG, startTestApp, TEST_DB } from "./harness";

vi.mock("../src/lib/auth/identity", async (importOriginal) => ({
  ...(await importOriginal<typeof import("../src/lib/auth/identity")>()),
  ...(await import("./authMock")),
}));

describe.skipIf(!TEST_DB)("phase 2 — comptes, accès transitaire, justificatifs", () => {
  let app: Awaited<ReturnType<typeof startTestApp>>;
  const call = (...a: Parameters<typeof app.call>) => app.call(...a);
  const upload = (...a: Parameters<typeof app.upload>) => app.upload(...a);
  const query = async (sql: string, params: unknown[] = []) => (await app.pool.query(sql, params)).rows;

  /** Creates the application user (first authenticated call). */
  const signIn = async (user: string) => expect((await call(user, "GET", "/profile")).status).toBe(200);

  /** Alice applies and attaches one fictitious PDF; returns ids. */
  async function applyWithDocument(user = "alice") {
    const res = await call(user, "POST", "/transitaire-access/applications", { agrementNumber: "AGR-TEST-001" });
    expect(res.status).toBe(201);
    const application = await res.json();
    const up = await upload(user, `/transitaire-access/applications/${application.id}/documents`, PDF);
    expect(up.status).toBe(201);
    return { applicationId: application.id as string, fileId: (await up.json()).id as string };
  }

  async function approve(applicationId: string, reason?: string) {
    return call("admin", "POST", `/admin/transitaire-applications/${applicationId}/decision`, { decision: "approve", reason });
  }

  beforeAll(async () => {
    app = await startTestApp();
  });
  beforeEach(async () => {
    await app.reset();
  });
  afterAll(async () => {
    await app?.close();
  });

  describe("comptes existants : jamais de fusion automatique", () => {
    it("refuse un nouveau compte (Supabase Auth) dont l'email appartient déjà à un compte, sans rien modifier", async () => {
      await query(
        `INSERT INTO users (id, clerk_id, email, full_name) VALUES ('old-user', 'user_replit_old', 'ancien@example.test', 'Ancien')`,
      );
      await query(`INSERT INTO simulations (id, user_id, marque, modele, annee, cylindree, carburant, valeur_cif, regime, total_douane, total_port, total_general)
                   VALUES ('sim-old', 'old-user', 'Toyota', 'Hilux', 2015, 'gt2500', 'Diesel', 1, 'Droit commun', 1, 1, 1)`);
      // Same address, different case, on a new Supabase Auth account.
      authAccounts.set("user_new_auth", { email: "ANCIEN@example.test", confirmed: true });

      const res = await call("user_new_auth", "GET", "/profile");
      expect(res.status).toBe(409);
      expect((await res.json()).error).toBe("ACCOUNT_LINK_REQUIRED");

      expect(await query(`SELECT id, clerk_id FROM users ORDER BY id`)).toEqual([{ id: "old-user", clerk_id: "user_replit_old" }]);
      expect(await query(`SELECT user_id FROM simulations`)).toEqual([{ user_id: "old-user" }]);
      const logs = await query(`SELECT action, target_id, details FROM audit_logs`);
      expect(logs).toEqual([
        { action: "account.email_conflict", target_id: "old-user", details: { newAuthUserId: "user_new_auth", emailVerified: true } },
      ]);
    });

    it("ne crée pas de compte avec une adresse inventée si le service d'authentification ne répond pas", async () => {
      authAccounts.set("bob", { fail: true });
      const res = await call("bob", "GET", "/profile");
      expect(res.status).toBe(503);
      expect(await query(`SELECT count(*)::int AS n FROM users`)).toEqual([{ n: 0 }]);
    });
  });

  describe("profil particulier / entreprise", () => {
    it("entreprise : raison sociale obligatoire, IFU facultatif, organisation créée avec un seul propriétaire", async () => {
      const missing = await call("alice", "PUT", "/profile", { accountKind: "entreprise" });
      expect(missing.status).toBe(400);
      expect((await missing.json()).error).toBe("LEGAL_NAME_REQUIRED");

      const badIfu = await call("alice", "PUT", "/profile", { accountKind: "entreprise", legalName: "Auto Import SARL", ifu: "12-34" });
      expect(badIfu.status).toBe(400);

      const ok = await call("alice", "PUT", "/profile", { accountKind: "entreprise", legalName: "Auto Import SARL", ifu: "0000 0000 0000 0" });
      expect(ok.status).toBe(200);
      const profile = await ok.json();
      expect(profile.accountKind).toBe("entreprise");
      expect(profile.organization).toMatchObject({ legalName: "Auto Import SARL", ifu: "0000000000000" });
      expect(await query(`SELECT role FROM organization_members`)).toEqual([{ role: "owner" }]);

      // Back to particulier: the company record is kept (retention), no duplicate.
      const back = await call("alice", "PUT", "/profile", { accountKind: "particulier" });
      expect((await back.json()).accountKind).toBe("particulier");
      await call("alice", "PUT", "/profile", { accountKind: "entreprise", legalName: "Auto Import SA" });
      expect(await query(`SELECT legal_name FROM organizations`)).toEqual([{ legal_name: "Auto Import SA" }]);
    });

    it("les champs existants du profil (dont null) fonctionnent comme avant", async () => {
      await call("alice", "PUT", "/profile", { phone: "+22900000000", poste: "Importateur de véhicules", onboarded: true });
      const cleared = await call("alice", "PUT", "/profile", { phone: null });
      expect(cleared.status).toBe(200);
      const profile = await cleared.json();
      expect(profile).toMatchObject({ phone: null, poste: "Importateur de véhicules", onboarded: true });
    });
  });

  describe("accès transitaire : seule une approbation de l'administrateur l'accorde", () => {
    it("le poste déclaré ou un champ forgé dans le profil n'accorde aucun droit", async () => {
      const res = await call("alice", "PUT", "/profile", { poste: "Transitaire", transitaireStatus: "active" });
      expect((await res.json()).transitaireStatus).toBe("none");
      const space = await call("alice", "GET", "/transitaire/space");
      expect(space.status).toBe(403);
      expect((await space.json()).error).toBe("TRANSITAIRE_NOT_ACTIVE");
    });

    it("un compte dont la demande est en attente n'accède pas aux fonctions réservées", async () => {
      await applyWithDocument();
      const access = await (await call("alice", "GET", "/transitaire-access")).json();
      expect(access).toMatchObject({ status: "pending", canApply: false });
      expect((await call("alice", "GET", "/transitaire/space")).status).toBe(403);
      expect((await call(null, "GET", "/transitaire/space")).status).toBe(401);
    });

    it("une seule demande en cours par compte ; numéro d'agrément obligatoire", async () => {
      expect((await call("alice", "POST", "/transitaire-access/applications", { agrementNumber: " " })).status).toBe(400);
      await applyWithDocument();
      const again = await call("alice", "POST", "/transitaire-access/applications", { agrementNumber: "AGR-2" });
      expect(again.status).toBe(409);
      expect((await again.json()).error).toBe("APPLICATION_PENDING");
    });

    it("approbation : impossible sans justificatif, puis droits actifs avec décision tracée", async () => {
      await signIn("admin");
      const res = await call("alice", "POST", "/transitaire-access/applications", { agrementNumber: "AGR-TEST-001" });
      const { id } = await res.json();
      const noDoc = await approve(id);
      expect(noDoc.status).toBe(422);
      expect((await noDoc.json()).error).toBe("JUSTIFICATIF_REQUIRED");

      await upload("alice", `/transitaire-access/applications/${id}/documents`, PDF);
      const ok = await approve(id, "Agrément vérifié sur justificatif (test)");
      expect(ok.status).toBe(200);
      const detail = await ok.json();
      expect(detail.application).toMatchObject({ status: "approved", decisionReason: "Agrément vérifié sur justificatif (test)" });
      expect(detail.application.decidedAt).toBeTruthy();
      expect(detail.user.transitaireStatus).toBe("active");
      expect(detail.decisions).toMatchObject([{ decision: "approved", decidedByName: "admin" }]);

      const space = await call("alice", "GET", "/transitaire/space");
      expect(space.status).toBe(200);
      expect((await space.json()).status).toBe("active");
      expect((await approve(id)).status).toBe(409); // already decided
    });

    it("refus : motif enregistré, statut revenu à « aucun », nouvelle demande possible", async () => {
      await signIn("admin");
      const { applicationId } = await applyWithDocument();
      const res = await call("admin", "POST", `/admin/transitaire-applications/${applicationId}/decision`, {
        decision: "reject",
        reason: "Justificatif illisible",
      });
      expect(res.status).toBe(200);
      const access = await (await call("alice", "GET", "/transitaire-access")).json();
      expect(access).toMatchObject({ status: "none", canApply: true });
      expect(access.applications[0]).toMatchObject({ status: "rejected", decisionReason: "Justificatif illisible" });
      expect((await call("alice", "GET", "/transitaire/space")).status).toBe(403);
      expect((await call("alice", "POST", "/transitaire-access/applications", { agrementNumber: "AGR-3" })).status).toBe(201);
    });

    it("suspension, rétablissement et révocation, avec motif obligatoire et historique", async () => {
      await signIn("admin");
      const { applicationId } = await applyWithDocument();
      await approve(applicationId);
      const [{ id: aliceId }] = await query(`SELECT id FROM users WHERE auth_user_id = 'alice'`);
      const change = (action: string, reason?: string) =>
        call("admin", "POST", `/admin/users/${aliceId}/transitaire-status`, { action, reason });

      expect((await change("suspend")).status).toBe(400); // reason required
      expect((await change("reinstate")).status).toBe(409); // not suspended
      expect((await change("suspend", "Plainte en cours d'examen")).status).toBe(200);
      expect((await call("alice", "GET", "/transitaire/space")).status).toBe(403);
      const reapply = await call("alice", "POST", "/transitaire-access/applications", { agrementNumber: "AGR-4" });
      expect((await reapply.json()).error).toBe("ACCESS_SUSPENDED");

      expect((await change("reinstate")).status).toBe(200);
      expect((await call("alice", "GET", "/transitaire/space")).status).toBe(200);

      expect((await change("revoke")).status).toBe(400);
      expect((await change("revoke", "Agrément retiré")).status).toBe(200);
      expect((await call("alice", "GET", "/transitaire/space")).status).toBe(403);

      const detail = await (await call("admin", "GET", `/admin/transitaire-applications/${applicationId}`)).json();
      expect(detail.decisions.map((d: { decision: string; reason: string | null }) => [d.decision, d.reason])).toEqual([
        ["revoked", "Agrément retiré"],
        ["reinstated", null],
        ["suspended", "Plainte en cours d'examen"],
        ["approved", null],
      ]);
      const listed = await (await call("admin", "GET", "/admin/transitaires")).json();
      expect(listed).toMatchObject([{ id: aliceId, transitaireStatus: "revoked" }]);
    });

    it("un administrateur ne peut ni approuver sa propre demande ni modifier ses propres droits", async () => {
      const { applicationId } = await applyWithDocument("admin");
      const res = await approve(applicationId);
      expect(res.status).toBe(403);
      expect((await res.json()).error).toBe("SELF_DECISION_FORBIDDEN");
    });
  });

  describe("administration : contrôle serveur", () => {
    it("toutes les routes d'administration transitaire refusent un non-administrateur", async () => {
      const { applicationId, fileId } = await applyWithDocument();
      const [{ id: aliceId }] = await query(`SELECT id FROM users WHERE auth_user_id = 'alice'`);
      const attempts: [string, string, unknown?][] = [
        ["GET", "/admin/transitaire-applications"],
        ["GET", `/admin/transitaire-applications/${applicationId}`],
        ["POST", `/admin/transitaire-applications/${applicationId}/documents/${fileId}/download-link`],
        ["POST", `/admin/transitaire-applications/${applicationId}/decision`, { decision: "approve" }],
        ["GET", "/admin/transitaires"],
        ["POST", `/admin/users/${aliceId}/transitaire-status`, { action: "suspend", reason: "x" }],
        ["GET", "/admin/audit-logs"],
      ];
      for (const [method, path, body] of attempts) {
        expect((await call("alice", method, path, body)).status, `${method} ${path}`).toBe(403);
        expect((await call(null, method, path, body)).status, `${method} ${path} sans session`).toBe(401);
      }
      expect(await query(`SELECT transitaire_status FROM users WHERE id = $1`, [aliceId])).toEqual([{ transitaire_status: "pending" }]);
    });

    it("l'adresse d'administration doit être confirmée dans Supabase Auth", async () => {
      authAccounts.set("admin", { confirmed: false });
      await signIn("admin");
      const denied = await call("admin", "GET", "/admin/transitaire-applications");
      expect(denied.status).toBe(403);
      expect((await denied.json()).error).toBe("ADMIN_EMAIL_NOT_VERIFIED");

      authAccounts.set("admin", { confirmed: true });
      expect((await call("admin", "GET", "/admin/transitaire-applications")).status).toBe(200);
      expect(await query(`SELECT email_verified FROM users WHERE auth_user_id = 'admin'`)).toEqual([{ email_verified: true }]);
    });
  });

  describe("justificatifs : stockage privé, liens temporaires, journal", () => {
    it("vérifie le vrai type, la taille et le nombre de fichiers", async () => {
      const res = await call("alice", "POST", "/transitaire-access/applications", { agrementNumber: "AGR-TEST-001" });
      const { id } = await res.json();
      const path = `/transitaire-access/applications/${id}/documents`;

      const fake = await upload("alice", path, FAKE_PDF, "faux.pdf");
      expect(fake.status).toBe(415);
      expect((await upload("alice", path, new Uint8Array(0))).status).toBe(400);
      const big = new Uint8Array(200 * 1024 + 1);
      big.set(PDF);
      expect((await upload("alice", path, big)).status).toBe(413);

      const png = await upload("alice", path, PNG, "../../etc/carte agrément.png");
      expect(png.status).toBe(201);
      expect(await png.json()).toMatchObject({ contentType: "image/png", originalName: "carte agrément.png" });
      for (let i = 0; i < 4; i++) expect((await upload("alice", path, PDF)).status).toBe(201);
      expect((await upload("alice", path, PDF)).status).toBe(409); // 5 maximum

      const keys = await query(`SELECT storage_key FROM stored_files`);
      for (const { storage_key } of keys) expect(storage_key).toMatch(/^transitaire-applications\/[0-9a-f-]+\/[0-9a-f-]+\.(pdf|png)$/);
    });

    it("un autre utilisateur ne peut ni déposer, ni obtenir un lien, ni deviner l'adresse d'un fichier", async () => {
      const { applicationId, fileId } = await applyWithDocument();
      expect((await upload("bob", `/transitaire-access/applications/${applicationId}/documents`, PDF)).status).toBe(404);
      expect(
        (await call("bob", "POST", `/transitaire-access/applications/${applicationId}/documents/${fileId}/download-link`)).status,
      ).toBe(404);
      expect((await call(null, "POST", `/transitaire-access/applications/${applicationId}/documents/${fileId}/download-link`)).status).toBe(401);
      // No public path to the stored bytes.
      const [{ storage_key }] = await query(`SELECT storage_key FROM stored_files`);
      expect((await fetch(`${app.baseUrl}/${storage_key}`)).status).toBe(404);
      expect((await fetch(`${app.baseUrl}/api/files/local/${storage_key.replace(/\//g, "_")}`)).status).toBe(403);
    });

    it("le propriétaire obtient un lien temporaire qui force le téléchargement ; un lien modifié est refusé", async () => {
      const { applicationId, fileId } = await applyWithDocument();
      const link = await (await call("alice", "POST", `/transitaire-access/applications/${applicationId}/documents/${fileId}/download-link`)).json();
      expect(link.expiresInSeconds).toBe(60);
      const file = await fetch(`${app.baseUrl}${link.url}`);
      expect(file.status).toBe(200);
      expect(Buffer.from(await file.arrayBuffer()).equals(Buffer.from(PDF))).toBe(true);
      expect(file.headers.get("content-disposition")).toMatch(/^attachment;/);
      expect(file.headers.get("x-content-type-options")).toBe("nosniff");
      expect(file.headers.get("cache-control")).toContain("no-store");

      const [body, signature] = String(link.url).split("/").pop()!.split(".");
      const tampered = `${body.slice(0, -2)}AA.${signature}`;
      expect((await fetch(`${app.baseUrl}/api/files/local/${tampered}`)).status).toBe(403);
    });

    it("un lien expiré est refusé", async () => {
      const { LocalFileStore } = await import("../src/lib/files/fileStore");
      const store = new LocalFileStore(process.env.FILE_STORAGE_DIR!, Buffer.from(process.env.FILE_URL_SIGNING_SECRET!));
      await applyWithDocument();
      const [{ storage_key }] = await query(`SELECT storage_key FROM stored_files`);
      const expired = await store.createDownloadUrl(storage_key, { fileName: "x.pdf", contentType: "application/pdf", expiresInSeconds: -1 });
      expect((await fetch(`${app.baseUrl}${expired}`)).status).toBe(403);
      const valid = await store.createDownloadUrl(storage_key, { fileName: "x.pdf", contentType: "application/pdf", expiresInSeconds: 60 });
      expect((await fetch(`${app.baseUrl}${valid}`)).status).toBe(200);
    });

    it("chaque consultation d'un justificatif par l'administrateur est journalisée", async () => {
      await signIn("admin");
      const { applicationId, fileId } = await applyWithDocument();
      const path = `/admin/transitaire-applications/${applicationId}/documents/${fileId}/download-link`;
      for (let i = 0; i < 2; i++) {
        const res = await call("admin", "POST", path);
        expect(res.status).toBe(200);
        expect((await fetch(`${app.baseUrl}${(await res.json()).url}`)).status).toBe(200);
      }
      const logs = await query(
        `SELECT l.actor_role, u.auth_user_id AS actor, l.target_id, l.details->>'applicationId' AS application_id
           FROM audit_logs l JOIN users u ON u.id = l.actor_user_id
          WHERE l.action = 'file.download_link_issued' ORDER BY l.created_at`,
      );
      expect(logs).toEqual([
        { actor_role: "admin", actor: "admin", target_id: fileId, application_id: applicationId },
        { actor_role: "admin", actor: "admin", target_id: fileId, application_id: applicationId },
      ]);
      const viaApi = await (await call("admin", "GET", `/admin/audit-logs?targetType=stored_file&targetId=${fileId}`)).json();
      expect(viaApi.map((l: { action: string }) => l.action)).toEqual([
        "file.download_link_issued",
        "file.download_link_issued",
        "file.uploaded",
      ]);
    });

    it("l'administrateur ne peut obtenir un lien que pour un justificatif de la demande indiquée", async () => {
      await signIn("admin");
      const a = await applyWithDocument("alice");
      const b = await applyWithDocument("bob");
      const res = await call("admin", "POST", `/admin/transitaire-applications/${a.applicationId}/documents/${b.fileId}/download-link`);
      expect(res.status).toBe(404);
      expect(await query(`SELECT count(*)::int AS n FROM audit_logs WHERE action = 'file.download_link_issued'`)).toEqual([{ n: 0 }]);
    });

    it("le journal et l'historique des décisions ne peuvent pas être modifiés", async () => {
      await applyWithDocument();
      await expect(query(`UPDATE audit_logs SET action = 'x'`)).rejects.toThrow(/ajout seul/);
      await expect(query(`DELETE FROM audit_logs`)).rejects.toThrow(/ajout seul/);
    });
  });

  describe("demandes d'abonnement Mobile Money : règles inchangées", () => {
    const fullRequest = {
      planWanted: "Standard",
      durationMonths: 1,
      mobileMoneyPhone: "+22900000000",
      mobileMoneyOperator: "MTN MoMo",
      transactionReference: "REF-TEST-1",
      declaredAmount: 2500,
    };

    it("une demande incomplète (ancien bouton du tableau de bord) est toujours refusée", async () => {
      expect((await call("alice", "POST", "/upgrade-request", { planWanted: "Standard" })).status).toBe(400);
    });

    it("une demande complète est enregistrée, unique, visible et traitée par l'administrateur", async () => {
      await signIn("admin");
      const res = await call("alice", "POST", "/upgrade-request", fullRequest);
      expect(res.status).toBe(201);
      const { id } = await res.json();
      expect((await call("alice", "POST", "/upgrade-request", fullRequest)).status).toBe(409);

      const list = await (await call("admin", "GET", "/admin/upgrade-requests")).json();
      expect(list).toMatchObject([{ id, status: "submitted", transactionReference: "REF-TEST-1", declaredAmount: 2500 }]);
      expect((await call("admin", "PUT", `/admin/upgrade-requests/${id}/process`, { status: "approved", note: "ok" })).status).toBe(200);
      const after = await (await call("admin", "GET", "/admin/upgrade-requests")).json();
      expect(after[0]).toMatchObject({ status: "approved", processedNote: "ok" });
    });
  });
});
