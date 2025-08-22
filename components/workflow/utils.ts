// utils.ts
export const genId = (prefix: string) => {
    const base =
      typeof crypto !== 'undefined' && 'randomUUID' in crypto
        ? crypto.randomUUID()
        : `${Date.now()}-${Math.random().toString(16).slice(2)}`
    return `${prefix}-${base}`
  }