let googleMapsPromise: Promise<void> | null = null

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
      reject(new Error("No se encontró VITE_GOOGLE_MAPS_API_KEY"))
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