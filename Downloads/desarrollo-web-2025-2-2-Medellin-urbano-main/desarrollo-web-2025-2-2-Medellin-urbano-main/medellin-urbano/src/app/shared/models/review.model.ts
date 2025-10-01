export interface Review {
  id: string;
  eventId: string;
  authorId: string;
  rating: number; // 1-5
  comment: string;
  createdAt: string; // ISO
}
