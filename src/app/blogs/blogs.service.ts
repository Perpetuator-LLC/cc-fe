// Copyright (c) 2026 Perpetuator LLC
import { Injectable, inject } from '@angular/core';
import { Apollo, gql } from 'apollo-angular';
import { Observable, map } from 'rxjs';

export interface Blog {
  id: string;
  name: string;
  slug: string | null;
  description: string | null;
  tagline: string | null;
  image: string | null;
  thumbnail: string | null;
  prompt: string;
  status: 'DRAFT' | 'ACTIVE' | 'ARCHIVED';
  enabled: boolean;
  viewCount: number;
  latestArticleDate: string | null;
  createdAt: string;
  updatedAt: string;
  articleCount: number | null;
  publishedArticleCount: number | null;
}

export interface Article {
  id: string;
  blog: { id: string; name: string; slug: string | null };
  title: string;
  slug: string | null;
  subtitle: string | null;
  description: string | null;
  content: string;
  excerpt: string | null;
  featuredImage: string | null;
  featuredImageAlt: string | null;
  featuredImageCaption: string | null;
  status: 'DRAFT' | 'REVIEW' | 'PUBLISHED' | 'ARCHIVED';
  isFeatured: boolean;
  currentVersionNumber: number;
  createdAt: string;
  updatedAt: string;
  publishedAt: string | null;
  scheduledPublishAt: string | null;
  viewCount: number;
  readTimeMinutes: number | null;
  wordCount: number | null;
  isPublished: boolean | null;
}

const BLOGS_QUERY = gql`
  query Blogs($teamUuid: UUID) {
    blogs(teamUuid: $teamUuid) {
      id
      name
      slug
      description
      tagline
      image
      thumbnail
      status
      enabled
      viewCount
      latestArticleDate
      createdAt
      updatedAt
      articleCount
      publishedArticleCount
    }
  }
`;

const BLOG_QUERY = gql`
  query Blog($uuid: UUID!) {
    blog(uuid: $uuid) {
      id
      name
      slug
      description
      tagline
      image
      thumbnail
      prompt
      status
      enabled
      viewCount
      latestArticleDate
      createdAt
      updatedAt
      articleCount
      publishedArticleCount
      articles {
        id
        title
        slug
        status
        createdAt
        publishedAt
        viewCount
        readTimeMinutes
      }
    }
  }
`;

const ARTICLES_QUERY = gql`
  query Articles($blogUuid: UUID, $status: String, $limit: Int) {
    articles(blogUuid: $blogUuid, status: $status, limit: $limit) {
      id
      blog {
        id
        name
        slug
      }
      title
      slug
      subtitle
      description
      excerpt
      featuredImage
      status
      isFeatured
      createdAt
      updatedAt
      publishedAt
      viewCount
      readTimeMinutes
      wordCount
      isPublished
    }
  }
`;

const ARTICLE_QUERY = gql`
  query Article($uuid: UUID!) {
    article(uuid: $uuid) {
      id
      blog {
        id
        name
        slug
      }
      title
      slug
      subtitle
      description
      content
      excerpt
      featuredImage
      featuredImageAlt
      featuredImageCaption
      status
      isFeatured
      currentVersionNumber
      createdAt
      updatedAt
      publishedAt
      scheduledPublishAt
      viewCount
      readTimeMinutes
      wordCount
      isPublished
    }
  }
`;

const CREATE_BLOG_MUTATION = gql`
  mutation CreateBlog(
    $name: String!
    $teamUuid: UUID!
    $description: String
    $slug: String
    $tagline: String
  ) {
    createBlog(
      name: $name
      teamUuid: $teamUuid
      description: $description
      slug: $slug
      tagline: $tagline
    ) {
      success
      message
      blog {
        id
        name
        slug
      }
    }
  }
`;

