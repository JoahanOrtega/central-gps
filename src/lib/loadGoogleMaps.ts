let googleMapsPromise: Promise<void> | null = null

// Map ID de Google Maps, requerido por AdvancedMarkerElement. Se lee del .env
// para no hardcodearlo en cada componente. "DEMO_MAP_ID" es el placeholder de
// Google para desarrollo; en producción configurar VITE_GOOGLE_MAPS_MAP_ID con
// un Map ID real creado en Cloud Console (Google Maps > Map Management).
export const GOOGLE_MAPS_MAP_ID =
  import.meta.env.VITE_GOOGLE_MAPS_MAP_ID ?? "DEMO_MAP_ID"

declare global {
  interface Window {
    googleMapsInit?: () => void
  }
}

export const loadGoogleMaps = (): Promise<void> => {
  if (window.google?.maps) {
    return Promise.resolve()
  }

  if (googleMapsPromise) {
    return googleMapsPromise
  }

  googleMapsPromise = new Promise((resolve, reject) => {
    const apiKey = import.meta.env.VITE_GOOGLE_MAPS_API_KEY

    if (!apiKey) {
      console.warn(
        "VITE_GOOGLE_MAPS_API_KEY no está configurada. El mapa no se cargará. " +
        "Obtén una en console.cloud.google.com y agrégala al .env raíz del proyecto."
      )
      reject(new Error("Google Maps no disponible (sin API key)"))
      return
    }

    const existingScript = document.querySelector(
      'script[data-google-maps="true"]',
    ) as HTMLScriptElement | null

    if (existingScript) {
      existingScript.addEventListener("load", () => resolve(), { once: true })
      existingScript.addEventListener(
        "error",
        () => reject(new Error("No fue posible cargar Google Maps")),
        { once: true },
      )
      return
    }

    window.googleMapsInit = () => {
      resolve()
      delete window.googleMapsInit
    }

    const script = document.createElement("script")
    script.src =
      `https://maps.googleapis.com/maps/api/js?key=${apiKey}` +
      `&libraries=drawing,geometry,marker` +
      `&loading=async` +
      `&callback=googleMapsInit`
    script.async = true
    script.defer = true
    script.setAttribute("data-google-maps", "true")

    script.onerror = () => {
      reject(new Error("No fue posible cargar Google Maps"))
      delete window.googleMapsInit
    }

    document.head.appendChild(script)
  })

  return googleMapsPromise
}