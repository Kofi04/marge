import { z } from "zod";

/** Handle public : lettres/chiffres/tirets/underscores, 3–30 caractères. */
export const handleSchema = z
  .string()
  .trim()
  .toLowerCase()
  .min(3, "Au moins 3 caractères")
  .max(30, "30 caractères maximum")
  .regex(/^[a-z0-9_-]+$/, "Lettres, chiffres, - et _ uniquement");

/** Complétion / édition de profil. */
export const profileSchema = z.object({
  handle: handleSchema,
  display_name: z.string().trim().min(1, "Nom requis").max(80),
  bio: z.string().trim().max(280).optional().or(z.literal("")),
});
export type ProfileInput = z.infer<typeof profileSchema>;

/** Création d'une suggestion (validée côté serveur ; `kind` recalculé). */
export const createSuggestionSchema = z.object({
  article_id: z.string().uuid(),
  block_id: z.string().min(1),
  base_revision_id: z.string().uuid(),
  original_text: z.string().min(1),
  proposed_text: z.string().min(1).max(5000),
  reason: z.string().trim().max(500).optional().or(z.literal("")),
});
export type CreateSuggestionInput = z.infer<typeof createSuggestionSchema>;

/** Un bloc d'article. */
export const blockSchema = z.object({
  id: z.string().min(1),
  type: z.enum(["h1", "lede", "p", "quote", "code", "image"]),
  text: z.string(),
});

/** Un tag : minuscules, lettres/chiffres/tirets, 2–30 caractères. */
export const tagSchema = z
  .string()
  .trim()
  .toLowerCase()
  .min(2, "Au moins 2 caractères")
  .max(30, "30 caractères maximum")
  .regex(/^[a-z0-9-]+$/, "Lettres, chiffres et tirets");

/** Sauvegarde d'un article depuis l'éditeur. */
export const saveArticleSchema = z.object({
  id: z.string().uuid().optional(),
  title: z.string().trim().min(1, "Titre requis").max(200),
  lede: z.string().trim().max(400).optional().or(z.literal("")),
  blocks: z.array(blockSchema).min(1, "Au moins un bloc"),
  tags: z.array(tagSchema).max(6, "6 tags maximum").default([]),
  status: z.enum(["draft", "published"]).default("draft"),
  note: z.string().trim().max(200).optional().or(z.literal("")),
});
export type SaveArticleInput = z.infer<typeof saveArticleSchema>;

/** Commentaire sur le fil d'une réécriture. */
export const commentSchema = z.object({
  suggestion_id: z.string().uuid(),
  body: z.string().trim().min(1).max(1000),
});
