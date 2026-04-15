export interface PostFrontmatter {
  title: string;
  description: string;
  date: string;
  tags: string[];
  published: boolean;
  thumbnail?: string;
  ogImage?: string;
  series?: string;
  seriesOrder?: number;
  updated?: string;
}

export interface Post extends PostFrontmatter {
  slug: string;
  readingTime: string;
  content: string;
  updated: string;
}
