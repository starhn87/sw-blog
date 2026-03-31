export interface Comment {
  id: number;
  slug: string;
  author: string;
  content: string;
  createdAt: string;
  parentId: number | null;
}
