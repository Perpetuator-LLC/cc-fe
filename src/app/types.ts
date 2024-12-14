export interface JWT {
  exp?: number;
  iat?: number;
}

export interface Token {
  access: string;
  refresh: string;
}

export interface AutocompleteResult {
  symbol: string;
  name: string;
  cik: string;
}

export interface User {
  id: string;
  username: string;
}
