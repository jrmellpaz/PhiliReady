import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  fetchDemandHeatmap,
  fetchCityDetail,
  fetchForecast,
  runSimulation,
  fetchCustomCityForecast,
  fetchMe,
  fetchUsers,
  fetchPrices,
  fetchWeather,
  updateCity,
  updatePrice,
  assignCities,
  removeCityAccess,
} from './api'
import type { HazardType } from './types'
import { getToken } from './auth'

// ── Map ───────────────────────────────────────────────────────────────────
export function useDemandHeatmap(hazard?: HazardType, severity?: number) {
  return useQuery({
    queryKey: ['demand-heatmap', hazard, severity],
    queryFn: () => fetchDemandHeatmap(hazard, severity),
    staleTime: 30_000,
    refetchInterval: 60_000,
  })
}

// ── City Detail ───────────────────────────────────────────────────────────
export function useCityDetail(pcode: string | null) {
  return useQuery({
    queryKey: ['city-detail', pcode],
    queryFn: () => fetchCityDetail(pcode!),
    enabled: !!pcode,
  })
}

// ── Forecast ──────────────────────────────────────────────────────────────
export function useForecast(
  pcode: string | null,
  hazard?: HazardType,
  severity?: number,
) {
  return useQuery({
    queryKey: ['forecast', pcode, hazard, severity],
    queryFn: () => fetchForecast(pcode!, hazard, severity),
    enabled: !!pcode,
  })
}

// ── Simulation (global) ──────────────────────────────────────────────────
export function useSimulation() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: runSimulation,
    onSuccess: (data) => {
      qc.setQueryData(['demand-heatmap', undefined, undefined], data)
    },
  })
}

// ── Custom City Simulator ─────────────────────────────────────────────────
export function useCustomCityForecast(
  params: Parameters<typeof fetchCustomCityForecast>[0] | null,
) {
  return useQuery({
    queryKey: ['custom-city-forecast', params],
    queryFn: () => fetchCustomCityForecast(params!),
    enabled: !!params && !!params.population,
  })
}

// ── Auth ──────────────────────────────────────────────────────────────────
export function useMe() {
  return useQuery({
    queryKey: ['me'],
    queryFn: fetchMe,
    retry: false,
    staleTime: 5 * 60_000,
    enabled: !!getToken(),
  })
}

// ── Admin ─────────────────────────────────────────────────────────────────
export function useUsers() {
  return useQuery({
    queryKey: ['admin-users'],
    queryFn: fetchUsers,
  })
}

export function useAssignCities() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ userId, pcodes }: { userId: number; pcodes: string[] }) =>
      assignCities(userId, pcodes),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['admin-users'] }),
  })
}

export function useRemoveCityAccess() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ userId, pcode }: { userId: number; pcode: string }) =>
      removeCityAccess(userId, pcode),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['admin-users'] }),
  })
}

// ── Prices ────────────────────────────────────────────────────────────────
export function usePrices() {
  return useQuery({
    queryKey: ['prices'],
    queryFn: fetchPrices,
    staleTime: 60_000,
  })
}

export function useUpdatePrice() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ itemKey, price }: { itemKey: string; price: number }) =>
      updatePrice(itemKey, price),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['prices'] })
      qc.invalidateQueries({ queryKey: ['forecast'] })
    },
  })
}

// ── City Update ───────────────────────────────────────────────────────────
export function useUpdateCity() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({
      pcode,
      body,
    }: {
      pcode: string
      body: Record<string, unknown>
    }) => updateCity(pcode, body),
    onSuccess: (_data, { pcode }) => {
      qc.invalidateQueries({ queryKey: ['city-detail', pcode] })
      qc.invalidateQueries({ queryKey: ['demand-heatmap'] })
    },
  })
}

// ── Weather ───────────────────────────────────────────────────────────────
export function useWeather() {
  return useQuery({
    queryKey: ['weather'],
    queryFn: fetchWeather,
    staleTime: 60 * 60_000, // 1 hour — data cached daily on backend
  })
}
