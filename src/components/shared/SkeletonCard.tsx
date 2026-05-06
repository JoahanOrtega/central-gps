// Skeletons para los distintos tipos de contenido del sistema.

// ── Componente base ───────────────────────────────────────────────────────────
const SkeletonPulse = ({ className = "" }: { className?: string }) => (
    <div className={`animate-pulse rounded bg-slate-200 ${className}`} />
);

// ── Skeletons de catálogos ────────────────────────────────────────────────────

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
            <SkeletonPulse className="h-[120px] rounded-lg" />
            <div className="space-y-3">
                <SkeletonPulse className="h-4 w-16" />
                <SkeletonPulse className="h-4 w-28" />
                <SkeletonPulse className="h-4 w-20" />
                <SkeletonPulse className="h-4 w-36" />
            </div>
            <div className="space-y-3">
                <SkeletonPulse className="h-4 w-16" />
                <SkeletonPulse className="h-4 w-24" />
                <SkeletonPulse className="h-4 w-12" />
                <SkeletonPulse className="h-4 w-20" />
            </div>
        </div>
    </article>
);

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

export const UserCardSkeleton = () => (
    <article className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
        <div className="flex items-start justify-between gap-3">
            <div className="flex flex-1 items-start gap-3">
                <SkeletonPulse className="h-12 w-12 rounded-full" />
                <div className="flex-1 space-y-2">
                    <SkeletonPulse className="h-5 w-40" />
                    <SkeletonPulse className="h-4 w-32" />
                    <SkeletonPulse className="h-5 w-24 rounded-full" />
                </div>
            </div>
            <SkeletonPulse className="h-9 w-9 rounded-lg" />
        </div>
        <div className="mt-4 space-y-2 border-t border-slate-100 pt-3">
            <SkeletonPulse className="h-3 w-3/4" />
            <SkeletonPulse className="h-3 w-1/2" />
            <SkeletonPulse className="h-3 w-2/3" />
        </div>
    </article>
);

// ── Skeleton de fila de tabla ─────────────────────────────────────────────────
// Replica una fila de tabla con N celdas. Se usa en Auditoría, Eventos, etc.
// Cada celda tiene ancho variable para simular contenido real — filas
// con widths idénticas se perciben como "falsas" inmediatamente.
export const TableRowSkeleton = ({ cols = 5 }: { cols?: number }) => {
    // Widths variables por posición para simular texto real
    const widths = ["w-24", "w-32", "w-20", "w-28", "w-16", "w-36", "w-20"];
    return (
        <tr>
            {Array.from({ length: cols }).map((_, i) => (
                <td key={i} className="border-b border-slate-100 px-4 py-3">
                    <SkeletonPulse className={`h-3.5 ${widths[i % widths.length]}`} />
                </td>
            ))}
        </tr>
    );
};

// ── Skeleton de tabla completa ────────────────────────────────────────────────
// Renderiza el header real de la tabla + N filas skeleton debajo.
// El header siempre visible da contexto — el usuario sabe qué columnas
// están cargando aunque no vea los datos todavía.
export const TableSkeleton = ({
    cols = 5,
    rows = 8,
    headers = [],
}: {
    cols?: number;
    rows?: number;
    headers?: string[];
}) => (
    <div className="overflow-hidden rounded-xl border border-slate-200">
        <table className="w-full border-collapse text-sm">
            {headers.length > 0 && (
                <thead className="bg-slate-50">
                    <tr>
                        {headers.map((h) => (
                            <th
                                key={h}
                                className="border-b border-slate-200 px-4 py-3 text-left text-xs font-medium text-slate-500"
                            >
                                {h}
                            </th>
                        ))}
                    </tr>
                </thead>
            )}
            <tbody>
                {Array.from({ length: rows }).map((_, i) => (
                    <TableRowSkeleton key={i} cols={cols} />
                ))}
            </tbody>
        </table>
    </div>
);

// ── Grid de cards ─────────────────────────────────────────────────────────────
interface SkeletonGridProps {
    count?: number;
    variant: "unit" | "poi" | "user";
}

export const SkeletonGrid = ({ count = 6, variant }: SkeletonGridProps) => (
    <div className="grid grid-cols-1 gap-4 md:gap-6 2xl:grid-cols-2">
        {Array.from({ length: count }).map((_, index) => {
            switch (variant) {
                case "unit": return <UnitCardSkeleton key={index} />;
                case "poi": return <PoiCardSkeleton key={index} />;
                case "user": return <UserCardSkeleton key={index} />;
            }
        })}
    </div>
);

// ── Skeleton para drawers del mapa ────────────────────────────────────────────
export const DrawerItemSkeleton = () => (
    <div className="flex items-center gap-3 border-b border-slate-100 px-4 py-3">
        <SkeletonPulse className="h-4 w-4 shrink-0 rounded" />
        <SkeletonPulse className="h-3 w-3 shrink-0 rounded-full" />
        <div className="flex-1 space-y-2">
            <SkeletonPulse className="h-4 w-16" />
            <SkeletonPulse className="h-3 w-32" />
        </div>
    </div>
);

export const DrawerSkeletonList = ({ count = 8 }: { count?: number }) => (
    <div>
        {Array.from({ length: count }).map((_, index) => (
            <DrawerItemSkeleton key={index} />
        ))}
    </div>
);