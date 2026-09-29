import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { ProfileForm } from "./profile-form";

export const metadata = {
  title: "Mi Perfil — Rainbow Cake GO",
};

export default async function ProfilePage() {
  const user = await getCurrentUser();

  if (!user) {
    redirect("/login?from=/profile");
  }

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl sm:text-3xl font-bold font-display text-ink">
          Mi Perfil
        </h1>
        <p className="text-sm text-ink-secondary mt-1">
          Administra tus datos de contacto y seguridad
        </p>
      </div>

      <ProfileForm user={user} />
    </div>
  );
}
