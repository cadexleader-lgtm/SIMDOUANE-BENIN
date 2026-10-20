import { useState } from "react";
import { format } from "date-fns";
import {
  Users, Calculator, CreditCard, TrendingUp, Search, Shield,
  ChevronDown, CheckCircle, XCircle, Crown, Loader2, AlertTriangle,
} from "lucide-react";
import {
  useGetAdminDashboard,
  useGetAdminUsers,
  useGetAdminSimulations,
  useUpdateUserStatus,
  useAssignSubscription,
  useRevokeSubscription,
  useGetAdminSubscriptionPlans,
  useGetAdminUpgradeRequests,
  useProcessUpgradeRequest,
  getGetAdminUsersQueryKey,
} from "@workspace/api-client-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Skeleton } from "@/components/ui/skeleton";
import { formatFCFA, cn } from "@/lib/utils";
import { queryClient } from "@/lib/queryClient";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem,
  DropdownMenuSeparator, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

/* ─── Assign subscription modal ─────────────────────────────────────────── */
interface AssignModalProps {
  userId: string;
  userName: string;
  currentPlan: string;
  requestId?: string;   // upgrade request to auto-mark as processed
  onClose: () => void;
}

function AssignModal({ userId, userName, currentPlan, requestId, onClose }: AssignModalProps) {
  const { data: plans, isLoading: plansLoading } = useGetAdminSubscriptionPlans();
  const assign = useAssignSubscription();
  const processRequest = useProcessUpgradeRequest();
  const [selectedPlanId, setSelectedPlanId] = useState("");
  const [duration, setDuration] = useState<number | null>(1);

  const handleAssign = () => {
    if (!selectedPlanId) return;
    assign.mutate(
      { id: userId, data: { planId: selectedPlanId, durationMonths: duration ?? undefined } },
      {
        onSuccess: () => {
          queryClient.invalidateQueries({ queryKey: ["/api/admin/users"] });
          // Auto-mark the linked upgrade request as processed
          if (requestId) {
            processRequest.mutate(
              { id: requestId, data: { status: "processed" } },
              {
                onSuccess: () => {
                  queryClient.invalidateQueries({ queryKey: ["/api/admin/upgrade-requests"] });
                },
              }
            );
          }
          onClose();
        },
      }
    );
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm px-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden">
        {/* Header */}
        <div className="px-6 py-5 border-b border-slate-100">
          <div className="flex items-center gap-3">
            <div className="h-9 w-9 rounded-xl bg-[#003D24]/10 flex items-center justify-center">
              <Crown className="h-5 w-5 text-[#003D24]" />
            </div>
            <div>
              <h2 className="font-bold text-slate-900 text-base">Attribuer un abonnement</h2>
              <p className="text-xs text-slate-500 mt-0.5">{userName}</p>
            </div>
          </div>
        </div>

        {/* Body */}
        <div className="px-6 py-5 space-y-5">
          {/* Current plan info */}
          <div className="flex items-center gap-2 p-3 rounded-xl bg-slate-50 border border-slate-200">
            <AlertTriangle className="h-4 w-4 text-amber-500 shrink-0" />
            <p className="text-xs text-slate-600">
              Plan actuel : <span className="font-bold">{currentPlan}</span>.
              L'abonnement existant sera annulé et remplacé.
            </p>
          </div>

          {/* Plan selector */}
          <div className="space-y-2">
            <label className="text-sm font-semibold text-slate-700">Choisir le plan</label>
            {plansLoading ? (
              <div className="space-y-2">
                <Skeleton className="h-14 w-full" />
                <Skeleton className="h-14 w-full" />
                <Skeleton className="h-14 w-full" />
              </div>
            ) : (
              <div className="space-y-2">
                {plans?.map((plan) => (
                  <label
                    key={plan.id}
                    className={cn(
                      "flex items-center gap-3 p-3.5 rounded-xl border-2 cursor-pointer transition-all",
                      selectedPlanId === plan.id
                        ? "border-[#003D24] bg-[#003D24]/5"
                        : "border-slate-200 hover:border-slate-300"
                    )}
                  >
                    <input
                      type="radio"
                      name="plan"
                      value={plan.id}
                      checked={selectedPlanId === plan.id}
                      onChange={() => setSelectedPlanId(plan.id)}
                      className="accent-[#003D24]"
                    />
                    <div className="flex-1">
                      <p className="font-semibold text-slate-900 text-sm">{plan.name}</p>
                      <p className="text-xs text-slate-500">
                        {plan.priceMonthly === 0 ? "Gratuit" : `${plan.priceMonthly.toLocaleString()} FCFA/mois`}
                        {" · "}
                        {plan.simulationsPerMonth == null ? "Illimité" : `${plan.simulationsPerMonth} sim/mois`}
                      </p>
                    </div>
                    {selectedPlanId === plan.id && (
                      <CheckCircle className="h-4 w-4 text-[#003D24] shrink-0" />
                    )}
                  </label>
                ))}
              </div>
            )}
          </div>

          {/* Duration */}
          <div className="space-y-2">
            <label className="text-sm font-semibold text-slate-700">Durée</label>
            <div className="grid grid-cols-4 gap-2">
              {[1, 3, 6, 12].map((m) => (
                <button
                  key={m}
                  onClick={() => setDuration(m)}
                  className={cn(
                    "py-2.5 rounded-xl text-sm font-semibold border-2 transition-all",
                    duration === m
                      ? "border-[#003D24] bg-[#003D24] text-white"
                      : "border-slate-200 text-slate-600 hover:border-slate-300"
                  )}
                >
                  {m === 1 ? "1 mois" : m === 12 ? "1 an" : `${m} mois`}
                </button>
              ))}
            </div>
            <button
              onClick={() => setDuration(null)}
              className={cn(
                "w-full py-2.5 rounded-xl text-sm font-semibold border-2 transition-all",
                duration === null
                  ? "border-[#003D24] bg-[#003D24] text-white"
                  : "border-slate-200 text-slate-600 hover:border-slate-300"
              )}
            >
              Sans expiration
            </button>
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-slate-100 flex gap-3">
          <Button variant="outline" className="flex-1" onClick={onClose} disabled={assign.isPending}>
            Annuler
          </Button>
          <Button
            className="flex-1 bg-[#003D24] hover:bg-[#004d2e] text-white font-semibold"
            onClick={handleAssign}
            disabled={!selectedPlanId || assign.isPending}
          >
            {assign.isPending ? (
              <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Attribution...</>
            ) : (
              <><Crown className="h-4 w-4 mr-2" /> Attribuer</>
            )}
          </Button>
        </div>
      </div>
    </div>
  );
}

