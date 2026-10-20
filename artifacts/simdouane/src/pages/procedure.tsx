import { useLocation } from "wouter";
import { AlertTriangle, CheckCircle2, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useLang } from "@/context/language-context";
import { T } from "@/lib/translations";

export default function Procedure() {
  const { lang } = useLang();
  const t = T[lang].procedure;
  const [, setLocation] = useLocation();

  return (
    <div className="max-w-3xl mx-auto space-y-10 pb-10">

      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold">{t.title}</h1>
        <p className="text-muted-foreground mt-2">{t.subtitle}</p>
        <p className="mt-4 text-sm text-foreground/80 leading-relaxed bg-muted/40 border rounded-xl px-4 py-3">
          {t.intro}
        </p>
      </div>

      {/* Timeline steps */}
      <div className="relative">
        {/* Vertical line */}
        <div className="absolute left-8 top-0 bottom-0 w-0.5 bg-gradient-to-b from-transparent via-border to-transparent hidden md:block" />

        <div className="space-y-6">
          {t.steps.map((step, idx) => (
            <div key={idx} className="relative flex gap-5 md:gap-6">

              {/* Step number bubble */}
              <div
                className="relative z-10 flex-shrink-0 w-16 h-16 rounded-2xl flex flex-col items-center justify-center text-white shadow-md"
                style={{ backgroundColor: step.color }}
              >
                <span className="text-lg leading-none">{step.icon}</span>
                <span className="text-[9px] font-black mt-0.5 tracking-widest opacity-80">
                  {step.number}
                </span>
              </div>

              {/* Content card */}
              <div className="flex-1 bg-white border rounded-2xl shadow-sm overflow-hidden">
                {/* Card header */}
                <div
                  className="px-5 py-3 flex items-center gap-2"
                  style={{ backgroundColor: step.color + "14", borderBottom: `2px solid ${step.color}30` }}
                >
                  <h3 className="font-bold text-base text-foreground">{step.title}</h3>
                </div>

                {/* Description */}
                <div className="px-5 pt-3 pb-2">
                  <p className="text-sm text-muted-foreground leading-relaxed">{step.desc}</p>
                </div>

                {/* Detail bullets */}
                <ul className="px-5 pb-4 space-y-1.5 mt-1">
                  {step.details.map((d, i) => (
                    <li key={i} className="flex items-start gap-2 text-sm">
                      <CheckCircle2
                        className="h-3.5 w-3.5 mt-0.5 shrink-0"
                        style={{ color: step.color }}
                      />
                      <span className="text-foreground/80 leading-snug">{d}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Important notes */}
      <div className="rounded-2xl border border-amber-200 bg-amber-50 overflow-hidden">
        <div className="flex items-center gap-2 px-5 py-3 bg-amber-100 border-b border-amber-200">
          <AlertTriangle className="h-4 w-4 text-amber-600 shrink-0" />
          <p className="font-bold text-sm text-amber-800">{t.importantNote}</p>
        </div>
        <ul className="px-5 py-4 space-y-2">
          {t.notes.map((note, i) => (
            <li key={i} className="flex items-start gap-2 text-sm text-amber-900">
              <ArrowRight className="h-3.5 w-3.5 mt-0.5 shrink-0 text-amber-500" />
              <span className="leading-snug">{note}</span>
            </li>
          ))}
        </ul>
      </div>

      {/* CTA */}
      <div className="flex justify-center pb-2">
        <Button
          size="lg"
          onClick={() => setLocation("/simulateur")}
          className="gap-2 px-8"
        >
          {t.useSim}
          <ArrowRight className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}
