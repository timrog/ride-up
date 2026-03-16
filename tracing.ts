import { NodeSDK } from '@opentelemetry/sdk-node'
import { OTLPTraceExporter } from '@opentelemetry/exporter-trace-otlp-http'
import { getNodeAutoInstrumentations } from '@opentelemetry/auto-instrumentations-node'
import { getAppSecrets } from './lib/secrets'

const honeycombApiKey = getAppSecrets().honeycomb.apiKey
const eqIndex = honeycombApiKey.indexOf('=')
const headerKey = honeycombApiKey.slice(0, eqIndex)
const headerValue = honeycombApiKey.slice(eqIndex + 1)
const sdk = new NodeSDK({
    traceExporter: new OTLPTraceExporter({
        headers: {
            [headerKey]: headerValue
        },
    }),
    instrumentations: [
        getNodeAutoInstrumentations({
            '@opentelemetry/instrumentation-fs': {
                enabled: false,
            },
            '@opentelemetry/instrumentation-winston': {
                enabled: false,
            },
        }),
    ],
})

sdk.start()
