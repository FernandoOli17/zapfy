import Link from 'next/link';
import { notFound } from 'next/navigation';
import { ArrowLeft, ArrowRight } from 'lucide-react';
import { MDXRemote } from 'next-mdx-remote/rsc';
import { Button } from '@zapai/ui';

import { mdxComponents } from '@/components/marketing/mdx-components';
import { formatPublishedDate, getPost, listSlugs } from '@/lib/blog';

interface PageProps {
  params: Promise<{ slug: string }>;
}

export async function generateStaticParams() {
  const slugs = await listSlugs();
  return slugs.map((slug) => ({ slug }));
}

export async function generateMetadata({ params }: PageProps) {
  const { slug } = await params;
  const post = await getPost(slug);
  if (!post) return {};
  return {
    title: post.title,
    description: post.description,
  };
}

export default async function BlogPostPage({ params }: PageProps) {
  const { slug } = await params;
  const post = await getPost(slug);
  if (!post) notFound();

  return (
    <>
      <section className="relative overflow-hidden">
        <div className="bg-radial-fade absolute inset-0 -z-10" aria-hidden />
        <div className="mx-auto max-w-3xl px-6 pt-16 pb-10 md:pt-24">
          <Link
            href="/blog"
            className="inline-flex items-center gap-1 text-xs uppercase tracking-widest text-muted-foreground transition-colors hover:text-foreground"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            Voltar pro blog
          </Link>

          <div className="mt-8 flex items-center gap-3 text-xs uppercase tracking-widest text-muted-foreground">
            <time dateTime={post.publishedAt}>{formatPublishedDate(post.publishedAt)}</time>
            <span aria-hidden>·</span>
            <span>{post.readingMinutes} min</span>
            <span aria-hidden>·</span>
            <span>{post.author}</span>
          </div>

          <h1 className="mt-5 text-4xl font-medium leading-[1.05] tracking-tight md:text-6xl">
            {post.title}
          </h1>
          <p className="mt-5 text-lg text-muted-foreground md:text-xl">{post.description}</p>

          {post.tags.length > 0 && (
            <div className="mt-6 flex flex-wrap gap-2">
              {post.tags.map((tag) => (
                <span
                  key={tag}
                  className="rounded-full border border-border/60 bg-secondary/40 px-3 py-1 text-xs text-muted-foreground"
                >
                  {tag}
                </span>
              ))}
            </div>
          )}
        </div>
      </section>

      <article className="pb-24">
        <div className="mx-auto max-w-3xl px-6">
          <MDXRemote source={post.content} components={mdxComponents} />
        </div>
      </article>

      <section className="border-t border-border/60 py-20">
        <div className="mx-auto max-w-4xl px-6 text-center">
          <h2 className="text-3xl font-medium tracking-tight md:text-5xl">
            Quer ver{' '}
            <span className="font-serif italic font-normal text-primary">funcionando?</span>
          </h2>
          <p className="mt-5 text-lg text-muted-foreground md:text-xl">
            7 dias grátis, sem cartão. Conversa com o Forge, publica o agente, conecta o WhatsApp.
          </p>
          <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
            <Button asChild size="lg" className="h-12 px-6 text-base">
              <Link href="/signup">
                Criar conta grátis <ArrowRight className="ml-2 h-4 w-4" />
              </Link>
            </Button>
            <Button asChild variant="outline" size="lg" className="h-12 px-5 text-base">
              <Link href="/blog">Ver outros posts</Link>
            </Button>
          </div>
        </div>
      </section>
    </>
  );
}
