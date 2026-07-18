import type { ReactNode } from 'react'
import { createContext, useCallback, useContext, useMemo, useState } from 'react'
import { MSP_COORDS } from './geo'
import type { LatLng } from './geo'
import { geocodeAddress } from './geocode'

/**
 * Point de référence des distances de l'annuaire — état client transitoire, **jamais persisté**
 * (même régime que `SelectionProvider`, cf. plans/P3/S2.md T3 §Décision clé). Par défaut la MSP ;
 * peut basculer sur une adresse patient saisie ponctuellement (jamais stockée en base, cf.
 * plans/P3/index.md §Décisions de cadrage).
 */
export interface Reference {
  label: string
  coords: LatLng
}

const MSP_REFERENCE: Reference = { label: 'MSP', coords: MSP_COORDS }

interface ReferenceContextValue {
  reference: Reference
  /** `true` quand la référence active n'est pas la MSP (adresse patient en cours). */
  isPatientAddress: boolean
  /** Géocode l'adresse saisie ; succès → devient la référence (renvoie `true`) ; échec → la
   * référence ne change pas (renvoie `false`, l'UI affiche « adresse introuvable »). */
  setPatientAddress: (query: string) => Promise<boolean>
  resetToMSP: () => void
}

const ReferenceContext = createContext<ReferenceContextValue | null>(null)

export function ReferenceProvider({ children }: { children: ReactNode }) {
  const [reference, setReference] = useState<Reference>(MSP_REFERENCE)

  const setPatientAddress = useCallback(async (query: string) => {
    const trimmed = query.trim()
    if (!trimmed) return false
    const result = await geocodeAddress(trimmed)
    if (!result) return false
    setReference({ label: trimmed, coords: { lat: result.lat, lng: result.lng } })
    return true
  }, [])

  const resetToMSP = useCallback(() => setReference(MSP_REFERENCE), [])

  const value = useMemo<ReferenceContextValue>(
    () => ({
      reference,
      isPatientAddress: reference.label !== MSP_REFERENCE.label,
      setPatientAddress,
      resetToMSP,
    }),
    [reference, setPatientAddress, resetToMSP],
  )

  return <ReferenceContext.Provider value={value}>{children}</ReferenceContext.Provider>
}

export function useReference(): ReferenceContextValue {
  const ctx = useContext(ReferenceContext)
  if (!ctx) throw new Error('useReference doit être appelé sous <ReferenceProvider>.')
  return ctx
}
