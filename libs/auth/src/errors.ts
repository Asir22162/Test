export class AuthError extends Error {
  constructor(message?: string) {
    super(message || 'Authentication error');
    this.name = 'AuthError';
  }
}

export class TokenExpiredError extends AuthError {
  constructor(message?: string) {
    super(message || 'Token expired');
    this.name = 'TokenExpiredError';
  }
}
