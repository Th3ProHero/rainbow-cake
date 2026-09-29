import { getCurrentUser } from "@/lib/auth";
import { UserHeader, UserBottomNav } from "@/components/layout/user-nav";

export default async function UserLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await getCurrentUser();

  return (
    <div className="min-h-screen bg-meringue flex flex-col pb-20 sm:pb-6">
      <UserHeader userName={user?.name} />
      <main className="flex-1 max-w-5xl w-full mx-auto p-4 sm:p-6">
        {children}
      </main>
      <UserBottomNav />
    </div>
  );
}
