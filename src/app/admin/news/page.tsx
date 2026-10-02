export const dynamic = "force-dynamic";

import { redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import { NewsAdmin } from "./news-admin";

export const metadata = {
  title: "Noticias y Anuncios | Admin Rainbow Cake GO",
  description: "Gestiona noticias y anuncios generales para los usuarios.",
};

export default async function AdminNewsPage() {
  const user = await getCurrentUser();
  if (!user || user.role !== "ADMIN") {
    redirect("/login?redirectTo=/admin/news");
  }

  const posts = await prisma.newsPost.findMany({
    orderBy: { publishedAt: "desc" },
  });

  const serializedPosts = posts.map((p) => ({
    id: p.id,
    title: p.title,
    body: p.body,
    imagePath: p.imagePath,
    isPublished: p.isPublished,
    publishedAt: p.publishedAt.toISOString(),
  }));

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl sm:text-3xl font-display font-bold text-ink">
          Noticias y Anuncios
        </h1>
        <p className="text-sm text-ink-secondary mt-1">
          Publica comunicaciones generales, avisos e informes para los usuarios de la plataforma.
        </p>
      </div>

      <NewsAdmin posts={serializedPosts} />
    </div>
  );
}
