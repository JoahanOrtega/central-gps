import { useState, useEffect, useCallback } from 'react';
import { useTripMonitor } from './useTripMonitor';
import { telemetryService } from '../services/telemetryService';
import { notify } from '@/stores/notificationStore';
import type {
    RoutePoint,
    PredefinedRange,
    CustomRangeParams,
    RouteDisplayOptions
} from '../types/map.types';
import { haversineKm } from '../lib/map-geometry';

type DrawerMode = 'unit_select' | 'predefined' | 'custom' | 'summary';

interface UseTripDrawerOptions {
    onClose: () => void;
    onRouteSelected: (points: RoutePoint[]) => void;
    onRouteHidden: () => void;
    onRouteVisibilityChange: (visible: boolean) => void;
    onStartEndVisibilityChange: (visible: boolean) => void;
    onDirectionVisibilityChange: (visible: boolean) => void;
}

export const useTripDrawer = ({
    onClose,
    onRouteSelected,
    onRouteHidden,
    onRouteVisibilityChange,
    onStartEndVisibilityChange,
    onDirectionVisibilityChange,
}: UseTripDrawerOptions) => {
    const tripMonitor = useTripMonitor();

    // UI State
    const [mode, setMode] = useState<DrawerMode>('unit_select');
    const [search, setSearch] = useState('');

    // Rango personalizado
    const [customRange, setCustomRange] = useState<CustomRangeParams>({
        startDate: new Date().toISOString().split('T')[0],
        startTime: '',
        endDate: new Date().toISOString().split('T')[0],
        endTime: '',
    });

    // Opciones de visualización
    const [displayOptions, setDisplayOptions] = useState<RouteDisplayOptions>({
        flags: true,
        arrows: false,
        stops: true,
        speeding: true,
        engine: true,
        rfid: true,
        alerts: true,
        doors: true,
    });

    // Resumen extendido (se calculará cuando se cargue la ruta)
    const [extendedSummary, setExtendedSummary] = useState<{
        movementCount: number;
        distanceKm: number;
        movingSeconds: number;
        idleSeconds: number;
        offSeconds: number;
        speedingCount: number;
    } | null>(null);

    // Sincronizar visibilidad con props
    useEffect(() => {
        onRouteVisibilityChange(displayOptions.flags || displayOptions.arrows);
    }, [displayOptions.flags, displayOptions.arrows, onRouteVisibilityChange]);

    useEffect(() => {
        onStartEndVisibilityChange(displayOptions.flags);
    }, [displayOptions.flags, onStartEndVisibilityChange]);

    useEffect(() => {
        onDirectionVisibilityChange(displayOptions.arrows);
    }, [displayOptions.arrows, onDirectionVisibilityChange]);

    // Cargar unidades al abrir
    useEffect(() => {
        tripMonitor.loadUnits();
        setMode('unit_select');
    }, [tripMonitor.loadUnits]);

    // Aplicar ruta al mapa y calcular resumen extendido
    const applyRouteToMap = useCallback((points: RoutePoint[]) => {
        if (!points.length) {
            onRouteHidden();
            setExtendedSummary(null);
            return;
        }
        onRouteSelected(points);
        setMode('summary');

        // Calcular resumen extendido (similar a getRouteSummary pero con idle y speeding)
        // Nota: ya no se parsea el campo `status` crudo. El engine_state viene
        // pre-resuelto por el backend (prioridad tipo_alerta > status).
        let movementCount = 0;
        let distanceKm = 0;
        let movingSeconds = 0;
        let idleSeconds = 0;
        let offSeconds = 0;
        let speedingCount = 0;

        const SPEEDING_THRESHOLD = 80; // km/h, ajustable

        for (let i = 1; i < points.length; i++) {
            const prev = points[i - 1];
            const curr = points[i];

            const deltaSeconds = Math.max(0,
                (new Date(curr.fecha_hora_gps).getTime() - new Date(prev.fecha_hora_gps).getTime()) / 1000
            );

            const speed = prev.velocidad ?? 0;
            const engineState = prev.engine_state;

            // Distancia
            if (prev.latitud && prev.longitud && curr.latitud && curr.longitud) {
                // Usar haversine desde map-geometry
                distanceKm += haversineKm(prev.latitud, prev.longitud, curr.latitud, curr.longitud);
            }

            // Conteo de excesos
            if (speed > SPEEDING_THRESHOLD) {
                speedingCount++;
            }

            // Clasificación de tiempo por engine_state
            if (engineState === "off") {
                offSeconds += deltaSeconds;
            } else if (engineState === "on") {
                if (speed >= 1) {
                    movingSeconds += deltaSeconds;
                    movementCount++;
                } else {
                    idleSeconds += deltaSeconds;
                }
            }
            // engine_state === "unknown" → se descarta del cálculo
        }

        setExtendedSummary({
            movementCount,
            distanceKm: Number(distanceKm.toFixed(2)),
            movingSeconds,
            idleSeconds,
            offSeconds,
            speedingCount,
        });
    }, [onRouteSelected, onRouteHidden]);

    // Manejar selección de unidad
    const handleUnitChange = async (imei: string) => {
        onRouteHidden();
        await tripMonitor.selectUnit(imei);
        if (imei) {
            setMode('predefined');
        } else {
            setMode('unit_select');
        }
    };

    // Cargar ruta por modo predefinido
    const handleLoadPredefinedRoute = async (range: PredefinedRange) => {
        if (!tripMonitor.selectedUnitImei) return;

        try {
            let points: RoutePoint[] = [];

            // Mapear los nuevos rangos a los modos existentes o usar servicio específico
            switch (range) {
                case 'current':
                case 'latest':
                    points = await tripMonitor.loadRouteByMode('latest');
                    break;
                case 'today':
                    points = await tripMonitor.loadRouteByMode('today');
                    break;
                case 'yesterday':
                    points = await tripMonitor.loadRouteByMode('yesterday');
                    break;
                case 'day_before_yesterday':
                    points = await tripMonitor.loadRouteByMode('day_before_yesterday');
                    break;
                default:
                    // Para rangos de minutos/horas, se necesita un nuevo endpoint
                    points = await telemetryService.getRouteByCustomRange(
                        tripMonitor.selectedUnitImei,
                        { startDate: '', endDate: '' } // Placeholder, se debe calcular según el rango
                    );
                    notify.info('Rango por tiempo no implementado aún');
                    return;
            }

            applyRouteToMap(points);
        } catch (error) {
            notify.error('No se pudo cargar el recorrido');
        }
    };

    // Cargar ruta por rango personalizado
    const handleLoadCustomRange = async () => {
        if (!tripMonitor.selectedUnitImei) return;

        try {
            const points = await telemetryService.getRouteByCustomRange(
                tripMonitor.selectedUnitImei,
                customRange
            );
            applyRouteToMap(points);
        } catch (error) {
            notify.error('No se pudo cargar el recorrido en el rango especificado');
        }
    };

    // Reset al cambiar de unidad o cerrar
    const handleClose = useCallback(() => {
        onRouteHidden();
        onClose();
    }, [onRouteHidden, onClose]);

    // Helper para formatear duración (se puede importar de lib)
    const formatDuration = (seconds: number) => {
        const h = Math.floor(seconds / 3600);
        const m = Math.floor((seconds % 3600) / 60);
        const s = seconds % 60;
        if (h > 0) return `${h}h ${m}m ${s}s`;
        if (m > 0) return `${m}m ${s}s`;
        return `${s}s`;
    };

    return {
        // Datos del monitor
        units: tripMonitor.units,
        selectedUnit: tripMonitor.selectedUnit,
        selectedUnitImei: tripMonitor.selectedUnitImei,
        unitSummary: tripMonitor.unitSummary,
        visibleTrips: tripMonitor.visibleTrips,
        selectedTripId: tripMonitor.selectedTripId,
        activeMode: tripMonitor.activeMode,
        currentRoutePoints: tripMonitor.currentRoutePoints,
        isLoadingUnits: tripMonitor.isLoadingUnits,
        isLoadingRoute: tripMonitor.isLoadingRoute,
        error: tripMonitor.error,

        // Estado UI
        mode,
        setMode,
        search,
        setSearch,
        customRange,
        setCustomRange,
        displayOptions,
        setDisplayOptions,
        extendedSummary,
        formatDuration,

        // Acciones
        loadUnits: tripMonitor.loadUnits,
        handleUnitChange,
        handleLoadPredefinedRoute,
        handleLoadCustomRange,
        handleLoadTripById: tripMonitor.loadTripById,
        handleClose,
    };
};