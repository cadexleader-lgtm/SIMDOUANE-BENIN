import { useState } from "react";
import { useLocation } from "wouter";
import { useUpdateProfile } from "@workspace/api-client-react";
import { queryClient } from "@/lib/queryClient";
import { Loader2, CheckCircle, Briefcase, MessageCircle, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { SimDouaneLogo } from "@/components/logo";
import { cn } from "@/lib/utils";

const POSTES = [
  "Transitaire",
  "Importateur de véhicules",
  "Commissionnaire en douane",
  "Courtier en douane",
  "Agent maritime",
  "Particulier importateur",
  "Autre",
];

const basePath = import.meta.env.BASE_URL.replace(/\/$/, "");

export default function Onboarding() {
  const [, setLocation] = useLocation();
  const updateProfile = useUpdateProfile();

  const [poste, setPoste]       = useState("");
  const [whatsapp, setWhatsapp] = useState("");
  const [step, setStep]         = useState<"poste" | "whatsapp" | "done">("poste");

  const goNext = () => {
    if (step === "poste") {
      if (!poste) return;
      setStep("whatsapp");
    } else if (step === "whatsapp") {
      handleSubmit();
    }
  };

  const handleSubmit = () => {
    updateProfile.mutate(
      { data: { poste, whatsapp: whatsapp || undefined, onboarded: true } },
      {
        onSuccess: () => {
          queryClient.invalidateQueries({ queryKey: ["/api/profile"] });
          setStep("done");
          setTimeout(() => setLocation("/dashboard"), 1400);
        },
      }
    );
  };

  return (
    <div className="min-h-[100dvh] flex flex-col items-center justify-center bg-[#003D24] px-4 py-10">
      {/* Logo */}
      <div className="mb-10 text-center">
        <img src={`${window.location.origin}${basePath}/logo.svg`} className="h-14 mx-auto mb-3" alt="SimDouane" />
        <p className="text-white/50 text-xs uppercase tracking-widest font-semibold">Simulateur Douanier · Bénin</p>
      </div>

      <div className="w-full max-w-md">
        {/* Progress */}
        <div className="flex items-center gap-2 mb-8 justify-center">
          {["poste", "whatsapp"].map((s, i) => (
            <div key={s} className="flex items-center gap-2">
              <div className={cn(
                "h-7 w-7 rounded-full flex items-center justify-center text-xs font-bold transition-all",
                step === "done" || (i === 0 && step !== "poste") || (i === 1 && step === "done")
                  ? "bg-[#FCD116] text-[#003D24]"
                  : step === s
                  ? "bg-white text-[#003D24]"
                  : "bg-white/20 text-white/50"
              )}>
                {(step === "done" || (i === 0 && step !== "poste")) ? "✓" : i + 1}
              </div>
              {i < 1 && <div className={cn("h-0.5 w-8", step !== "poste" ? "bg-[#FCD116]" : "bg-white/20")} />}
            </div>
          ))}
        </div>

        <div className="bg-white rounded-2xl shadow-2xl overflow-hidden">
          {step === "done" ? (
            <div className="p-8 text-center space-y-4">
              <div className="h-14 w-14 bg-green-100 rounded-full flex items-center justify-center mx-auto">
                <CheckCircle className="h-7 w-7 text-green-600" />
              </div>
              <div>
                <p className="font-bold text-slate-900 text-lg">Bienvenue sur SimDouane !</p>
                <p className="text-slate-500 text-sm mt-1">Votre profil est complet. Redirection vers votre tableau de bord…</p>
              </div>
              <div className="pt-2">
                <div className="h-1 w-full bg-slate-100 rounded-full overflow-hidden">
                  <div className="h-1 bg-[#003D24] rounded-full animate-[progress_1.4s_linear_forwards]" style={{ width: "0%", animation: "width 1.4s linear forwards" }} />
                </div>
              </div>
            </div>
          ) : step === "poste" ? (
            <div className="p-7 space-y-6">
              <div>
                <div className="h-10 w-10 bg-[#003D24]/10 rounded-xl flex items-center justify-center mb-4">
                  <Briefcase className="h-5 w-5 text-[#003D24]" />
                </div>
                <h2 className="text-xl font-bold text-slate-900">Quel est votre poste ?</h2>
                <p className="text-slate-500 text-sm mt-1">Cela nous aide à personnaliser votre expérience.</p>
              </div>

              <div className="space-y-2">
                {POSTES.map((p) => (
                  <button
                    key={p}
                    onClick={() => setPoste(p)}
                    className={cn(
                      "w-full text-left px-4 py-3 rounded-xl border-2 text-sm font-medium transition-all",
                      poste === p
                        ? "border-[#003D24] bg-[#003D24]/5 text-[#003D24] font-semibold"
                        : "border-slate-200 text-slate-700 hover:border-slate-300"
                    )}
                  >
                    {p}
                  </button>
                ))}
              </div>

              <Button
                onClick={goNext}
                disabled={!poste}
                className="w-full bg-[#003D24] hover:bg-[#004d2e] text-white font-semibold h-12 gap-2"
              >
                Continuer <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          ) : (
            <div className="p-7 space-y-6">
              <div>
                <div className="h-10 w-10 bg-[#003D24]/10 rounded-xl flex items-center justify-center mb-4">
                  <MessageCircle className="h-5 w-5 text-[#003D24]" />
                </div>
                <h2 className="text-xl font-bold text-slate-900">Votre numéro WhatsApp</h2>
                <p className="text-slate-500 text-sm mt-1">Optionnel — pour qu'on puisse vous contacter rapidement.</p>
              </div>

              <div className="space-y-3">
                <div className="flex items-center gap-2 bg-slate-50 border border-slate-200 rounded-xl px-4 py-3">
                  <span className="text-lg">🇧🇯</span>
                  <span className="text-slate-400 font-medium text-sm">+229</span>
                  <Input
                    type="tel"
                    placeholder="01 23 45 67 89"
                    value={whatsapp}
                    onChange={(e) => setWhatsapp(e.target.value)}
                    className="border-0 bg-transparent p-0 h-auto focus-visible:ring-0 text-slate-900 font-medium"
                  />
                </div>
                <p className="text-xs text-slate-400">Format : +229 01 XX XX XX XX</p>
              </div>

              <div className="space-y-2">
                <Button
                  onClick={goNext}
                  disabled={updateProfile.isPending}
                  className="w-full bg-[#003D24] hover:bg-[#004d2e] text-white font-semibold h-12 gap-2"
                >
                  {updateProfile.isPending ? (
                    <><Loader2 className="h-4 w-4 animate-spin" /> Enregistrement…</>
                  ) : (
                    <>Terminer <CheckCircle className="h-4 w-4" /></>
                  )}
                </Button>
                <button
                  onClick={() => {
                    setWhatsapp("");
                    handleSubmit();
                  }}
                  className="w-full text-center text-xs text-slate-400 hover:text-slate-600 py-1"
                >
                  Passer cette étape
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
