'use client'

import * as React from 'react'

import type { MapCoordinatesInput } from '@/lib/map-location'
import { cn } from '@/lib/utils'

type RouteMapFrameProps = {
  title: string
  origin?: MapCoordinatesInput | null
  destination?: MapCoordinatesInput | null
  focus?: MapCoordinatesInput | null
  className?: string
}

type MapConfigResponse = {
  accessToken?: string | null
  styleOwner?: string | null
  styleId?: string | null
}

type RouteResponse = {
  coordinates?: [number, number][] | null
}

type MapboxGlobal = {
  accessToken: string
  Map: new (options: Record<string, unknown>) => MapboxMap
  Marker: new (options?: Record<string, unknown>) => MapboxMarker
  NavigationControl: new (options?: Record<string, unknown>) => unknown
}

type MapboxMap = {
  addControl(control: unknown, position?: string): void
  addLayer(layer: Record<string, unknown>): void
  addSource(id: string, source: Record<string, unknown>): void
  easeTo(options: Record<string, unknown>): void
  fitBounds(bounds: [[number, number], [number, number]], options?: Record<string, unknown>): void
  getLayer(id: string): unknown
  getSource(id: string): { setData(data: RouteGeoJson): void } | undefined
  isStyleLoaded(): boolean
  on(event: string, listener: () => void): void
  remove(): void
  removeLayer(id: string): void
  removeSource(id: string): void
  resize(): void
}

type MapboxMarker = {
  addTo(map: MapboxMap): MapboxMarker
  remove(): void
  setLngLat(lngLat: [number, number]): MapboxMarker
}

type NormalizedPoint = {
  latitude: number
  longitude: number
}

type MapConfig = {
  accessToken: string
  styleOwner: string
  styleId: string
}

type RouteGeoJson = {
  type: 'FeatureCollection'
  features: Array<{
    type: 'Feature'
    properties: Record<string, unknown>
    geometry: {
      type: 'LineString'
      coordinates: [number, number][]
    }
  }>
}

const DEFAULT_CENTER: NormalizedPoint = {
  latitude: 14.575,
  longitude: 121.085,
}

const DEFAULT_ZOOM = 10.5
const MAPBOX_SCRIPT_ID = 'itrack-mapbox-gl-script'
const MAPBOX_STYLESHEET_ID = 'itrack-mapbox-gl-stylesheet'
const ROUTE_SOURCE_ID = 'itrack-route-source'
const ROUTE_CASING_LAYER_ID = 'itrack-route-casing-layer'
const ROUTE_LAYER_ID = 'itrack-route-layer'

let mapboxScriptPromise: Promise<MapboxGlobal> | null = null

declare global {
  interface Window {
    mapboxgl?: MapboxGlobal
  }
}

function normalizePoint(point: MapCoordinatesInput | null | undefined): NormalizedPoint | null {
  if (!point) {
    return null
  }

  return 'lat' in point
    ? {
        latitude: point.lat,
        longitude: point.lng,
      }
    : {
        latitude: point.latitude,
        longitude: point.longitude,
      }
}

function ensureMapboxStylesheet() {
  if (document.getElementById(MAPBOX_STYLESHEET_ID)) {
    return
  }

  const link = document.createElement('link')
  link.id = MAPBOX_STYLESHEET_ID
  link.rel = 'stylesheet'
  link.href = 'https://api.mapbox.com/mapbox-gl-js/v3.5.1/mapbox-gl.css'
  document.head.appendChild(link)
}

function loadMapboxScript() {
  if (typeof window !== 'undefined' && window.mapboxgl) {
    return Promise.resolve(window.mapboxgl)
  }

  if (mapboxScriptPromise) {
    return mapboxScriptPromise
  }

  mapboxScriptPromise = new Promise<MapboxGlobal>((resolve, reject) => {
    const existingScript = document.getElementById(MAPBOX_SCRIPT_ID) as HTMLScriptElement | null

    const handleReady = () => {
      if (window.mapboxgl) {
        resolve(window.mapboxgl)
        return
      }

      reject(new Error('Mapbox GL JS did not initialize.'))
    }

    if (existingScript) {
      existingScript.addEventListener('load', handleReady, { once: true })
      existingScript.addEventListener(
        'error',
        () => reject(new Error('Unable to load Mapbox GL JS.')),
        { once: true }
      )
      return
    }

    const script = document.createElement('script')
    script.id = MAPBOX_SCRIPT_ID
    script.async = true
    script.src = 'https://api.mapbox.com/mapbox-gl-js/v3.5.1/mapbox-gl.js'
    script.addEventListener('load', handleReady, { once: true })
    script.addEventListener(
      'error',
      () => reject(new Error('Unable to load Mapbox GL JS.')),
      { once: true }
    )
    document.body.appendChild(script)
  })

  return mapboxScriptPromise
}

