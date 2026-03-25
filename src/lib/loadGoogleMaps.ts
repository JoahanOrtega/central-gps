let googleMapsPromise: Promise<void> | null = null

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
      existingScript.addEventListener("load", () => resolve())
      existingScript.addEventListener("error", () =>
        reject(new Error("No fue posible cargar Google Maps")),
      )
      return
    }

    const script = document.createElement("script")
    script.src = `https://maps.googleapis.com/maps/api/js?key=${apiKey}&libraries=drawing,geometry`
    script.async = true
    script.defer = true
    script.setAttribute("data-google-maps", "true")

    script.onload = () => resolve()
    script.onerror = () =>
      reject(new Error("No fue posible cargar Google Maps"))

    document.head.appendChild(script)
  })

  return googleMapsPromise
}