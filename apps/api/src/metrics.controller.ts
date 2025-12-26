import { Controller, Get, Header } from '@nestjs/common'
import { getSnapshot } from '@weapp/logging'

@Controller()
export class MetricsController {
  @Get('metrics')
  @Header('content-type', 'text/plain')
  metrics() {
    return getSnapshot()
  }
}
