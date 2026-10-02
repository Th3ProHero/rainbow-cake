export const dynamic = "force-dynamic";

import { prisma } from "@/lib/db";
import { NewsListView, type UserNewsPost } from "./news-list-view";

export const metadata = {
  title: "Noticias y Anuncios — Rainbow Cake GO",
  description:
    "Comunicaciones oficiales, avisos de pedidos, fechas de arribo e información importante de Rainbow Cake GO.",
};

export default async function NewsPage() {
  const postsRaw = await prisma.newsPost.findMany({
    where: {
      isPublished: true,
    },
    orderBy: {
      publishedAt: "desc",
    },
  });

  const posts: UserNewsPost[] = postsRaw.map((p) => ({
    id: p.id,
    title: p.title,
    body: p.body,
    imagePath: p.imagePath,
    publishedAt: p.publishedAt.toISOString(),
  }));

  return <NewsListView posts={posts} />;
}
