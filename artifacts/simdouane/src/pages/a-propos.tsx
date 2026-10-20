import { Shield, Zap, CheckCircle, Phone, Mail, MessageCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { SimDouaneLogo } from "@/components/logo";
import { useLang } from "@/context/language-context";
import { T } from "@/lib/translations";

export default function APropos() {
  const { lang } = useLang();
  const t = T[lang].about;

  return (
    <div className="max-w-2xl mx-auto space-y-10">
      <div className="flex flex-col items-center text-center gap-4 pt-4">
        <SimDouaneLogo size={96} />
        <div>
          <h1 className="text-3xl font-bold tracking-wide">{t.title}</h1>
          <p className="text-sm font-medium text-muted-foreground mt-1 uppercase tracking-widest">{t.tagline}</p>
          <p className="text-primary font-semibold mt-3 text-base italic">{t.motto}</p>
        </div>
      </div>

      <Card>
        <CardContent className="pt-6 text-sm text-muted-foreground leading-relaxed">{t.desc}</CardContent>
      </Card>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {[
          { icon: Shield,      title: t.reliable, desc: t.reliableDesc },
          { icon: Zap,         title: t.fast,     desc: t.fastDesc },
          { icon: CheckCircle, title: t.simple,   desc: t.simpleDesc },
        ].map((f) => (
          <Card key={f.title}>
            <CardContent className="pt-5 flex flex-col items-center text-center gap-3">
              <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
                <f.icon className="h-5 w-5 text-primary" />
              </div>
              <div>
                <p className="font-bold text-sm">{f.title}</p>
                <p className="text-xs text-muted-foreground mt-1">{f.desc}</p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card className="border-primary/20">
        <CardContent className="pt-6 space-y-5">
          <div>
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-widest mb-2">{t.createdBy}</p>
            <p className="text-xl font-bold">HAZOUME AKUEGNON Clarence Alvin</p>
            <p className="text-sm text-muted-foreground mt-1">{t.founder}</p>
          </div>
          <div className="border-t pt-4 space-y-3">
            {[
              { num: "+229 56 50 13 48", tel: "+22956501348", wa: "22956501348" },
              { num: "+229 41 82 27 30", tel: "+22941822730", wa: "22941822730" },
            ].map((c) => (
              <div key={c.tel} className="flex items-center justify-between flex-wrap gap-3">
                <div>
                  <p className="text-xs text-muted-foreground">{t.customerService}</p>
                  <p className="font-semibold text-sm">{c.num}</p>
                </div>
                <div className="flex gap-2">
                  <a href={`tel:${c.tel}`}>
                    <Button size="sm" variant="outline" className="gap-1.5 text-xs h-8">
                      <Phone className="h-3.5 w-3.5" />{T[lang].layout.call}
                    </Button>
                  </a>
                  <a href={`https://wa.me/${c.wa}`} target="_blank" rel="noreferrer">
                    <Button size="sm" className="gap-1.5 text-xs h-8 bg-[#25D366] hover:bg-[#20bd5a] text-white">
                      <MessageCircle className="h-3.5 w-3.5" />WhatsApp
                    </Button>
                  </a>
                </div>
              </div>
            ))}
            <div className="flex items-center justify-between flex-wrap gap-3">
              <div>
                <p className="text-xs text-muted-foreground">{t.customerService.replace("WhatsApp / ", "").replace(" / Call", "")}</p>
                <p className="font-semibold text-sm">hazoumeclarence@gmail.com</p>
              </div>
              <a href="mailto:hazoumeclarence@gmail.com">
                <Button size="sm" variant="outline" className="gap-1.5 text-xs h-8">
                  <Mail className="h-3.5 w-3.5" />{T[lang].layout.email}
                </Button>
              </a>
            </div>
          </div>
        </CardContent>
      </Card>

      <p className="text-center text-xs text-muted-foreground pb-4">{t.copyright}</p>
    </div>
  );
}
