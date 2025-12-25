export type ConfigValue = string | number | boolean | null | undefined;

export interface ConfigSchema<T> {
  // a function to validate and parse raw values into typed T
  parse: (raw: Record<string, ConfigValue>) => T;
}
