type ClassValue = string | false | null | undefined | Record<string, boolean>

export function cn(...classes: ClassValue[]) {
  return classes.flatMap(value => {
    if (typeof value === 'string') return [value]
    if (value && typeof value === 'object') return Object.entries(value).filter(([, enabled]) => enabled).map(([name]) => name)
    return []
  }).join(' ')
}
