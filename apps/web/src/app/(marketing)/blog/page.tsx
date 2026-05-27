import Link from 'next/link';
import { ArrowRight } from 'lucide-react';

import { formatPublishedDate, listPosts } from '@/lib/blog';

export const metadata = {
  title: 'Blog',
  description: 'Como construímos o Trato: engenharia, produto, LGPD, e o que aprendemos.',
};

export default async function BlogPage() {
  const posts = await listPosts();

  return (
    <>
      <section className="relative overflow-hidden">
        <div className="bg-radial-fade absolute inset-0 -z-10" aria-hidden />
        <div className="mx-auto max-w-6xl px-6 pt-20 pb-12 md:pt-28 md:pb-16">
          <p className="text-xs uppercase tracking-widest text-muted-foreground">Blog</p>
          <h1 className="mt-4 text-5xl font-medium leading-[1.05] tracking-tight md:text-7xl">
            Notas sobre construir{' '}
            <span className="font-serif italic font-normal text-primary">o Trato.</span>
          </h1>
          <p className="mt-6 max-w-2xl text-lg text-muted-foreground md:text-xl">
            Engenharia, produto, design, LGPD, decisões de arquitetura. O que tá funcionando
            e o que mudamos depois de ver na prática.
          </p>
        </div>
      </section>

      <section className="pb-28">
        <div className="mx-auto max-w-3xl px-6">
          {posts.length === 0 ? (
            <div className="rounded-xl border border-dashed border-border/60 bg-card/30 p-10 text-center">
              <p className="text-base font-medium">Em breve, os primeiros posts.</p>
              <p className="mt-2 text-sm text-muted-foreground">
                Estamos escrevendo sobre como funciona o Forge por dentro, a arquitetura
                multi-tenant, e o que aprendemos colocando agentes IA no WhatsApp de empresas
                reais. Avisamos por e-mail quando publicar — ou siga{' '}
                <a href="mailto:oi@trato.dev" className="text-primary underline">
                  oi@trato.dev
                </a>{' '}
                pra entrar na lista.
              </p>
            </div>
          ) : (
            <ol className="divide-y divide-border/60">
              {posts.map((post) => (
                <li key={post.slug}>
                  <Link
                    href={`/blog/${post.slug}` as never}
                    className="group block py-8 transition-colors"
                  >
                    <div className="flex items-center gap-3 text-xs uppercase tracking-widest text-muted-foreground">
                      <time dateTime={post.publishedAt}>
                        {formatPublishedDate(post.publishedAt)}
                      </time>
                      <span aria-hidden>·</span>
                      <span>{post.readingMinutes} min de leitura</span>
                      {post.tags.length > 0 && (
                        <>
                          <span aria-hidden>·</span>
                          <span>{post.tags.join(' · ')}</span>
                        </>
                      )}
                    </div>
                    <h2 className="mt-3 text-2xl font-medium leading-tight tracking-tight transition-colors group-hover:text-primary md:text-3xl">
                      {post.title}
                    </h2>
                    <p className="mt-3 text-muted-foreground">{post.description}</p>
                    <p className="mt-4 inline-flex items-center gap-1 text-sm text-primary opacity-70 transition-opacity group-hover:opacity-100">
                      Ler post completo <ArrowRight className="h-3.5 w-3.5" />
                    </p>
                  </Link>
                </li>
              ))}
            </ol>
          )}
        </div>
      </section>
    </>
  );
}
