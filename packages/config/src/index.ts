export type AppConfig = {
  env: string;
  port: number;
  featureFlags?: Record<string, boolean>;
};

export function loadConfig(): AppConfig {
  return {
    env: process.env.NODE_ENV || 'development',
    port: Number(process.env.PORT || 3000),
    featureFlags: {}
  };
}