function toLngLat(point: NormalizedPoint): [number, number] {
  return [point.longitude, point.latitude]
}

function buildBounds(points: NormalizedPoint[]) {
  const longitudes = points.map((point) => point.longitude)
  const latitudes = points.map((point) => point.latitude)

  return [
    [Math.min(...longitudes), Math.min(...latitudes)],
    [Math.max(...longitudes), Math.max(...latitudes)],
  ] as [[number, number], [number, number]]
}

function buildCoordinateBounds(coordinates: [number, number][]) {
  const longitudes = coordinates.map(([longitude]) => longitude)
  const latitudes = coordinates.map(([, latitude]) => latitude)

  return [
    [Math.min(...longitudes), Math.min(...latitudes)],
    [Math.max(...longitudes), Math.max(...latitudes)],
  ] as [[number, number], [number, number]]
}

function arePointsEqual(
  left: NormalizedPoint | null | undefined,
  right: NormalizedPoint | null | undefined
) {
  if (!left || !right) {
    return false
  }

  return (
    left.latitude.toFixed(6) === right.latitude.toFixed(6) &&
    left.longitude.toFixed(6) === right.longitude.toFixed(6)
  )
}

function dedupePoints(points: Array<NormalizedPoint | null | undefined>) {
  const seen = new Set<string>()

  return points.filter((point): point is NormalizedPoint => {
    if (!point) {
      return false
    }

    const key = `${point.latitude.toFixed(6)},${point.longitude.toFixed(6)}`

    if (seen.has(key)) {
      return false
    }

    seen.add(key)
    return true
  })
}

function buildRouteRequestPoints(params: {
  origin: NormalizedPoint | null
  destination: NormalizedPoint | null
  focus: NormalizedPoint | null
}) {
  if (!params.origin || !params.destination) {
    return [] as NormalizedPoint[]
  }

  const orderedPoints = [params.origin]

  if (
    params.focus &&
    !arePointsEqual(params.focus, params.origin) &&
    !arePointsEqual(params.focus, params.destination)
  ) {
    orderedPoints.push(params.focus)
  }

  orderedPoints.push(params.destination)
  return orderedPoints
}

function buildRouteGeoJson(coordinates: [number, number][]): RouteGeoJson {
  return {
    type: 'FeatureCollection',
    features: [
      {
        type: 'Feature',
        properties: {},
        geometry: {
          type: 'LineString',
          coordinates,
        },
      },
    ],
  }
}

function serializePoint(point: NormalizedPoint) {
  return `${point.latitude.toFixed(6)},${point.longitude.toFixed(6)}`
}

async function fetchMapConfig() {
  const response = await fetch('/api/maps/config', {
    cache: 'no-store',
  })

  if (!response.ok) {
    return null
  }

  const payload = (await response.json()) as MapConfigResponse

  if (!payload.accessToken) {
    return null
  }

  return {
    accessToken: payload.accessToken,
    styleOwner: payload.styleOwner?.trim() || 'mapbox',
    styleId: payload.styleId?.trim() || 'streets-v12',
  } satisfies MapConfig
}

