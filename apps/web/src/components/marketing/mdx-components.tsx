import type {
  AnchorHTMLAttributes,
  BlockquoteHTMLAttributes,
  HTMLAttributes,
  LiHTMLAttributes,
  OlHTMLAttributes,
  TdHTMLAttributes,
  ThHTMLAttributes,
} from 'react';
import type { MDXComponents } from 'mdx/types';
import Link from 'next/link';

import { cn } from '@zapai/ui';

type HeadingAttrs = HTMLAttributes<HTMLHeadingElement>;
type ParagraphAttrs = HTMLAttributes<HTMLParagraphElement>;
type UListAttrs = HTMLAttributes<HTMLUListElement>;
type OListAttrs = OlHTMLAttributes<HTMLOListElement>;
type LiAttrs = LiHTMLAttributes<HTMLLIElement>;
type SpanAttrs = HTMLAttributes<HTMLSpanElement>;
type QuoteAttrs = BlockquoteHTMLAttributes<HTMLQuoteElement>;
type CodeAttrs = HTMLAttributes<HTMLElement>;
type PreAttrs = HTMLAttributes<HTMLPreElement>;
type TableAttrs = HTMLAttributes<HTMLTableElement>;
type TableSectionAttrs = HTMLAttributes<HTMLTableSectionElement>;
type ThAttrs = ThHTMLAttributes<HTMLTableCellElement>;
type TdAttrs = TdHTMLAttributes<HTMLTableCellElement>;
type HrAttrs = HTMLAttributes<HTMLHRElement>;
type AnchorAttrs = AnchorHTMLAttributes<HTMLAnchorElement>;

export const mdxComponents: MDXComponents = {
  h1: ({ className, ...props }: HeadingAttrs) => (
    <h1
      className={cn(
        'mt-16 text-3xl font-medium leading-tight tracking-tight md:text-4xl',
        className,
      )}
      {...props}
    />
  ),
  h2: ({ className, ...props }: HeadingAttrs) => (
    <h2
      className={cn(
        'mt-14 border-t border-border/60 pt-8 text-2xl font-medium leading-tight tracking-tight md:text-3xl',
        className,
      )}
      {...props}
    />
  ),
  h3: ({ className, ...props }: HeadingAttrs) => (
    <h3
      className={cn('mt-10 text-xl font-medium tracking-tight md:text-2xl', className)}
      {...props}
    />
  ),
  p: ({ className, ...props }: ParagraphAttrs) => (
    <p
      className={cn('mt-5 text-lg leading-relaxed text-muted-foreground', className)}
      {...props}
    />
  ),
  ul: ({ className, ...props }: UListAttrs) => (
    <ul
      className={cn(
        'mt-5 ml-6 list-disc space-y-2 text-muted-foreground marker:text-primary/60',
        className,
      )}
      {...props}
    />
  ),
  ol: ({ className, ...props }: OListAttrs) => (
    <ol
      className={cn(
        'mt-5 ml-6 list-decimal space-y-2 text-muted-foreground marker:text-primary/70',
        className,
      )}
      {...props}
    />
  ),
  li: ({ className, ...props }: LiAttrs) => (
    <li className={cn('leading-relaxed', className)} {...props} />
  ),
  strong: ({ className, ...props }: SpanAttrs) => (
    <strong className={cn('font-semibold text-foreground', className)} {...props} />
  ),
  em: ({ className, ...props }: SpanAttrs) => (
    <em
      className={cn('font-serif italic font-normal text-foreground', className)}
      {...props}
    />
  ),
  blockquote: ({ className, ...props }: QuoteAttrs) => (
    <blockquote
      className={cn(
        'mt-6 border-l-2 border-primary/60 pl-5 text-lg italic text-foreground/90',
        className,
      )}
      {...props}
    />
  ),
  code: ({ className, ...props }: CodeAttrs) => (
    <code
      className={cn(
        'rounded bg-secondary/60 px-1.5 py-0.5 font-mono text-[0.9em] text-foreground',
        className,
      )}
      {...props}
    />
  ),
  pre: ({ className, ...props }: PreAttrs) => (
    <pre
      className={cn(
        'mt-6 overflow-x-auto rounded-xl border border-border/60 bg-card/40 p-5 font-mono text-sm leading-relaxed',
        className,
      )}
      {...props}
    />
  ),
  table: ({ className, ...props }: TableAttrs) => (
    <div className="mt-6 overflow-x-auto rounded-xl border border-border/60 bg-card/40">
      <table className={cn('w-full text-sm', className)} {...props} />
    </div>
  ),
  thead: (props: TableSectionAttrs) => (
    <thead className="border-b border-border/60 text-left" {...props} />
  ),
  th: ({ className, ...props }: ThAttrs) => (
    <th
      className={cn(
        'px-5 py-3 text-xs font-medium uppercase tracking-widest text-muted-foreground',
        className,
      )}
      {...props}
    />
  ),
  td: ({ className, ...props }: TdAttrs) => (
    <td
      className={cn(
        'border-t border-border/40 px-5 py-3 align-top text-muted-foreground',
        className,
      )}
      {...props}
    />
  ),
  hr: ({ className, ...props }: HrAttrs) => (
    <hr className={cn('my-12 border-border/60', className)} {...props} />
  ),
  a: ({ className, href, children, ...props }: AnchorAttrs) => {
    const isInternal = href?.startsWith('/');
    if (isInternal && href) {
      return (
        <Link
          href={href as never}
          className={cn('text-primary underline-offset-4 hover:underline', className)}
        >
          {children}
        </Link>
      );
    }
    return (
      <a
        href={href}
        target={href?.startsWith('http') ? '_blank' : undefined}
        rel={href?.startsWith('http') ? 'noreferrer' : undefined}
        className={cn('text-primary underline-offset-4 hover:underline', className)}
        {...props}
      >
        {children}
      </a>
    );
  },
};
