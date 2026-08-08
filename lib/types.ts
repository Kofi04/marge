/**
 * Types métier de Marge. Le principe non négociable : l'unité de contribution
 * est le bloc, pas la ligne. Un article est une liste ordonnée de blocs,
 * chacun avec un identifiant stable qui survit aux révisions.
 */

export type BlockType = "h1" | "lede" | "p" | "quote" | "code" | "image";

export interface Block {
  id: string;
  type: BlockType;
  /** Texte brut : ancre des suggestions et des diffs (toujours présent). */
  text: string;
  /**
   * Projection riche optionnelle (liens, gras, italique…) pour l'affichage.
   * Généré par l'éditeur ; ignoré par la logique de suggestion/diff qui ne
   * travaille que sur `text`. Pour un bloc image, `text` contient l'URL.
   */
  html?: string;
}

export type SuggestionKind = "typo" | "edit";

export type SuggestionStatus = "open" | "accepted" | "rejected" | "withdrawn";

/** Statut effectif affiché, incluant l'état calculé `stale` (non stocké). */
export type ResolvedStatus = SuggestionStatus | "stale";

export type ArticleStatus = "draft" | "published" | "archived";

export interface Profile {
  id: string;
  handle: string;
  display_name: string;
  avatar_url: string | null;
  bio: string | null;
  /** Reçoit les notifications par e-mail (défaut : true). */
  email_notifications: boolean;
}

export interface Article {
  id: string;
  author_id: string;
  slug: string;
  title: string;
  lede: string | null;
  status: ArticleStatus;
  current_revision_id: string | null;
  published_at: string | null;
  created_at: string;
  /** Étiquettes libres pour la découverte (recherche + pages de tags). */
  tags: string[];
  /** Nombre de vues (incrémenté via la RPC increment_view). */
  view_count: number;
}

export interface Revision {
  id: string;
  article_id: string;
  number: number;
  blocks: Block[];
  note: string | null;
  created_by: string | null;
  created_at: string;
}

/** Portion précise du bloc visée (offsets dans original_text). Optionnel. */
export interface FocusRange {
  start: number;
  end: number;
}

export interface Suggestion {
  id: string;
  article_id: string;
  block_id: string;
  base_revision_id: string;
  original_text: string;
  proposed_text: string;
  reason: string | null;
  kind: SuggestionKind;
  status: SuggestionStatus;
  author_id: string;
  resolved_at: string | null;
  resolved_by: string | null;
  created_at: string;
  focus_range: FocusRange | null;
}

export type ReportTargetType = "suggestion" | "article";
export type ReportStatus = "open" | "reviewed" | "dismissed";

export interface Report {
  id: string;
  reporter_id: string;
  target_type: ReportTargetType;
  target_id: string;
  reason: string | null;
  status: ReportStatus;
  created_at: string;
}

/** Suggestion enrichie du calcul de périmé et, en option, de l'auteur joint. */
export interface ResolvedSuggestion extends Suggestion {
  resolved_status: ResolvedStatus;
  is_stale: boolean;
  author?: Profile;
}

export type NotificationKind =
  | "suggestion_received"
  | "suggestion_accepted"
  | "suggestion_rejected"
  | "comment";

export interface Notification {
  id: string;
  recipient_id: string;
  kind: NotificationKind;
  payload: Record<string, unknown>;
  read_at: string | null;
  created_at: string;
}
