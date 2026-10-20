import { useLocation } from "wouter";
import { useGetSubscriptionPlans, useGetUserSubscription } from "@workspace/api-client-react";
import { Check, CreditCard, AlertCircle, Phone, Loader2 } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

export default function Abonnement() {
  const [, setLocation] = useLocation();
  const { data: plans, isLoading: plansLoading } = useGetSubscriptionPlans();
  const { data: subscription, isLoading: subLoading } = useGetUserSubscription();

  const isLoading = plansLoading || subLoading;

  if (isLoading) {
    return (
      <div className="space-y-8 max-w-5xl mx-auto">
        <div className="text-center">
          <Skeleton className="h-10 w-64 mx-auto mb-3" />
          <Skeleton className="h-4 w-96 mx-auto" />
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <Skeleton className="h-[450px]" />
          <Skeleton className="h-[450px]" />
          <Skeleton className="h-[450px]" />
        </div>
      </div>
    );
  }

  // Sort plans by price
  const sortedPlans = [...(plans || [])].sort((a, b) => a.priceMonthly - b.priceMonthly);

  return (
    <div className="space-y-8 max-w-5xl mx-auto">
      <div className="text-center max-w-2xl mx-auto">
        <h1 className="text-3xl font-bold text-slate-900 tracking-tight mb-3">
          Abonnements SimDouane
        </h1>
        <p className="text-slate-500">
          Choisissez le plan adapté à vos besoins d'importation. Sans engagement.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-8">
        {sortedPlans.map((plan) => {
          const isActive = subscription?.plan.id === plan.id;
          const isFree = plan.priceMonthly === 0;

          return (
            <Card 
              key={plan.id} 
              className={cn(
                "relative flex flex-col transition-all duration-200",
                isActive ? "border-[#003D24] shadow-md scale-[1.02]" : "border-slate-200 hover:border-slate-300 shadow-sm"
              )}
            >
              {isActive && (
                <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                  <span className="bg-[#003D24] text-[#FCD116] text-[10px] font-black uppercase tracking-widest px-3 py-1 rounded-full shadow-sm">
                    Votre plan actuel
                  </span>
                </div>
              )}
              
              <CardHeader className="text-center pb-4 pt-8">
                <CardTitle className="text-lg font-bold text-slate-900">{plan.name}</CardTitle>
                <div className="mt-4">
                  <span className="text-4xl font-black text-[#003D24]">
                    {isFree ? "Gratuit" : new Intl.NumberFormat('fr-FR').format(plan.priceMonthly)}
                  </span>
                  {!isFree && <span className="text-slate-500 text-sm font-medium ml-1">FCFA / mois</span>}
                </div>
                <p className="text-xs text-slate-500 mt-2 font-medium">
                  {plan.simulationsPerMonth === null 
                    ? "Simulations illimitées" 
                    : `${plan.simulationsPerMonth} simulations par mois`}
                </p>
              </CardHeader>
              
              <CardContent className="flex-1">
                <div className="space-y-3 mt-4">
                  {plan.features.map((feature, i) => (
                    <div key={i} className="flex items-start gap-2">
                      <div className="h-4 w-4 rounded-full bg-[#008751]/10 flex items-center justify-center shrink-0 mt-0.5">
                        <Check className="h-2.5 w-2.5 text-[#008751]" />
                      </div>
                      <span className="text-sm text-slate-600 leading-snug">{feature}</span>
                    </div>
                  ))}
                </div>
              </CardContent>
              
              <CardFooter className="pt-4 pb-6">
                <Button 
                  className={cn(
                    "w-full font-bold",
                    isActive 
                      ? "bg-slate-100 text-slate-400 cursor-default hover:bg-slate-100" 
                      : "bg-[#003D24] hover:bg-[#004d2e] text-white"
                  )}
                  variant={isActive ? "secondary" : "default"}
                  disabled={isActive}
                >
                  {isActive ? "Plan actif" : isFree ? "Passer au Gratuit" : "S'abonner"}
                </Button>
              </CardFooter>
            </Card>
          );
        })}
      </div>

      <div className="bg-blue-50 border border-blue-100 rounded-2xl p-6 mt-8">
        <div className="flex flex-col sm:flex-row items-center gap-4 sm:gap-6 text-center sm:text-left">
          <div className="h-12 w-12 rounded-full bg-blue-100 flex items-center justify-center shrink-0">
            <CreditCard className="h-6 w-6 text-blue-600" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-blue-900">Paiement Mobile Money Bientôt Disponible</h3>
            <p className="text-xs text-blue-700 mt-1 max-w-xl leading-relaxed">
              L'intégration de MTN MoMo, Moov Money, Celtiis Cash et le paiement par carte bancaire est en cours de développement. 
              Pour le moment, si vous souhaitez passer au plan supérieur, veuillez contacter le service client.
            </p>
            <div className="mt-3 flex flex-wrap gap-3 justify-center sm:justify-start">
              <div className="bg-white/60 px-3 py-1.5 rounded border border-blue-200 text-xs font-semibold text-blue-800 flex items-center gap-1.5">
                <Phone className="h-3 w-3" /> +229 56 50 13 48
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}