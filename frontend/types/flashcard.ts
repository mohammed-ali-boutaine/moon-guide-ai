export interface FlashcardResponse {
  id: number;
  document_id: number;
  front: string;
  back: string;
  created_at: string;
}

export interface FlashcardWithProgress extends FlashcardResponse {
  ease_factor: number;
  interval_days: number;
  repetitions: number;
  next_review_at: string | null;
}

export interface FlashcardListResponse {
  total: number;
  items: FlashcardResponse[];
}

export interface FlashcardGenerateResponse {
  created: number;
  flashcards: FlashcardResponse[];
}

export interface FlashcardReviewResponse {
  flashcard_id: number;
  next_review_at: string;
  interval_days: number;
  ease_factor: number;
}

// 0=Again 1=Hard 2=Good 3=Easy
export type FlashcardRating = 0 | 1 | 2 | 3;
