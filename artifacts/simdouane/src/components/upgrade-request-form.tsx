import { useState } from "react";
import { Loader2, MessageCircle, ReceiptText, Smartphone } from "lucide-react";
import { useCreateUpgradeRequest } from "@workspace/api-client-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { PAYMENT_CONFIG, MobileMoneyOperator } from "@/lib/payment-config";

type Props = {
  defaultPlan?: "Standard" | "Pro";
  compact?: boolean;
  onSuccess?: () => void;
  onCancel?: () => void;
};

export function UpgradeRequestForm({ defaultPlan = "Standard", compact = false, onSuccess, onCancel }: Props) {
  const createRequest = useCreateUpgradeRequest();
  const [planWanted, setPlanWanted] = useState<"Standard" | "Pro">(defaultPlan);
  const [durationMonths, setDurationMonths] = useState<1 | 3 | 6 | 12>(1);
  const [mobileMoneyPhone, setMobileMoneyPhone] = useState("");
  const [mobileMoneyOperator, setMobileMoneyOperator] = useState<MobileMoneyOperator>("MTN MoMo");
  const [transactionReference, setTransactionReference] = useState("");
  const [declaredAmount, setDeclaredAmount] = useState("");
  const [receiptUrl, setReceiptUrl] = useState("");
  const [message, setMessage] = useState("");
  const [sent, setSent] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = () => {
    setError("");
    const amount = Number(declaredAmount);
    if (!mobileMoneyPhone.trim() || !transactionReference.trim() || !Number.isFinite(amount) || amount <= 0) {
      setError("Renseignez le téléphone Mobile Money, la référence et le montant déclaré.");
      return;
    }

    createRequest.mutate(
      {
        data: {
          planWanted,
          durationMonths,
          mobileMoneyPhone: mobileMoneyPhone.trim(),
          mobileMoneyOperator,
          transactionReference: transactionReference.trim(),
          declaredAmount: amount,
          receiptUrl: receiptUrl.trim() || undefined,
          message: message.trim() || undefined,
        },
      },
      {
        onSuccess: () => {
          setSent(true);
          onSuccess?.();
        },
        onError: (err: any) => {
          setError(err?.status === 409 ? "Une demande est déjà en cours de vérification pour ce compte." : "La demande n'a pas pu être envoyée. Réessayez.");
        },
      },
    );
  };

  if (sent) {
    return (
      <div className="rounded-2xl border border-green-200 bg-green-50 p-5 text-center space-y-2">
        <ReceiptText className="h-7 w-7 mx-auto text-green-700" />
        <p className="font-bold text-green-900">Demande reçue</p>
        <p className="text-sm text-green-800">
          Statut initial : demande reçue. L’administrateur vérifiera le paiement avant toute activation manuelle.
        </p>
        {onCancel && <Button variant="outline" onClick={onCancel} className="mt-2">Fermer</Button>}
      </div>
    );
  }

  return (
    <div className={`space-y-4 ${compact ? "" : "rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"}`}>
      {!compact && (
        <div>
          <h3 className="font-bold text-slate-900">Demande Mobile Money</h3>
          <p className="text-xs text-slate-500 mt-1">Le paiement et l’activation restent manuels.</p>
        </div>
      )}

      <div className="rounded-xl border border-blue-100 bg-blue-50 p-3 text-xs text-blue-900">
        <div className="flex items-start gap-2">
          <Smartphone className="h-4 w-4 shrink-0 mt-0.5" />
          <div>
            <p className="font-semibold">{PAYMENT_CONFIG.accountLabel}</p>
            <p className="mt-1 leading-relaxed">{PAYMENT_CONFIG.instructions}</p>
            {PAYMENT_CONFIG.enabled && PAYMENT_CONFIG.phone && <p className="font-bold mt-2">{PAYMENT_CONFIG.phone}</p>}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-2">
        {(["Standard", "Pro"] as const).map((plan) => (
          <button key={plan} type="button" onClick={() => setPlanWanted(plan)}
            className={`rounded-xl border-2 py-2.5 text-sm font-bold ${planWanted === plan ? "border-[#003D24] bg-[#003D24] text-white" : "border-slate-200 text-slate-600"}`}>
            {plan}
          </button>
        ))}
      </div>

      <div className="grid grid-cols-2 gap-3">
        <label className="text-xs font-semibold text-slate-700">
          Durée
          <select value={durationMonths} onChange={(e) => setDurationMonths(Number(e.target.value) as 1 | 3 | 6 | 12)}
            className="mt-1 h-10 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm font-normal">
            <option value={1}>1 mois</option><option value={3}>3 mois</option><option value={6}>6 mois</option><option value={12}>12 mois</option>
          </select>
        </label>
        <label className="text-xs font-semibold text-slate-700">
          Opérateur
          <select value={mobileMoneyOperator} onChange={(e) => setMobileMoneyOperator(e.target.value as MobileMoneyOperator)}
            className="mt-1 h-10 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm font-normal">
            {PAYMENT_CONFIG.operators.map((operator) => <option key={operator}>{operator}</option>)}
          </select>
        </label>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <label className="text-xs font-semibold text-slate-700">Téléphone Mobile Money
          <Input value={mobileMoneyPhone} onChange={(e) => setMobileMoneyPhone(e.target.value)} placeholder="+229 …" className="mt-1" />
        </label>
        <label className="text-xs font-semibold text-slate-700">Montant déclaré (FCFA)
          <Input type="number" min="1" value={declaredAmount} onChange={(e) => setDeclaredAmount(e.target.value)} placeholder="Ex. 2500" className="mt-1" />
        </label>
      </div>

      <label className="text-xs font-semibold text-slate-700">Référence de transaction
        <Input value={transactionReference} onChange={(e) => setTransactionReference(e.target.value)} placeholder="Référence Mobile Money" className="mt-1" />
      </label>
      <label className="text-xs font-semibold text-slate-700">Lien vers le reçu (facultatif)
        <Input value={receiptUrl} onChange={(e) => setReceiptUrl(e.target.value)} placeholder="https://… ou laissez vide" className="mt-1" />
      </label>
      <label className="text-xs font-semibold text-slate-700">Message (facultatif)
        <textarea value={message} onChange={(e) => setMessage(e.target.value)} rows={2} placeholder="Précisions utiles pour la vérification…"
          className="mt-1 w-full resize-none rounded-lg border border-slate-200 p-3 text-sm font-normal focus:outline-none focus:ring-2 focus:ring-[#003D24]/20" />
      </label>

      {error && <p className="rounded-lg bg-red-50 p-2 text-xs font-medium text-red-700">{error}</p>}
      <div className="flex gap-2">
        {onCancel && <Button type="button" variant="outline" onClick={onCancel} className="flex-1">Annuler</Button>}
        <Button type="button" onClick={handleSubmit} disabled={createRequest.isPending}
          className="flex-1 bg-[#003D24] text-white hover:bg-[#004d2e]">
          {createRequest.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <><MessageCircle className="h-4 w-4 mr-2" />Envoyer la demande</>}
        </Button>
      </div>
    </div>
  );
}