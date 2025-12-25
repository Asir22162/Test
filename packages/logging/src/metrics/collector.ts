import type { PrometheusRegistry } from '../prometheus'

const registries: Array<{ name: string, reg: PrometheusRegistry }> = []

export function registerRegistry(name: string, reg: PrometheusRegistry) {
  registries.push({ name, reg })
}

export function getRegistries() {
  return registries.slice()
}

export function getSnapshot() {
  return registries.map(r => `# Registry: ${r.name}\n` + r.reg.getMetrics()).join('\n')
}
