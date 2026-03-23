export interface PostFrontmatter {
  title: string;
  description: string;
  date: string;
  tags: string[];
  published: boolean;
  thumbnail?: string;
}

export interface Post extends PostFrontmatter {
  slug: string;
  readingTime: string;
  content: string;
}
