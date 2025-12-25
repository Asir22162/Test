// generated types placeholder. Run `pnpm -w -r --filter packages/shared-api... run generate-types` to generate from OpenAPI
export type Product = { id: string; name?: string; price?: number };
export type ProductList = { items: Product[] };
export type OrderCreate = { productId: string; quantity?: number };
export type Order = { id: string; productId: string; quantity?: number; status?: string };
