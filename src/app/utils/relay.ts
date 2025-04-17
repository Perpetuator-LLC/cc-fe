// Copyright (c) 2025 Perpetuator LLC

export interface PageInfo {
  hasNextPage: boolean;
  hasPreviousPage: boolean;
  startCursor: string | null;
  endCursor: string | null;
}

export interface RelayEdge<T> {
  cursor: string;
  node: T;
}

export interface RelayConnection<T> {
  edges: RelayEdge<T>[];
  pageInfo: PageInfo;
}
