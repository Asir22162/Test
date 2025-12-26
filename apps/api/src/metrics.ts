import { PrometheusRegistry, registerRegistry } from '@weapp/logging'

const registry = new PrometheusRegistry()
registerRegistry('apps-api-auth', registry)

export const authMetrics = {
  inc: (name: string, v = 1) => registry.inc(name, v),
  setGauge: (name: string, value: number) => registry.setGauge(name, value),
}

export default registry
