export type Role = 'admin' | 'merchant' | 'consumer' | string;

export interface AuthPayload {
  sub: string; // subject: user id
  roles: Role[];
  tenantId?: string; // 多租户支持
  iat?: number;
  exp?: number;
  jti?: string;
  [key: string]: any;
}
