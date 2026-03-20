export const MapCanvas = () => {
  return (
    <div className="relative h-full w-full overflow-hidden bg-slate-100">
      <div className="absolute left-4 top-4 z-10">
        <select className="rounded border border-slate-300 bg-white px-3 py-2 text-sm text-slate-700 outline-none">
          <option>Mapa</option>
        </select>
      </div>

      <div className="absolute left-4 top-20 z-10 flex flex-col gap-3">
        <button
          type="button"
          className="flex h-10 w-10 items-center justify-center rounded border border-slate-300 bg-white text-slate-600 shadow-sm hover:bg-slate-50"
          title="Expandir"
        >
          ⛶
        </button>

        <button
          type="button"
          className="flex h-10 w-10 items-center justify-center rounded border border-slate-300 bg-white text-slate-600 shadow-sm hover:bg-slate-50"
          title="Street View"
        >
          🚶
        </button>
      </div>

      <iframe
        title="Mapa CentralGPS"
        className="h-full w-full border-0"
        src="https://www.google.com/maps?q=Mexico&z=5&output=embed"
        loading="lazy"
        referrerPolicy="no-referrer-when-downgrade"
      />
    </div>
  )
}