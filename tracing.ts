import { NodeSDK } from '@opentelemetry/sdk-node'
import { OTLPTraceExporter } from '@opentelemetry/exporter-trace-otlp-http'
import { OTLPLogExporter } from '@opentelemetry/exporter-logs-otlp-http'
import { BatchLogRecordProcessor } from '@opentelemetry/sdk-logs'
import { getNodeAutoInstrumentations } from '@opentelemetry/auto-instrumentations-node'
import { getAppSecrets } from './lib/secrets'

const honeycombApiKey = getAppSecrets().honeycomb.apiKey
const eqIndex = honeycombApiKey.indexOf('=')
const headerKey = honeycombApiKey.slice(0, eqIndex)
const headerValue = honeycombApiKey.slice(eqIndex + 1)
const headers = { [headerKey]: headerValue }

const sdk = new NodeSDK({
    traceExporter: new OTLPTraceExporter({
        headers,
    }),
    logRecordProcessors: [
        new BatchLogRecordProcessor(
            new OTLPLogExporter({
                headers,
            })
        ),
    ],
    instrumentations: [
        getNodeAutoInstrumentations({
            '@opentelemetry/instrumentation-fs': {
                enabled: false,
            }
        }),
    ],
})

sdk.start()