/* ─── Main Admin page ───────────────────────────────────────────────────── */
export default function Admin() {
  const [activeTab, setActiveTab] = useState("dashboard");
  const [searchUsers, setSearchUsers] = useState("");
  const [searchSims, setSearchSims] = useState("");
  const [assignTarget, setAssignTarget] = useState<{ userId: string; userName: string; currentPlan: string; requestId?: string } | null>(null);

  const { data: upgradeRequests, isLoading: reqLoading } = useGetAdminUpgradeRequests();
  const processRequest = useProcessUpgradeRequest();
  const pendingCount = upgradeRequests?.filter((r) => r.status === "pending").length ?? 0;

  const handleProcessRequest = (id: string, status: "processed" | "dismissed") => {
    processRequest.mutate(
      { id, data: { status } },
      { onSuccess: () => queryClient.invalidateQueries({ queryKey: ["/api/admin/upgrade-requests"] }) }
    );
  };

  const { data: dashboard, isLoading: dashLoading } = useGetAdminDashboard({
    query: { enabled: activeTab === "dashboard" },
  });
  const { data: usersData, isLoading: usersLoading } = useGetAdminUsers(
    { search: searchUsers || undefined, limit: 50 },
    { query: { enabled: activeTab === "users", queryKey: getGetAdminUsersQueryKey({ search: searchUsers || undefined, limit: 50 }) } }
  );
  const { data: simsData, isLoading: simsLoading } = useGetAdminSimulations(
    { search: searchSims || undefined, limit: 50 },
    { query: { enabled: activeTab === "simulations" } }
  );

  const statusMutation = useUpdateUserStatus();
  const revoke = useRevokeSubscription();

  const handleStatusChange = (userId: string, status: "active" | "disabled" | "suspended") => {
    statusMutation.mutate(
      { id: userId, data: { status } },
      { onSuccess: () => queryClient.invalidateQueries({ queryKey: ["/api/admin/users"] }) }
    );
  };

  const handleRevoke = (userId: string) => {
    revoke.mutate(
      { id: userId },
      { onSuccess: () => queryClient.invalidateQueries({ queryKey: ["/api/admin/users"] }) }
    );
  };

  return (
    <div className="space-y-6 max-w-6xl mx-auto">
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="h-10 w-10 bg-[#003D24]/10 rounded-xl flex items-center justify-center shrink-0">
          <Shield className="h-5 w-5 text-[#003D24]" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Espace Administration</h1>
          <p className="text-sm text-slate-500">Gérez les utilisateurs, abonnements et simulations.</p>
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="bg-slate-100 w-full justify-start h-12 p-1 border-b border-slate-200 rounded-xl mb-6">
          <TabsTrigger value="dashboard" className="data-[state=active]:bg-white data-[state=active]:shadow-sm rounded-lg text-sm">Dashboard</TabsTrigger>
          <TabsTrigger value="users"     className="data-[state=active]:bg-white data-[state=active]:shadow-sm rounded-lg text-sm">Utilisateurs</TabsTrigger>
          <TabsTrigger value="simulations" className="data-[state=active]:bg-white data-[state=active]:shadow-sm rounded-lg text-sm">Simulations</TabsTrigger>
          <TabsTrigger value="requests"  className="data-[state=active]:bg-white data-[state=active]:shadow-sm rounded-lg text-sm relative">
            Demandes
            {pendingCount > 0 && (
              <span className="ml-1.5 h-4 min-w-4 px-1 rounded-full bg-red-500 text-white text-[10px] font-bold inline-flex items-center justify-center">
                {pendingCount}
              </span>
            )}
          </TabsTrigger>
        </TabsList>

        {/* ── Dashboard ── */}
        <TabsContent value="dashboard" className="space-y-6 mt-0">
          {dashLoading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              {[1,2,3,4].map(i => <Skeleton key={i} className="h-28 w-full" />)}
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <Card>
                <CardHeader className="flex flex-row items-center justify-between pb-2">
                  <CardTitle className="text-sm font-semibold text-slate-600">Total Utilisateurs</CardTitle>
                  <Users className="h-4 w-4 text-[#003D24]" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-black text-slate-900">{dashboard?.totalUsers || 0}</div>
                  <p className="text-xs text-green-600 font-medium mt-1">+{dashboard?.newUsersThisMonth || 0} ce mois</p>
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="flex flex-row items-center justify-between pb-2">
                  <CardTitle className="text-sm font-semibold text-slate-600">Abonnés Actifs</CardTitle>
                  <CreditCard className="h-4 w-4 text-[#FCD116]" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-black text-slate-900">{dashboard?.activeSubscribers || 0}</div>
                  <p className="text-xs text-slate-500 font-medium mt-1">utilisateurs payants</p>
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="flex flex-row items-center justify-between pb-2">
                  <CardTitle className="text-sm font-semibold text-slate-600">Total Simulations</CardTitle>
                  <Calculator className="h-4 w-4 text-blue-600" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-black text-slate-900">{dashboard?.totalSimulations || 0}</div>
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="flex flex-row items-center justify-between pb-2">
                  <CardTitle className="text-sm font-semibold text-slate-600">Revenus (Mois)</CardTitle>
                  <TrendingUp className="h-4 w-4 text-[#008751]" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-black text-[#003D24]">{formatFCFA(dashboard?.revenueThisMonth || 0)}</div>
                  <p className="text-xs text-slate-500 font-medium mt-1">Année: {formatFCFA(dashboard?.revenueThisYear || 0)}</p>
                </CardContent>
              </Card>
            </div>
          )}

          {/* Info card about manual subscription */}
          <Card className="border-[#FCD116]/30 bg-[#FCD116]/5">
            <CardContent className="pt-5 pb-5">
              <div className="flex items-start gap-3">
                <Crown className="h-5 w-5 text-[#003D24] mt-0.5 shrink-0" />
                <div>
                  <p className="font-semibold text-slate-900 text-sm">Attribution manuelle d'abonnements</p>
                  <p className="text-slate-600 text-xs mt-1 leading-relaxed">
                    Dans l'onglet <strong>Utilisateurs</strong>, cliquez sur <strong>Gérer → Attribuer abonnement</strong>
                    pour donner manuellement un accès Standard ou Pro à un utilisateur, sans passer par le paiement automatique.
                    Tu pourras aussi révoquer un abonnement actif à tout moment.
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* ── Users ── */}
        <TabsContent value="users" className="space-y-4 mt-0">
          <div className="flex items-center justify-between bg-white p-3 rounded-xl border shadow-sm">
            <div className="relative w-full max-w-sm">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
              <Input
                placeholder="Rechercher par nom ou email..."
                className="pl-9 h-9"
                value={searchUsers}
                onChange={(e) => setSearchUsers(e.target.value)}
              />
            </div>
            <span className="text-sm font-medium text-slate-500 shrink-0 ml-4">{usersData?.total || 0} utilisateurs</span>
          </div>

          <Card className="border-slate-200 shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm text-left">
                <thead className="bg-slate-50 text-slate-500 font-semibold uppercase text-[10px] tracking-wider border-b">
                  <tr>
                    <th className="px-4 py-3">Utilisateur</th>
                    <th className="px-4 py-3">Plan actuel</th>
                    <th className="px-4 py-3">Statut compte</th>
                    <th className="px-4 py-3">Inscription</th>
                    <th className="px-4 py-3 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {usersLoading ? (
                    <tr><td colSpan={5} className="p-4 text-center text-slate-500">Chargement...</td></tr>
                  ) : usersData?.users.length === 0 ? (
                    <tr><td colSpan={5} className="p-8 text-center text-slate-500">Aucun utilisateur trouvé</td></tr>
                  ) : (
                    usersData?.users.map((user) => (
                      <tr key={user.id} className="hover:bg-slate-50/50">
                        <td className="px-4 py-3">
                          <div className="font-semibold text-slate-900">{user.fullName || "—"}</div>
                          <div className="text-xs text-slate-400">{user.email}</div>
                        </td>
                        <td className="px-4 py-3">
                          <span className={cn(
                            "inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold uppercase",
                            user.planName === "Gratuit"
                              ? "bg-slate-100 text-slate-600"
                              : user.planName === "Standard"
                              ? "bg-blue-100 text-blue-700"
                              : "bg-[#FCD116]/20 text-[#003D24]"
                          )}>
                            {user.planName !== "Gratuit" && <Crown className="h-2.5 w-2.5" />}
                            {user.planName}
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          <span className={cn(
                            "px-2 py-0.5 rounded text-[10px] font-bold uppercase",
                            user.status === "active"    ? "bg-green-100 text-green-700" :
                            user.status === "suspended" ? "bg-red-100 text-red-700" :
                            "bg-slate-100 text-slate-700"
                          )}>
                            {user.status}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-xs text-slate-500">
                          {format(new Date(user.createdAt), "dd/MM/yyyy")}
                        </td>
                        <td className="px-4 py-3 text-right">
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="sm" className="h-8 text-xs font-semibold px-2">
                                Gérer <ChevronDown className="h-3 w-3 ml-1" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end" className="w-52">
                              {/* Subscription actions */}
                              <DropdownMenuItem
                                className="text-[#003D24] font-semibold"
                                onClick={() => setAssignTarget({ userId: user.id, userName: user.fullName || user.email, currentPlan: user.planName })}
                              >
                                <Crown className="h-4 w-4 mr-2" />
                                Attribuer abonnement
                              </DropdownMenuItem>
                              {user.planName !== "Gratuit" && (
                                <DropdownMenuItem
                                  className="text-amber-600"
                                  onClick={() => handleRevoke(user.id)}
                                  disabled={revoke.isPending}
                                >
                                  <XCircle className="h-4 w-4 mr-2" />
                                  Révoquer abonnement
                                </DropdownMenuItem>
                              )}
                              <DropdownMenuSeparator />
                              {/* Account status actions */}
                              <DropdownMenuItem onClick={() => handleStatusChange(user.id, "active")}>
                                <CheckCircle className="h-4 w-4 mr-2 text-green-500" />
                                Activer le compte
                              </DropdownMenuItem>
                              <DropdownMenuItem
                                className="text-red-600"
                                onClick={() => handleStatusChange(user.id, "suspended")}
                              >
                                <XCircle className="h-4 w-4 mr-2" />
                                Suspendre le compte
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </Card>
        </TabsContent>

        {/* ── Demandes d'abonnement ── */}
        <TabsContent value="requests" className="space-y-4 mt-0">
          <div className="flex items-center justify-between bg-white p-3 rounded-xl border shadow-sm">
            <div>
              <p className="font-semibold text-slate-800 text-sm">Demandes d'abonnement</p>
              <p className="text-xs text-slate-500 mt-0.5">
                {pendingCount > 0 ? (
                  <span className="text-red-600 font-bold">{pendingCount} en attente</span>
                ) : (
                  "Aucune demande en attente"
                )}
              </p>
            </div>
          </div>

          <Card className="border-slate-200 shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm text-left">
                <thead className="bg-slate-50 text-slate-500 font-semibold uppercase text-[10px] tracking-wider border-b">
                  <tr>
                    <th className="px-4 py-3">Utilisateur</th>
                    <th className="px-4 py-3">Plan souhaité</th>
                    <th className="px-4 py-3">Message</th>
                    <th className="px-4 py-3">Statut</th>
                    <th className="px-4 py-3">Date</th>
                    <th className="px-4 py-3 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {reqLoading ? (
                    <tr><td colSpan={6} className="p-4 text-center text-slate-500">Chargement...</td></tr>
                  ) : !upgradeRequests?.length ? (
                    <tr>
                      <td colSpan={6} className="p-12 text-center">
                        <div className="flex flex-col items-center gap-2">
                          <CheckCircle className="h-8 w-8 text-slate-200" />
                          <p className="text-slate-400 text-sm font-medium">Aucune demande pour l'instant</p>
                        </div>
                      </td>
                    </tr>
                  ) : (
                    upgradeRequests.map((req) => (
                      <tr key={req.id} className={cn("hover:bg-slate-50/50", req.status === "pending" && "bg-amber-50/30")}>
                        <td className="px-4 py-3">
                          <div className="font-semibold text-slate-900">{req.userFullName || "—"}</div>
                          <div className="text-xs text-slate-400">{req.userEmail}</div>
                        </td>
                        <td className="px-4 py-3">
                          <span className={cn(
                            "inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold uppercase",
                            req.planWanted === "Pro"
                              ? "bg-[#FCD116]/20 text-[#003D24]"
                              : "bg-blue-100 text-blue-700"
                          )}>
                            <Crown className="h-2.5 w-2.5" />
                            {req.planWanted || "Non précisé"}
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          <p className="text-xs text-slate-600 max-w-48 truncate" title={req.message ?? undefined}>
                            {req.message || <span className="text-slate-300 italic">Aucun message</span>}
                          </p>
                        </td>
                        <td className="px-4 py-3">
                          <span className={cn(
                            "px-2 py-0.5 rounded text-[10px] font-bold uppercase",
                            req.status === "pending"    ? "bg-amber-100 text-amber-700" :
                            req.status === "processed"  ? "bg-green-100 text-green-700" :
                            "bg-slate-100 text-slate-500"
                          )}>
                            {req.status === "pending" ? "En attente" : req.status === "processed" ? "Traité" : "Rejeté"}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-xs text-slate-500">
                          {format(new Date(req.createdAt), "dd/MM/yyyy HH:mm")}
                        </td>
                        <td className="px-4 py-3 text-right">
                          {req.status === "pending" ? (
                            <div className="flex items-center justify-end gap-2">
                              <Button
                                size="sm"
                                className="h-7 text-[11px] bg-[#003D24] hover:bg-[#004d2e] text-white px-2.5"
                                onClick={() => setAssignTarget({
                                  userId: req.userId,
                                  userName: req.userFullName || req.userEmail,
                                  currentPlan: "Gratuit",
                                  requestId: req.id,
                                })}
                              >
                                <Crown className="h-3 w-3 mr-1" /> Activer
                              </Button>
                              <Button
                                variant="ghost"
                                size="sm"
                                className="h-7 text-[11px] text-slate-400 hover:text-red-600 px-2"
                                onClick={() => handleProcessRequest(req.id, "dismissed")}
                                disabled={processRequest.isPending}
                              >
                                <XCircle className="h-3.5 w-3.5" />
                              </Button>
                            </div>
                          ) : (
                            <span className="text-xs text-slate-400">
                              {req.processedAt ? format(new Date(req.processedAt), "dd/MM") : "—"}
                            </span>
                          )}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </Card>

          {/* Tip card */}
          <Card className="border-[#003D24]/10 bg-[#003D24]/5">
            <CardContent className="pt-4 pb-4">
              <div className="flex items-start gap-3">
                <Crown className="h-4 w-4 text-[#003D24] mt-0.5 shrink-0" />
                <p className="text-xs text-slate-600 leading-relaxed">
                  <strong>Workflow :</strong> Cliquez <strong>Activer</strong> → choisissez le plan payé → choisissez la durée → validez.
                  L'abonnement est activé immédiatement sur le compte de l'utilisateur.
                  Marquez ensuite la demande comme traitée automatiquement.
                </p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* ── Simulations ── */}
        <TabsContent value="simulations" className="space-y-4 mt-0">
          <div className="flex items-center justify-between bg-white p-3 rounded-xl border shadow-sm">
            <div className="relative w-full max-w-sm">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
              <Input
                placeholder="Rechercher par véhicule..."
                className="pl-9 h-9"
                value={searchSims}
                onChange={(e) => setSearchSims(e.target.value)}
              />
            </div>
            <span className="text-sm font-medium text-slate-500 shrink-0 ml-4">{simsData?.total || 0} simulations</span>
          </div>

          <Card className="border-slate-200 shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm text-left">
                <thead className="bg-slate-50 text-slate-500 font-semibold uppercase text-[10px] tracking-wider border-b">
                  <tr>
                    <th className="px-4 py-3">Véhicule</th>
                    <th className="px-4 py-3">Utilisateur</th>
                    <th className="px-4 py-3">CIF déclaré</th>
                    <th className="px-4 py-3">Droits & Taxes</th>
                    <th className="px-4 py-3 text-right">Total Estimé</th>
                    <th className="px-4 py-3 text-right">Date</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {simsLoading ? (
                    <tr><td colSpan={6} className="p-4 text-center text-slate-500">Chargement...</td></tr>
                  ) : simsData?.simulations.length === 0 ? (
                    <tr><td colSpan={6} className="p-8 text-center text-slate-500">Aucune simulation trouvée</td></tr>
                  ) : (
                    simsData?.simulations.map((sim) => (
                      <tr key={sim.id} className="hover:bg-slate-50/50">
                        <td className="px-4 py-3">
                          <div className="font-semibold text-slate-900">{sim.marque} {sim.modele}</div>
                          <div className="text-xs text-slate-500">Année {sim.annee}</div>
                        </td>
                        <td className="px-4 py-3">
                          <div className="text-slate-700 font-medium">{sim.userFullName || "—"}</div>
                          <div className="text-xs text-slate-400">{sim.userEmail || "—"}</div>
                        </td>
                        <td className="px-4 py-3 font-medium text-slate-600">{formatFCFA(sim.valeurCIF)}</td>
                        <td className="px-4 py-3 font-medium text-amber-700">{formatFCFA(sim.totalDouane)}</td>
                        <td className="px-4 py-3 text-right font-black text-[#003D24]">{formatFCFA(sim.totalGeneral)}</td>
                        <td className="px-4 py-3 text-right text-xs text-slate-500">
                          {format(new Date(sim.createdAt), "dd/MM/yyyy HH:mm")}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Assign subscription modal */}
      {assignTarget && (
        <AssignModal
          userId={assignTarget.userId}
          userName={assignTarget.userName}
          currentPlan={assignTarget.currentPlan}
          requestId={assignTarget.requestId}
          onClose={() => setAssignTarget(null)}
        />
      )}
    </div>
  );
}
