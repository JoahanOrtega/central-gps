// ── Componente base de animación skeleton ─────────────────────
// Pulso animado que simula contenido cargando.
// Principio UX: los skeletons reducen la percepción de espera
// porque el usuario ve que algo está pasando y puede anticipar
// la estructura de lo que va a aparecer.
const SkeletonPulse = ({ className = "" }: { className?: string }) => (
    <div className={`animate-pulse rounded bg-slate-200 ${className}`} />
);

// ── Skeleton de tarjeta de unidad ────────────────────────────
// Replica la estructura visual de UnitCard:
//   - Título grande (número de unidad)
//   - Subtítulo (marca/modelo)
//   - Badge de estado
//   - Grid de 3 columnas (foto operador + 2 columnas de datos)
export const UnitCardSkeleton = () => (
    <article className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
        <div className="flex items-start justify-between">
            <div className="space-y-2">
                <SkeletonPulse className="h-9 w-32" />
                <SkeletonPulse className="h-5 w-48" />
                <SkeletonPulse className="h-4 w-20" />
            </div>
            <SkeletonPulse className="h-9 w-9 rounded-lg" />
        </div>

        <div className="mt-6 grid grid-cols-[120px_1fr_1fr] gap-6">
            {/* Columna foto operador */}
            <SkeletonPulse className="h-[120px] rounded-lg" />

            {/* Columna datos izquierda */}
            <div className="space-y-3">
                <SkeletonPulse className="h-4 w-16" />
                <SkeletonPulse className="h-4 w-28" />
                <SkeletonPulse className="h-4 w-20" />
                <SkeletonPulse className="h-4 w-36" />
            </div>

            {/* Columna datos derecha */}
            <div className="space-y-3">
                <SkeletonPulse className="h-4 w-16" />
                <SkeletonPulse className="h-4 w-24" />
                <SkeletonPulse className="h-4 w-12" />
                <SkeletonPulse className="h-4 w-20" />
            </div>
        </div>
    </article>
);

// ── Skeleton de tarjeta de POI ────────────────────────────────
// Replica la estructura visual de PoiCard:
//   - Ícono + nombre del POI
//   - Dirección
//   - Badge de tipo
export const PoiCardSkeleton = () => (
    <article className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
        <div className="flex items-start justify-between">
            <div className="flex items-center gap-3">
                <SkeletonPulse className="h-10 w-10 rounded-full" />
                <div className="space-y-2">
                    <SkeletonPulse className="h-5 w-40" />
                    <SkeletonPulse className="h-4 w-56" />
                </div>
            </div>
            <SkeletonPulse className="h-9 w-9 rounded-lg" />
        </div>

        <div className="mt-4 flex items-center gap-2">
            <SkeletonPulse className="h-6 w-16 rounded-full" />
            <SkeletonPulse className="h-6 w-20 rounded-full" />
        </div>
    </article>
);

// ── Grid de skeletons ─────────────────────────────────────────
// Renderiza N skeletons en el mismo grid que las vistas reales.
// El número por defecto (6) representa una carga típica —
// suficiente para llenar la pantalla sin exceso.

interface SkeletonGridProps {
    count?: number;
    variant: "unit" | "poi";
}

export const SkeletonGrid = ({ count = 6, variant }: SkeletonGridProps) => (
    <div className="grid grid-cols-1 gap-4 md:gap-6 2xl:grid-cols-2">
        {Array.from({ length: count }).map((_, index) => (
            variant === "unit"
                ? <UnitCardSkeleton key={index} />
                : <PoiCardSkeleton key={index} />
        ))}
    </div>
);