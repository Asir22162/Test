export class PrometheusRegistry {
  private counters = new Map<string, number>()
  private gauges = new Map<string, number>()

  inc(name: string, v = 1) {
    this.counters.set(name, (this.counters.get(name) || 0) + v)
  }

  setGauge(name: string, v: number) {
    this.gauges.set(name, v)
  }

  getMetrics() {
    // Simple exposition format: counters and gauges
    const lines: string[] = []
    for (const [k, v] of this.counters) {
      lines.push(`# TYPE ${k} counter`)
      lines.push(`${k} ${v}`)
    }
    for (const [k, v] of this.gauges) {
      lines.push(`# TYPE ${k} gauge`)
      lines.push(`${k} ${v}`)
    }
    return lines.join('\n') + '\n'
  }
}