export function RouteMapFrame({
  title,
  origin,
  destination,
  focus,
  className,
}: RouteMapFrameProps) {
  const containerRef = React.useRef<HTMLDivElement | null>(null)
  const mapRef = React.useRef<MapboxMap | null>(null)
  const markersRef = React.useRef<MapboxMarker[]>([])
  const mapboxRef = React.useRef<MapboxGlobal | null>(null)
  const hasMapLoadedRef = React.useRef(false)
  const hadPointsRef = React.useRef(false)
  const [config, setConfig] = React.useState<MapConfig | null>(null)
  const [isInitializing, setIsInitializing] = React.useState(true)
  const [mapError, setMapError] = React.useState<string | null>(null)
  const [mapReady, setMapReady] = React.useState(false)
  const [routeCoordinates, setRouteCoordinates] = React.useState<[number, number][] | null>(null)

  const normalizedOrigin = React.useMemo(() => normalizePoint(origin), [origin])
  const normalizedDestination = React.useMemo(() => normalizePoint(destination), [destination])
  const normalizedFocus = React.useMemo(() => normalizePoint(focus), [focus])
  const routeRequestPoints = React.useMemo(
    () =>
      buildRouteRequestPoints({
        origin: normalizedOrigin,
        destination: normalizedDestination,
        focus: normalizedFocus,
      }),
    [normalizedDestination, normalizedFocus, normalizedOrigin]
  )

  React.useEffect(() => {
    let isCancelled = false

    setIsInitializing(true)
    void fetchMapConfig()
      .then((nextConfig) => {
        if (isCancelled) {
          return
        }

        setConfig(nextConfig)
        setMapError(nextConfig ? null : 'Add MAPBOX_ACCESS_TOKEN to load the interactive map.')
        setIsInitializing(false)
      })
      .catch(() => {
        if (isCancelled) {
          return
        }

        setConfig(null)
        setMapError('Unable to load the Mapbox map configuration right now.')
        setIsInitializing(false)
      })

    return () => {
      isCancelled = true
    }
  }, [])

  React.useEffect(() => {
    if (routeRequestPoints.length < 2) {
      setRouteCoordinates(null)
      return
    }

    let isCancelled = false

    const url = new URL('/api/maps/route', window.location.origin)
    url.searchParams.set('points', routeRequestPoints.map((point) => serializePoint(point)).join(';'))

    void fetch(url, {
      cache: 'no-store',
    })
      .then(async (response) => {
        if (!response.ok) {
          return null
        }

        const payload = (await response.json()) as RouteResponse
        const coordinates = payload.coordinates
        return Array.isArray(coordinates) && coordinates.length >= 2 ? coordinates : null
      })
      .then((coordinates) => {
        if (isCancelled) {
          return
        }

        setRouteCoordinates(coordinates)
      })
      .catch(() => {
        if (isCancelled) {
          return
        }

        setRouteCoordinates(null)
      })

    return () => {
      isCancelled = true
    }
  }, [routeRequestPoints])

  React.useEffect(() => {
    if (!containerRef.current || !config || mapRef.current) {
      return
    }

    let isCancelled = false
    ensureMapboxStylesheet()

    void loadMapboxScript()
      .then((mapboxgl) => {
        if (isCancelled || !containerRef.current) {
          return
        }

        mapboxRef.current = mapboxgl
        mapboxgl.accessToken = config.accessToken

        const map = new mapboxgl.Map({
          container: containerRef.current,
          style: `mapbox://styles/${config.styleOwner}/${config.styleId}`,
          center: [DEFAULT_CENTER.longitude, DEFAULT_CENTER.latitude],
          zoom: DEFAULT_ZOOM,
          attributionControl: false,
          dragRotate: false,
          pitchWithRotate: false,
        })

        map.addControl(new mapboxgl.NavigationControl({ visualizePitch: false }), 'top-right')
        map.on('load', () => {
          hasMapLoadedRef.current = true
          map.resize()
          setMapReady(true)
        })

        mapRef.current = map
      })
      .catch((error) => {
        if (isCancelled) {
          return
        }

        setMapError(error instanceof Error ? error.message : 'Unable to load the interactive map.')
      })

    return () => {
      isCancelled = true
      markersRef.current.forEach((marker) => marker.remove())
      markersRef.current = []
      mapRef.current?.remove()
      mapRef.current = null
      hasMapLoadedRef.current = false
      setMapReady(false)
    }
  }, [config])

  React.useEffect(() => {
    const handleResize = () => {
      mapRef.current?.resize()
    }

    window.addEventListener('resize', handleResize)

    return () => {
      window.removeEventListener('resize', handleResize)
    }
  }, [])

  React.useEffect(() => {
    const map = mapRef.current
    const mapboxgl = mapboxRef.current

    if (!map || !mapboxgl || !mapReady || !hasMapLoadedRef.current || !map.isStyleLoaded()) {
      return
    }

    markersRef.current.forEach((marker) => marker.remove())
    markersRef.current = []

    const nextMarkers = [
      normalizedOrigin
        ? new mapboxgl.Marker({ color: '#f97316' }).setLngLat(toLngLat(normalizedOrigin)).addTo(map)
        : null,
      normalizedDestination
        ? new mapboxgl.Marker({ color: '#16a34a' })
            .setLngLat(toLngLat(normalizedDestination))
            .addTo(map)
        : null,
      normalizedFocus &&
      !arePointsEqual(normalizedFocus, normalizedOrigin) &&
      !arePointsEqual(normalizedFocus, normalizedDestination)
        ? new mapboxgl.Marker({ color: '#dc2626' }).setLngLat(toLngLat(normalizedFocus)).addTo(map)
        : null,
    ].filter((marker): marker is MapboxMarker => marker !== null)

    markersRef.current = nextMarkers

    const lineCoordinates =
      routeCoordinates && routeCoordinates.length >= 2 ? routeCoordinates : null

    if (lineCoordinates) {
      const source = map.getSource(ROUTE_SOURCE_ID)
      const geoJson = buildRouteGeoJson(lineCoordinates)

      if (source) {
        source.setData(geoJson)
      } else {
        map.addSource(ROUTE_SOURCE_ID, {
          type: 'geojson',
          data: geoJson,
        })
        map.addLayer({
          id: ROUTE_CASING_LAYER_ID,
          type: 'line',
          source: ROUTE_SOURCE_ID,
          layout: {
            'line-cap': 'round',
            'line-join': 'round',
          },
          paint: {
            'line-color': '#ffffff',
            'line-width': 8,
            'line-opacity': 0.9,
          },
        })
        map.addLayer({
          id: ROUTE_LAYER_ID,
          type: 'line',
          source: ROUTE_SOURCE_ID,
          layout: {
            'line-cap': 'round',
            'line-join': 'round',
          },
          paint: {
            'line-color': '#2563eb',
            'line-width': 4,
            'line-opacity': 0.88,
          },
        })
      }
    } else {
      if (map.getLayer(ROUTE_CASING_LAYER_ID)) {
        map.removeLayer(ROUTE_CASING_LAYER_ID)
      }

      if (map.getLayer(ROUTE_LAYER_ID)) {
        map.removeLayer(ROUTE_LAYER_ID)
      }

      if (map.getSource(ROUTE_SOURCE_ID)) {
        map.removeSource(ROUTE_SOURCE_ID)
      }
    }

    const points = dedupePoints([normalizedOrigin, normalizedDestination, normalizedFocus])

    if (points.length === 0) {
      if (hadPointsRef.current) {
        map.easeTo({
          center: [DEFAULT_CENTER.longitude, DEFAULT_CENTER.latitude],
          zoom: DEFAULT_ZOOM,
          duration: 700,
        })
      }

      hadPointsRef.current = false
      return
    }

    hadPointsRef.current = true

    if (points.length === 1) {
      const [point] = points
      map.easeTo({
        center: [point.longitude, point.latitude],
        zoom: 13.5,
        duration: 700,
      })
      return
    }

    map.fitBounds(
      lineCoordinates && lineCoordinates.length >= 2
        ? buildCoordinateBounds(lineCoordinates)
        : buildBounds(points),
      {
      padding: 56,
      duration: 800,
      maxZoom: 14.5,
      }
    )
  }, [mapReady, normalizedDestination, normalizedFocus, normalizedOrigin, routeCoordinates, routeRequestPoints])

  return (
    <div className={cn('relative h-full w-full overflow-hidden', className)}>
      <div ref={containerRef} className="h-full w-full" aria-label={title} />
      {!mapError && (isInitializing || !mapReady) ? (
        <div className="absolute inset-0 flex items-center justify-center bg-background/70 text-sm text-muted-foreground">
          Loading interactive map...
        </div>
      ) : null}
      {mapError ? (
        <div className="absolute inset-0 flex items-center justify-center bg-background/80 p-4 text-center text-sm text-muted-foreground">
          {mapError}
        </div>
      ) : null}
    </div>
  )
}
