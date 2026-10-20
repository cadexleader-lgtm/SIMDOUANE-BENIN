import { useRef, useEffect, useState } from "react";
import { useGetProfile, useUpdateProfile } from "@workspace/api-client-react";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import * as z from "zod";
import { User, Phone, Mail, Shield, Check, Loader2, CreditCard, KeyRound, ExternalLink, Briefcase, MessageCircle } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Form, FormControl, FormField, FormItem, FormLabel, FormMessage,
} from "@/components/ui/form";
import { Skeleton } from "@/components/ui/skeleton";
import { queryClient } from "@/lib/queryClient";
import { useLocation } from "wouter";
import { useClerk } from "@clerk/react";

const POSTES = [
  "Transitaire", "Importateur de véhicules", "Commissionnaire en douane",
  "Courtier en douane", "Agent maritime", "Particulier importateur", "Autre",
];

const profileSchema = z.object({
  fullName: z.string().min(2, "Le nom doit contenir au moins 2 caractères"),
  phone:    z.string().optional(),
  whatsapp: z.string().optional(),
  poste:    z.string().optional(),
});

type ProfileValues = z.infer<typeof profileSchema>;

export default function Profil() {
  const [, setLocation] = useLocation();
  const { openUserProfile } = useClerk();
  const { data: profile, isLoading } = useGetProfile();
  const updateProfile = useUpdateProfile();
  const updateMutationRef = useRef(updateProfile.mutate);
  updateMutationRef.current = updateProfile.mutate;

  const [saved, setSaved] = useState(false);

  const form = useForm<ProfileValues>({
    resolver: zodResolver(profileSchema),
    defaultValues: {
      fullName: "",
      phone:    "",
      whatsapp: "",
      poste:    "",
    },
  });

  const initializedForId = useRef<string | null>(null);

  useEffect(() => {
    if (profile && initializedForId.current !== profile.id) {
      initializedForId.current = profile.id;
      form.reset({
        fullName: profile.fullName || "",
        phone:    profile.phone    || "",
        whatsapp: profile.whatsapp || "",
        poste:    profile.poste    || "",
      });
    }
  }, [profile, form]);

  const onSubmit = (values: ProfileValues) => {
    updateMutationRef.current(
      { data: values },
      {
        onSuccess: (data) => {
          setSaved(true);
          setTimeout(() => setSaved(false), 3000);
          queryClient.setQueryData(["/api/profile"], (old: any) =>
            old ? { ...old, fullName: data.fullName, phone: data.phone, whatsapp: data.whatsapp, poste: data.poste } : old
          );
        }
      }
    );
  };

  if (isLoading) {
    return (
      <div className="max-w-3xl mx-auto space-y-6">
        <Skeleton className="h-10 w-48 mb-6" />
        <Card>
          <CardHeader>
            <Skeleton className="h-6 w-32" />
          </CardHeader>
          <CardContent className="space-y-4">
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-10 w-full" />
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto space-y-8">
      <div>
        <h1 className="text-3xl font-bold text-slate-900 tracking-tight">Mon Profil</h1>
        <p className="text-slate-500 mt-1">Gérez vos informations personnelles et vos préférences.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="md:col-span-2 space-y-6">
          <Card className="border-slate-200 shadow-sm">
            <CardHeader className="border-b border-slate-100 pb-4">
              <CardTitle className="text-lg">Informations personnelles</CardTitle>
            </CardHeader>
            <CardContent className="pt-6">
              <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-5">
                  <div className="space-y-2">
                    <label className="text-sm font-medium leading-none text-slate-700">Adresse Email</label>
                    <div className="relative">
                      <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                      <Input 
                        value={profile?.email || ""} 
                        disabled 
                        className="pl-9 bg-slate-50 text-slate-500 border-slate-200"
                      />
                    </div>
                    <p className="text-[10px] text-slate-500">L'adresse email est liée à votre compte et ne peut être modifiée ici.</p>
                  </div>

                  <FormField
                    control={form.control}
                    name="fullName"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Nom complet</FormLabel>
                        <FormControl>
                          <div className="relative">
                            <User className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                            <Input placeholder="John Doe" className="pl-9" {...field} />
                          </div>
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="phone"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Numéro de téléphone</FormLabel>
                        <FormControl>
                          <div className="relative">
                            <Phone className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                            <Input placeholder="+229 XX XX XX XX" className="pl-9" {...field} />
                          </div>
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="whatsapp"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Numéro WhatsApp</FormLabel>
                        <FormControl>
                          <div className="relative">
                            <MessageCircle className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                            <Input placeholder="+229 01 XX XX XX XX" className="pl-9" {...field} />
                          </div>
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="poste"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Poste / Fonction</FormLabel>
                        <FormControl>
                          <div className="relative">
                            <Briefcase className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 z-10" />
                            <select
                              {...field}
                              className="flex h-10 w-full rounded-md border border-input bg-background pl-9 pr-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 appearance-none text-slate-900"
                            >
                              <option value="">-- Sélectionner --</option>
                              {POSTES.map(p => (
                                <option key={p} value={p}>{p}</option>
                              ))}
                            </select>
                          </div>
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <div className="pt-2">
                    <Button 
                      type="submit" 
                      className="bg-[#003D24] hover:bg-[#004d2e] text-white min-w-[140px]"
                      disabled={updateProfile.isPending}
                    >
                      {updateProfile.isPending ? (
                        <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Enregistrement...</>
                      ) : saved ? (
                        <><Check className="h-4 w-4 mr-2" /> Enregistré</>
                      ) : (
                        "Enregistrer les modifications"
                      )}
                    </Button>
                  </div>
                </form>
              </Form>
            </CardContent>
          </Card>
        </div>

        <div className="space-y-6">
          <Card className="border-slate-200 shadow-sm bg-slate-50">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-semibold flex items-center gap-2">
                <Shield className="h-4 w-4 text-slate-500" />
                Sécurité du compte
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-xs text-slate-500 leading-relaxed mb-4">
                Modifiez votre email, mot de passe ou méthodes de connexion (Google, etc.) via le portail sécurisé.
              </p>
              <Button
                variant="outline"
                size="sm"
                className="w-full text-xs font-semibold gap-2"
                onClick={() => openUserProfile()}
              >
                <KeyRound className="h-3.5 w-3.5" />
                Gérer mon compte
                <ExternalLink className="h-3 w-3 ml-auto opacity-50" />
              </Button>
            </CardContent>
          </Card>

          <Card className="border-slate-200 shadow-sm">
            <CardHeader className="pb-3 border-b border-slate-100">
              <CardTitle className="text-sm font-semibold flex items-center gap-2">
                <CreditCard className="h-4 w-4 text-[#003D24]" />
                Mon abonnement
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-4">
              <p className="text-xs text-slate-600 mb-4">
                Gérez votre plan tarifaire et consultez vos quotas de simulation restants.
              </p>
              <Button 
                variant="outline" 
                size="sm" 
                className="w-full text-xs font-semibold"
                onClick={() => setLocation("/abonnement")}
              >
                Gérer l'abonnement
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}