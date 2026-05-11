import { z } from 'zod';

export const workspaceSlugSchema = z
  .string()
  .trim()
  .toLowerCase()
  .min(3, 'Slug muito curto')
  .max(40)
  .regex(/^[a-z0-9-]+$/, 'Use apenas letras minúsculas, números e hífen');

export const createWorkspaceSchema = z.object({
  name: z.string().trim().min(2, 'Nome obrigatório').max(80),
  slug: workspaceSlugSchema,
});
export type CreateWorkspaceInput = z.infer<typeof createWorkspaceSchema>;
