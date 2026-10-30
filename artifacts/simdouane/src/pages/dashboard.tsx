import { useState } from "react";
import { useLocation } from "wouter";
import { useAuth } from "@/lib/auth";
import { useGetSimulationStats, useGetUserSubscription, useGetSimulations } from "@workspace/api-client-react";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import { 
  Calculator, Activity, TrendingUp, CreditCard, ChevronRight,
  Clock, Plus, AlertTriangle,
  Shield, Crown, MessageCircle, Phone, Mail
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { formatFCFA } from "@/lib/utils";
import { Skeleton } from "@/components/ui/skeleton";
import { UpgradeRequestForm } from "@/components/upgrade-request-form";

export default function Dashboard() {
  const [, setLocation] = useLocation();
  const [requestSent, setRequestSent] = useState(false);
  const [showUpgradeForm, setShowUpgradeForm] = useState(false);
  const { user } = useAuth();
  
  const { data: stats, isLoading: statsLoading } = useGetSimulationStats();
  const { data: subscription, isLoading: subLoading } = useGetUserSubscription();
  const { data: recentSims, isLoading: simsLoading } = useGetSimulations({ limit: 5 });

  const isLoading = statsLoading || subLoading || simsLoading;

  if (isLoading) {
    return (
      <div className="space-y-6 max-w-5xl mx-auto">
        <div>
          <Skeleton className="h-10 w-64 mb-2" />
          <Skeleton className="h-4 w-96" />
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Skeleton className="h-32 w-full" />
          <Skeleton className="h-32 w-full" />
          <Skeleton className="h-32 w-full" />
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <Skeleton className="h-96 lg:col-span-2" />
          <Skeleton className="h-96" />
        </div>
      </div>
    );
  }

  const quotaRatio = subscription?.plan.simulationsPerMonth 
    ? (subscription.simUsedThisMonth / subscription.plan.simulationsPerMonth) * 100 
    : 0;
    
  const isNearLimit = quotaRatio >= 80;
  const isOverLimit = quotaRatio >= 100;

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-slate-900 tracking-tight">
            Bonjour, {user?.firstName || "Utilisateur"}
          </h1>
          <p className="text-slate-500 mt-1">
            Voici un résumé de votre activité d'importation.
          </p>
        </div>
        <Button 
          onClick={() => setLocation("/simulateur")} 
          className="bg-[#003D24] hover:bg-[#004d2e] text-white font-semibold shadow-sm shrink-0"
        >
          <Plus className="h-4 w-4 mr-2" />
          Nouvelle simulation
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="border-slate-200 shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-semibold text-slate-600">Simulations (Mois)</CardTitle>
            <Activity className="h-4 w-4 text-[#003D24]" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-black text-slate-900">{stats?.thisMonthSimulations || 0}</div>
            <p className="text-xs text-slate-500 mt-1">sur {stats?.totalSimulations || 0} au total</p>
          </CardContent>
        </Card>

        <Card className="border-slate-200 shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-semibold text-slate-600">Moyenne estimée</CardTitle>
            <TrendingUp className="h-4 w-4 text-[#FCD116]" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-black text-slate-900">{formatFCFA(stats?.avgTotal || 0)}</div>
            <p className="text-xs text-slate-500 mt-1">par véhicule importé</p>
          </CardContent>
        </Card>

        <Card className={isNearLimit ? "border-amber-200 bg-amber-50/50" : "border-slate-200 shadow-sm"}>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-semibold text-slate-600">Plan actuel</CardTitle>
            <CreditCard className={isNearLimit ? "h-4 w-4 text-amber-500" : "h-4 w-4 text-[#008751]"} />
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2 mb-3">
              <div className="text-lg font-bold text-slate-900">{subscription?.plan.name}</div>
              <span className="bg-[#003D24]/10 text-[#003D24] text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded">
                Actif
              </span>
            </div>
            {subscription?.plan.simulationsPerMonth ? (
              <div className="space-y-1.5">
                <div className="flex justify-between text-xs font-medium text-slate-600">
                  <span>{subscription.simUsedThisMonth} utilisées</span>
                  <span>{subscription.plan.simulationsPerMonth} max</span>
                </div>
                <Progress 
                  value={quotaRatio} 
                  className="h-1.5"
                  // Use amber/red if nearing limit but Progress component doesn't take color directly easily
                  // we could style it via CSS if needed, default is fine
                />
              </div>
            ) : (
              <p className="text-xs font-medium text-[#008751] flex items-center gap-1">
                <Shield className="h-3 w-3" /> Simulations illimitées
              </p>
            )}
            {isOverLimit && (
              <p className="text-[10px] text-red-600 font-semibold mt-2 flex items-center gap-1">
                <AlertTriangle className="h-3 w-3" /> Quota atteint ce mois.
              </p>
            )}
          </CardContent>
        </Card>
      </div>

      {/* ── Quota exceeded CTA ── */}
      {isOverLimit && (
        <div className="rounded-2xl bg-gradient-to-r from-[#003D24] to-[#005533] p-5 flex flex-col md:flex-row items-start md:items-center justify-between gap-4 text-white shadow-lg">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 bg-[#FCD116] rounded-xl flex items-center justify-center shrink-0">
              <AlertTriangle className="h-5 w-5 text-[#003D24]" />
            </div>
            <div>
              <p className="font-bold text-base">Limite mensuelle atteinte</p>
              <p className="text-green-100 text-xs mt-0.5">
                Vous avez utilisé {subscription?.simUsedThisMonth}/{subscription?.plan.simulationsPerMonth} simulations ce mois.
                Contactez l'admin pour activer un abonnement.
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2 shrink-0 w-full md:w-auto">
            <a href="tel:+2290156501348" className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-white/10 border border-white/20 text-xs font-semibold hover:bg-white/20 transition-colors">
              <Phone className="h-3.5 w-3.5" /> +229 01 56 50 13 48
            </a>
            <a href="tel:+2290141822730" className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-white/10 border border-white/20 text-xs font-semibold hover:bg-white/20 transition-colors">
              <Phone className="h-3.5 w-3.5" /> +229 01 41 82 27 30
            </a>
            {requestSent ? (
              <span className="px-4 py-2 rounded-xl bg-[#FCD116] text-[#003D24] text-xs font-bold">✓ Demande envoyée</span>
            ) : (
              // The API requires the full Mobile Money details: open the same
              // form as the simulator instead of sending an incomplete request.
              <button
                onClick={() => setShowUpgradeForm(true)}
                className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-[#FCD116] text-[#003D24] text-xs font-bold hover:bg-yellow-300 transition-colors disabled:opacity-60"
              >
                <Crown className="h-3.5 w-3.5" />
                Demander un upgrade
              </button>
            )}
          </div>
        </div>
      )}
      {isOverLimit && showUpgradeForm && !requestSent && (
        <Card className="border-slate-200 shadow-sm">
          <CardContent className="pt-6">
            <UpgradeRequestForm
              defaultPlan="Standard"
              onSuccess={() => { setRequestSent(true); setShowUpgradeForm(false); }}
              onCancel={() => setShowUpgradeForm(false)}
            />
          </CardContent>
        </Card>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card className="lg:col-span-2 border-slate-200 shadow-sm flex flex-col">
          <CardHeader className="flex flex-row items-center justify-between pb-4 border-b border-slate-100">
            <div>
              <CardTitle className="text-base">Dernières simulations</CardTitle>
            </div>
            <Button variant="ghost" size="sm" className="text-[#003D24] text-xs h-8" onClick={() => setLocation("/historique")}>
              Voir tout <ChevronRight className="h-3 w-3 ml-1" />
            </Button>
          </CardHeader>
          <CardContent className="p-0 flex-1">
            {!recentSims?.simulations.length ? (
              <div className="p-8 text-center flex flex-col items-center justify-center h-full">
                <Clock className="h-8 w-8 text-slate-300 mb-3" />
                <p className="text-sm font-medium text-slate-600">Aucune simulation récente</p>
                <p className="text-xs text-slate-400 mt-1">Vos dernières estimations apparaîtront ici.</p>
              </div>
            ) : (
              <div className="divide-y divide-slate-100">
                {recentSims.simulations.map((sim) => (
                  <div key={sim.id} className="p-4 hover:bg-slate-50 transition-colors flex items-center justify-between">
                    <div>
                      <p className="font-bold text-sm text-slate-900">{sim.marque} {sim.modele}</p>
                      <p className="text-xs text-slate-500 mt-0.5">
                        {format(new Date(sim.createdAt), "d MMMM yyyy", { locale: fr })} • {sim.annee}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="font-black text-[#003D24] text-sm">{formatFCFA(sim.totalGeneral)}</p>
                      <p className="text-[10px] text-slate-400 font-semibold uppercase tracking-wider mt-0.5">Total Estimé</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="border-slate-200 shadow-sm bg-gradient-to-br from-[#003D24] to-[#002616] text-white relative overflow-hidden">
          <div className="absolute top-0 right-0 p-4 opacity-10">
            <Calculator className="h-32 w-32" />
          </div>
          <CardHeader>
            <CardTitle className="text-base text-[#FCD116]">Accès Rapide</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4 relative z-10">
            <Button 
              variant="outline" 
              className="w-full justify-start border-white/20 bg-white/5 text-white hover:bg-white/10 hover:text-white h-12"
              onClick={() => setLocation("/abonnement")}
            >
              <CreditCard className="h-4 w-4 mr-3 text-[#FCD116]" />
              Gérer mon abonnement
            </Button>
            <Button 
              variant="outline" 
              className="w-full justify-start border-white/20 bg-white/5 text-white hover:bg-white/10 hover:text-white h-12"
              onClick={() => setLocation("/profil")}
            >
              <Shield className="h-4 w-4 mr-3 text-[#FCD116]" />
              Informations du profil
            </Button>
            <div className="pt-4 border-t border-white/10">
              <p className="text-xs text-white/60 leading-relaxed">
                Le simulateur utilise les formules douanières officielles. Si vous avez besoin d'aide pour interpréter un résultat, n'hésitez pas à nous contacter.
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}