const UPDATE_BLOG_MUTATION = gql`
  mutation UpdateBlog(
    $blogUuid: UUID!
    $name: String
    $description: String
    $slug: String
    $tagline: String
    $prompt: String
    $status: String
    $enabled: Boolean
  ) {
    updateBlog(
      blogUuid: $blogUuid
      name: $name
      description: $description
      slug: $slug
      tagline: $tagline
      prompt: $prompt
      status: $status
      enabled: $enabled
    ) {
      success
      message
      blog {
        id
        name
        slug
        status
        enabled
      }
    }
  }
`;

const CREATE_ARTICLE_MUTATION = gql`
  mutation CreateArticle(
    $blogUuid: UUID!
    $title: String!
    $content: String!
    $description: String
    $slug: String
    $subtitle: String
  ) {
    createArticle(
      blogUuid: $blogUuid
      title: $title
      content: $content
      description: $description
      slug: $slug
      subtitle: $subtitle
    ) {
      success
      message
      article {
        id
        title
        slug
        status
      }
    }
  }
`;

const UPDATE_ARTICLE_MUTATION = gql`
  mutation UpdateArticle(
    $articleUuid: UUID!
    $title: String
    $content: String
    $description: String
    $slug: String
    $subtitle: String
    $excerpt: String
    $status: String
    $isFeatured: Boolean
  ) {
    updateArticle(
      articleUuid: $articleUuid
      title: $title
      content: $content
      description: $description
      slug: $slug
      subtitle: $subtitle
      excerpt: $excerpt
      status: $status
      isFeatured: $isFeatured
    ) {
      success
      message
      article {
        id
        title
        slug
        status
      }
    }
  }
`;

const PUBLISH_ARTICLE_MUTATION = gql`
  mutation PublishArticle($articleUuid: UUID!) {
    publishArticle(articleUuid: $articleUuid) {
      success
      message
      article {
        id
        status
        publishedAt
      }
    }
  }
`;

const UNPUBLISH_ARTICLE_MUTATION = gql`
  mutation UnpublishArticle($articleUuid: UUID!) {
    unpublishArticle(articleUuid: $articleUuid) {
      success
      message
      article {
        id
        status
      }
    }
  }
`;

const DELETE_ARTICLE_MUTATION = gql`
  mutation DeleteArticle($articleUuid: UUID!) {
    deleteArticle(articleUuid: $articleUuid) {
      success
      message
    }
  }
`;

@Injectable({
  providedIn: 'root',
})
export class BlogsService {
  private readonly apollo = inject(Apollo);

  getBlogs(teamUuid?: string): Observable<Blog[]> {
    return this.apollo
      .query<{ blogs: Blog[] }>({
        query: BLOGS_QUERY,
        variables: { teamUuid },
        fetchPolicy: 'network-only',
      })
      .pipe(map((result) => result.data?.blogs ?? []));
  }

  getBlog(uuid: string): Observable<Blog & { articles: Article[] }> {
    return this.apollo
      .query<{ blog: Blog & { articles: Article[] } }>({
        query: BLOG_QUERY,
        variables: { uuid },
        fetchPolicy: 'network-only',
      })
      .pipe(
        map((result) => {
          if (!result.data?.blog) {
            throw new Error('Blog not found');
          }
          return result.data.blog;
        }),
      );
  }

  getArticles(blogUuid?: string, status?: string, limit?: number): Observable<Article[]> {
    return this.apollo
      .query<{ articles: Article[] }>({
        query: ARTICLES_QUERY,
        variables: { blogUuid, status, limit },
        fetchPolicy: 'network-only',
      })
      .pipe(map((result) => result.data?.articles ?? []));
  }

  getArticle(uuid: string): Observable<Article> {
    return this.apollo
      .query<{ article: Article }>({
        query: ARTICLE_QUERY,
        variables: { uuid },
        fetchPolicy: 'network-only',
      })
      .pipe(
        map((result) => {
          if (!result.data?.article) {
            throw new Error('Article not found');
          }
          return result.data.article;
        }),
      );
  }

