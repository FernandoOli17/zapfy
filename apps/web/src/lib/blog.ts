import 'server-only';

import { promises as fs } from 'node:fs';
import path from 'node:path';

import matter from 'gray-matter';
import readingTime from 'reading-time';
import { z } from 'zod';

const POSTS_DIR = path.join(process.cwd(), 'content', 'blog');

const frontmatterSchema = z.object({
  title: z.string(),
  description: z.string(),
  publishedAt: z.string(), // YYYY-MM-DD
  author: z.string(),
  tags: z.array(z.string()).default([]),
});

export type BlogPostFrontmatter = z.infer<typeof frontmatterSchema>;

export interface BlogPostMeta extends BlogPostFrontmatter {
  slug: string;
  readingMinutes: number;
}

export interface BlogPost extends BlogPostMeta {
  content: string;
}

async function listPostFiles(): Promise<string[]> {
  try {
    const entries = await fs.readdir(POSTS_DIR, { withFileTypes: true });
    return entries
      .filter((e) => e.isFile() && e.name.endsWith('.mdx'))
      .map((e) => e.name);
  } catch (err) {
    if ((err as NodeJS.ErrnoException).code === 'ENOENT') return [];
    throw err;
  }
}

async function readPost(filename: string): Promise<BlogPost> {
  const slug = filename.replace(/\.mdx$/, '');
  const raw = await fs.readFile(path.join(POSTS_DIR, filename), 'utf8');
  const { data, content } = matter(raw);
  const fm = frontmatterSchema.parse(data);
  const stats = readingTime(content);
  return {
    slug,
    ...fm,
    content,
    readingMinutes: Math.max(1, Math.round(stats.minutes)),
  };
}

export async function listPosts(): Promise<BlogPostMeta[]> {
  const files = await listPostFiles();
  const posts = await Promise.all(files.map(readPost));
  return posts
    .map(({ content: _content, ...meta }) => meta)
    .sort((a, b) => (a.publishedAt < b.publishedAt ? 1 : -1));
}

export async function getPost(slug: string): Promise<BlogPost | null> {
  const filename = `${slug}.mdx`;
  try {
    return await readPost(filename);
  } catch (err) {
    if ((err as NodeJS.ErrnoException).code === 'ENOENT') return null;
    throw err;
  }
}

export async function listSlugs(): Promise<string[]> {
  const files = await listPostFiles();
  return files.map((f) => f.replace(/\.mdx$/, ''));
}

export function formatPublishedDate(date: string): string {
  return new Date(`${date}T12:00:00-03:00`).toLocaleDateString('pt-BR', {
    day: '2-digit',
    month: 'long',
    year: 'numeric',
  });
}
