import { useState } from "react";
import { useLocation } from "wouter";
import { format } from "date-fns";
import { fr, enUS } from "date-fns/locale";
import { Trash2, History as HistoryIcon, ChevronRight, Loader2, CloudOff, Cloud, Search, Calendar, Crown, Lock } from "lucide-react";
import { getHistory, clearHistory, setCurrentSimulation, HistoryEntry } from "@/lib/history";
import { formatFCFA } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { useLang } from "@/context/language-context";
import { T } from "@/lib/translations";
import { useUser } from "@clerk/react";
import { useGetSimulations, useDeleteSimulation, getGetSimulationsQueryKey, useGetUserSubscription, getGetUserSubscriptionQueryKey } from "@workspace/api-client-react";
import { queryClient } from "@/lib/queryClient";
import { Input } from "@/components/ui/input";

export default function Historique() {
  const [, setLocation] = useLocation();
  const { lang } = useLang();
  const { user } = useUser();
  const t = T[lang].history;
  const dateLocale = lang === "fr" ? fr : enUS;
  const dateFormat = lang === "fr" ? "d MMM yyyy 'à' HH:mm" : "MMM d, yyyy 'at' HH:mm";

  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  
  // Use debounced search for the API call
  // (In a real app we'd use a useDebounce hook, but we'll do a simple timer here)
  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearch(e.target.value);
    const timer = setTimeout(() => {
      setDebouncedSearch(e.target.value);
    }, 500);
    return () => clearTimeout(timer);
  };

  const { data: subData } = useGetUserSubscription({ query: { enabled: !!user, queryKey: getGetUserSubscriptionQueryKey() } });
  // Cloud history available for paid plans only (simulationsPerMonth > 3 OR null = unlimited)
  const isPaidPlan = !!user && (
    subData?.plan.simulationsPerMonth === null || 
    (subData?.plan.simulationsPerMonth !== undefined && subData.plan.simulationsPerMonth > 3)
  );

  const { data: cloudData, isLoading: cloudLoading } = useGetSimulations(
    { 
      search: debouncedSearch || undefined, 
      dateFrom: dateFrom || undefined, 
      dateTo: dateTo || undefined 
    },
    { 
      query: { 
        enabled: isPaidPlan,
        queryKey: getGetSimulationsQueryKey({ 
          search: debouncedSearch || undefined, 
          dateFrom: dateFrom || undefined, 
          dateTo: dateTo || undefined 
        })
      } 
    }
  );

  const deleteSimMutation = useDeleteSimulation();

  const handleCloudDelete = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!window.confirm("Supprimer cette simulation ?")) return;
    deleteSimMutation.mutate({ id }, {
      onSuccess: () => {
        queryClient.invalidateQueries({
          queryKey: ["/api/simulations"]
        });
      }
    });
  };

  const localHistory = getHistory();
  const [localList, setLocalList] = useState(localHistory);

  const handleLocalDeleteAll = () => {
    if (!window.confirm("Vider tout l'historique local ?")) return;
    clearHistory();
    setLocalList([]);
  };

  const handleLocalDeleteOne = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!window.confirm("Supprimer cette simulation ?")) return;
    const newList = localList.filter(item => item.id !== id);
    localStorage.setItem("simdouane_history", JSON.stringify(newList));
    setLocalList(newList);
  };

  if (isPaidPlan && cloudLoading) {
    return (
      <div className="flex items-center justify-center min-h-[50vh]">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  const isCloud = isPaidPlan;
  const listItems = isCloud ? (cloudData?.simulations || []) : localList;
  
  // Local filtering if we're not connected (since API handles filtering for connected users)
  const filteredLocalList = !isCloud ? localList.filter(entry => {
    const term = search.toLowerCase();
    return !search || 
      entry.input.marque.toLowerCase().includes(term) || 
      entry.input.modele.toLowerCase().includes(term);
  }) : [];

  const displayItems = isCloud ? listItems : filteredLocalList;

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-foreground flex items-center gap-2">
            {t.title}
            {isCloud ? (
              <span className="bg-blue-100 text-blue-700 text-[10px] uppercase font-bold px-2 py-0.5 rounded-full flex items-center gap-1">
                <Cloud className="h-3 w-3" /> Cloud
              </span>
            ) : (
              <span className="bg-slate-200 text-slate-600 text-[10px] uppercase font-bold px-2 py-0.5 rounded-full flex items-center gap-1">
                <CloudOff className="h-3 w-3" /> Local
              </span>
            )}
          </h1>
          <p className="text-muted-foreground mt-2">
            {isCloud 
              ? `Vos simulations sauvegardées. Total: ${cloudData?.total || 0}`
              : t.subtitle(localList.length)
            }
          </p>
        </div>
        
        {!isCloud && localList.length > 0 && (
          <Button
            variant="outline" size="sm"
            onClick={handleLocalDeleteAll}
            className="text-destructive border-destructive/20 hover:bg-destructive/10 shrink-0"
          >
            <Trash2 className="h-4 w-4 mr-2" />{t.clear}
          </Button>
        )}
      </div>

      {/* Banner: not logged in → invite to sign in */}
      {!user && (
        <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 flex items-start gap-3">
          <Cloud className="h-5 w-5 text-blue-500 mt-0.5 shrink-0" />
          <div>
            <p className="text-sm font-semibold text-blue-900">Connectez-vous pour sauvegarder votre historique dans le cloud</p>
            <p className="text-xs text-blue-700 mt-1">Vos simulations seront accessibles sur tous vos appareils et ne seront jamais perdues.</p>
            <Button size="sm" variant="link" className="px-0 text-blue-700 h-auto py-1 mt-1 font-bold" onClick={() => setLocation("/sign-in")}>
              Se connecter maintenant →
            </Button>
          </div>
        </div>
      )}

      {/* Banner: logged in but free plan → upgrade to get cloud history */}
      {user && !isCloud && (
        <div className="rounded-xl p-4 flex items-start gap-3" style={{ background: "linear-gradient(135deg, #003D24 0%, #004d2e 100%)" }}>
          <div className="h-9 w-9 bg-[#FCD116] rounded-xl flex items-center justify-center shrink-0 mt-0.5">
            <Lock className="h-4 w-4 text-[#003D24]" />
          </div>
          <div className="flex-1">
            <p className="text-sm font-bold text-white">Historique cloud · Plan payant requis</p>
            <p className="text-xs text-green-100/70 mt-1 leading-relaxed">
              L'historique cloud (synchronisé sur tous vos appareils, jamais perdu) est réservé aux abonnés Standard et Pro.
              Votre historique local reste disponible ci-dessous.
            </p>
          </div>
          <button
            onClick={() => setLocation("/abonnement")}
            className="shrink-0 flex items-center gap-1.5 px-3 py-2 rounded-xl bg-[#FCD116] text-[#003D24] text-xs font-bold hover:bg-yellow-300 transition-colors"
          >
            <Crown className="h-3.5 w-3.5" /> Upgrade
          </button>
        </div>
      )}

      {/* Filters */}
      {(isCloud || localList.length > 0) && (
        <div className="flex flex-col sm:flex-row gap-3 bg-white p-3 rounded-xl border shadow-sm">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input 
              placeholder="Rechercher par marque, modèle..." 
              className="pl-9"
              value={search}
              onChange={handleSearchChange}
            />
          </div>
          {isCloud && (
            <>
              <div className="flex items-center gap-2">
                <div className="relative">
                  <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input 
                    type="date" 
                    className="pl-9 w-auto min-w-[140px]" 
                    value={dateFrom}
                    onChange={(e) => setDateFrom(e.target.value)}
                  />
                </div>
                <span className="text-muted-foreground text-sm">-</span>
                <div className="relative">
                  <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input 
                    type="date" 
                    className="pl-9 w-auto min-w-[140px]"
                    value={dateTo}
                    onChange={(e) => setDateTo(e.target.value)}
                  />
                </div>
              </div>
            </>
          )}
        </div>
      )}

      {displayItems.length === 0 ? (
        <div className="bg-white rounded-xl border border-slate-200 text-center py-16 px-4">
          <div className="bg-slate-100 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
            <HistoryIcon className="h-8 w-8 text-slate-400" />
          </div>
          <h2 className="text-xl font-semibold mb-2">Aucune simulation trouvée</h2>
          <p className="text-slate-500 mb-6">Essayez de modifier vos filtres ou effectuez une nouvelle simulation.</p>
          <Button onClick={() => setLocation("/simulateur")}>{t.newSim}</Button>
        </div>
      ) : (
        <div className="space-y-4">
          {displayItems.map((entry: any) => {
            const date = new Date(entry.createdAt || entry.date);
            const input = isCloud ? entry : entry.input;
            const resultTotal = isCloud ? entry.totalGeneral : entry.result.totalGeneral;
            
            return (
              <Card
                key={entry.id}
                className="cursor-pointer hover:bg-slate-50 transition-colors border-slate-200 shadow-sm overflow-hidden"
                onClick={() => {
                  if (isCloud) {
                    // For cloud, we need to reconstruct the full result object for the results page
                    // We'd ideally fetch it, but to keep the flow identical, we recalculate it
                    const reconstructedInput = {
                      marque: entry.marque,
                      modele: entry.modele,
                      annee: entry.annee,
                      cylindree: entry.cylindree as any,
                      carburant: entry.carburant,
                      valeurCIF: entry.valeurCIF,
                      joursAuPort: entry.joursAuPort,
                      regime: entry.regime as any,
                    };
                    // Instead of full recalculation which might differ slightly due to rates changing,
                    // we'll use a mocked result object enough for the view
                    import("@/lib/calculator").then(({ calculate }) => {
                      const result = calculate(reconstructedInput);
                      setCurrentSimulation({
                        id: entry.id,
                        date: entry.createdAt,
                        input: reconstructedInput,
                        result: {
                          ...result,
                          totalDouane: entry.totalDouane,
                          totalPort: entry.totalPort,
                          totalGeneral: entry.totalGeneral,
                        }
                      });
                      setLocation("/resultats");
                    });
                  } else {
                    setCurrentSimulation(entry); 
                    setLocation("/resultats");
                  }
                }}
              >
                <CardContent className="p-4 sm:p-5 flex items-center justify-between">
                  <div className="flex-1 min-w-0 pr-4">
                    <div className="flex items-center gap-2 mb-1">
                      <h3 className="font-bold text-slate-900 text-lg truncate">
                        {input.marque} {input.modele}
                      </h3>
                      <span className="bg-slate-100 text-slate-600 text-xs px-2 py-0.5 rounded font-medium shrink-0">
                        {input.annee}
                      </span>
                    </div>
                    <div className="flex flex-wrap items-center text-xs text-slate-500 gap-x-4 gap-y-1">
                      <span className="flex items-center gap-1">
                        <Calendar className="h-3.5 w-3.5" />
                        {format(date, dateFormat, { locale: dateLocale })}
                      </span>
                      <span className="font-medium text-slate-700">CIF: {formatFCFA(input.valeurCIF)}</span>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-4 shrink-0">
                    <div className="text-right hidden sm:block">
                      <div className="text-[10px] text-slate-400 uppercase tracking-wider font-bold mb-0.5">Total Estimé</div>
                      <div className="font-black text-[#003D24] text-lg">{formatFCFA(resultTotal)}</div>
                    </div>
                    <div className="flex items-center gap-1 sm:gap-2">
                      <Button 
                        variant="ghost" 
                        size="icon" 
                        className="h-8 w-8 text-slate-400 hover:text-red-600 hover:bg-red-50"
                        onClick={(e) => isCloud ? handleCloudDelete(entry.id, e) : handleLocalDeleteOne(entry.id, e)}
                        disabled={isCloud && deleteSimMutation.isPending}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                      <ChevronRight className="h-5 w-5 text-slate-300" />
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}