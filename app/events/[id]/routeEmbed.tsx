'use client'

import { useEffect } from "react"

export default function ({ link }) {
    useEffect(() => {
        const script = document.createElement('script')
        script.src = 'https://strava-embeds.com/embed.js'
        script.async = true
        document.body.appendChild(script)

        return () => {
            document.body.removeChild(script)
        }

    }, [])

    const stravaMatch = link
        && link.match(/strava\.com\/routes\/(\d+)/),
        stravaRouteId = stravaMatch?.length && stravaMatch[1]
    const rwgpsMatch = link
        && link.match(/ridewithgps\.com\/routes\/(\d+)/),
        rwgpsRouteId = rwgpsMatch?.length && rwgpsMatch[1]
    return <div>
        {stravaMatch &&
            <div className="strava-embed-placeholder" data-embed-type="route" data-embed-id={stravaRouteId} data-style="standard" data-map-hash="9.3/51.1871/-0.8959" data-from-embed="true">
            </div>}
        {rwgpsMatch &&
            <iframe src={`https://ridewithgps.com/embeds?type=route&id=${rwgpsRouteId}&metricUnits=true&sampleGraph=true`}
                style={{ width: "1px", minWidth: "100%", height: "700px", border: "none" }}
                scrolling="no"></iframe>}
    </div>
}