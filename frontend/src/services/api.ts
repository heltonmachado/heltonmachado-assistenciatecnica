const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000/api'
const TOKEN_KEY = 'assistencia_access_token'

export async function apiRequest<T>(path: string, init?: RequestInit): Promise<T> {
  const token = sessionStorage.getItem(TOKEN_KEY)
  const isFormData = init?.body instanceof FormData
  const response = await fetch(`${API_URL}${path}`, {
    ...init,
    headers: {
      Accept: 'application/json',
      ...(!isFormData ? { 'Content-Type': 'application/json' } : {}),
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...init?.headers,
    },
  })

  if (!response.ok) {
    if (response.status === 401 && token) {
      window.dispatchEvent(new Event('assistencia:auth-expired'))
    }
    const body = await response.json().catch(() => null) as
      | { message?: string; errors?: Record<string, string[]> }
      | null
    const validationMessage = body?.errors
      ? Object.values(body.errors).flat().join(' ')
      : undefined
    throw new Error(validationMessage || body?.message || `Erro HTTP ${response.status}`)
  }

  if (response.status === 204) return undefined as T
  return response.json() as Promise<T>
}

export async function downloadFile(path: string, filename: string): Promise<void> {
  const token = sessionStorage.getItem(TOKEN_KEY)
  const response = await fetch(`${API_URL}${path}`, {
    headers: {
      Accept: 'application/octet-stream',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
  })

  if (!response.ok) {
    const body = await response.json().catch(() => null) as { message?: string } | null
    throw new Error(body?.message || `Erro HTTP ${response.status}`)
  }

  const objectUrl = URL.createObjectURL(await response.blob())
  const link = document.createElement('a')
  link.href = objectUrl
  link.download = filename
  link.click()
  window.setTimeout(() => URL.revokeObjectURL(objectUrl), 1000)
}
