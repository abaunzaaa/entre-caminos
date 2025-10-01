export interface Event {
  id: string;
  title: string;
  description: string;
  date: string; // ISO date
  location: string;
  imageUrl?: string;
  creatorId: string;
}