  createBlog(
    name: string,
    teamUuid: string,
    options?: { description?: string; slug?: string; tagline?: string },
  ): Observable<{ success: boolean; blog?: Blog; errors?: string[] }> {
    return this.apollo
      .mutate<{ createBlog: { success: boolean; blog?: Blog; errors?: string[] } }>({
        mutation: CREATE_BLOG_MUTATION,
        variables: { name, teamUuid, ...options },
      })
      .pipe(
        map((result) => {
          if (!result.data?.createBlog) {
            throw new Error('Failed to create blog');
          }
          return result.data.createBlog;
        }),
      );
  }

  updateBlog(
    blogUuid: string,
    updates: {
      name?: string;
      description?: string;
      slug?: string;
      tagline?: string;
      prompt?: string;
      status?: string;
      enabled?: boolean;
    },
  ): Observable<{ success: boolean; blog?: Blog; errors?: string[] }> {
    return this.apollo
      .mutate<{ updateBlog: { success: boolean; blog?: Blog; errors?: string[] } }>({
        mutation: UPDATE_BLOG_MUTATION,
        variables: { blogUuid, ...updates },
      })
      .pipe(
        map((result) => {
          if (!result.data?.updateBlog) {
            throw new Error('Failed to update blog');
          }
          return result.data.updateBlog;
        }),
      );
  }

  createArticle(
    blogUuid: string,
    title: string,
    content: string,
    options?: { description?: string; slug?: string; subtitle?: string },
  ): Observable<{ success: boolean; article?: Article; errors?: string[] }> {
    return this.apollo
      .mutate<{ createArticle: { success: boolean; article?: Article; errors?: string[] } }>({
        mutation: CREATE_ARTICLE_MUTATION,
        variables: { blogUuid, title, content, ...options },
      })
      .pipe(
        map((result) => {
          if (!result.data?.createArticle) {
            throw new Error('Failed to create article');
          }
          return result.data.createArticle;
        }),
      );
  }

  updateArticle(
    articleUuid: string,
    updates: {
      title?: string;
      content?: string;
      description?: string;
      slug?: string;
      subtitle?: string;
      excerpt?: string;
      status?: string;
      isFeatured?: boolean;
    },
  ): Observable<{ success: boolean; article?: Article; errors?: string[] }> {
    return this.apollo
      .mutate<{ updateArticle: { success: boolean; article?: Article; errors?: string[] } }>({
        mutation: UPDATE_ARTICLE_MUTATION,
        variables: { articleUuid, ...updates },
      })
      .pipe(
        map((result) => {
          if (!result.data?.updateArticle) {
            throw new Error('Failed to update article');
          }
          return result.data.updateArticle;
        }),
      );
  }

  publishArticle(
    articleUuid: string,
  ): Observable<{ success: boolean; article?: Article; errors?: string[] }> {
    return this.apollo
      .mutate<{ publishArticle: { success: boolean; article?: Article; errors?: string[] } }>({
        mutation: PUBLISH_ARTICLE_MUTATION,
        variables: { articleUuid },
      })
      .pipe(
        map((result) => {
          if (!result.data?.publishArticle) {
            throw new Error('Failed to publish article');
          }
          return result.data.publishArticle;
        }),
      );
  }

  unpublishArticle(
    articleUuid: string,
  ): Observable<{ success: boolean; article?: Article; errors?: string[] }> {
    return this.apollo
      .mutate<{ unpublishArticle: { success: boolean; article?: Article; errors?: string[] } }>({
        mutation: UNPUBLISH_ARTICLE_MUTATION,
        variables: { articleUuid },
      })
      .pipe(
        map((result) => {
          if (!result.data?.unpublishArticle) {
            throw new Error('Failed to unpublish article');
          }
          return result.data.unpublishArticle;
        }),
      );
  }

  deleteArticle(articleUuid: string): Observable<{ success: boolean; errors?: string[] }> {
    return this.apollo
      .mutate<{ deleteArticle: { success: boolean; errors?: string[] } }>({
        mutation: DELETE_ARTICLE_MUTATION,
        variables: { articleUuid },
      })
      .pipe(
        map((result) => {
          if (!result.data?.deleteArticle) {
            throw new Error('Failed to delete article');
          }
          return result.data.deleteArticle;
        }),
      );
  }
}

