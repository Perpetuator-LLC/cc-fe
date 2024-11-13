// src/app/utils/error-handler.ts
import { throwError } from 'rxjs';

export function handleApolloError(data: { message: string; cause: { error: { errors: { message: string }[] } } }) {
  console.error('GraphQL query error:', data);
  if (data.cause?.error?.errors) {
    const errors = data.cause.error.errors.map((e: { message: string }) => e.message).join(', ');
    return throwError(() => new Error(errors));
  } else if (data.message) {
    return throwError(() => new Error(`GraphQL Error: ${data.message}`));
  } else {
    return throwError(() => new Error('GraphQL Error: Unknown error'));
  }
}
