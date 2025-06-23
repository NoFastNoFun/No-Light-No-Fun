/**
 * API utility functions for backend communication
 */

/**
 * Fetch wrapper with configurable base URL
 * @param path - API endpoint path (e.g., "config", "patchmap")
 * @param init - Fetch options
 * @returns Promise with typed response data
 */
export async function apiFetch<T>(path: string, init?: RequestInit): Promise<T> {
  const base = process.env.NEXT_PUBLIC_API_URL || ""
  const cleanBase = base.replace(/\/+$/, "")
  const cleanPath = path.replace(/^\/+/, "")
  const url = base ? `${cleanBase}/api/${cleanPath}` : `/api/${cleanPath}`

  const options: RequestInit = {
    ...init,
    credentials: base ? "omit" : "include",
    headers: {
      "Content-Type": "application/json",
      ...init?.headers,
    },
  }

  try {
    const response = await fetch(url, options)

    if (!response.ok) {
      throw new Error(`API request failed: ${response.status} ${response.statusText}`)
    }

    // Handle empty responses
    const contentType = response.headers.get("content-type")
    if (!contentType || !contentType.includes("application/json")) {
      return {} as T
    }

    const text = await response.text()
    if (!text.trim()) {
      return {} as T
    }

    try {
      return JSON.parse(text)
    } catch (parseError) {
      console.warn("Failed to parse JSON response:", text)
      return {} as T
    }
  } catch (error) {
    console.error("API fetch error:", error)
    throw error
  }
}

/**
 * Upload file via multipart form data
 * @param path - API endpoint path
 * @param formData - Form data to upload
 * @returns Promise with typed response data
 */
export async function apiUpload<T>(path: string, formData: FormData): Promise<T> {
  const base = process.env.NEXT_PUBLIC_API_URL || ""
  const cleanBase = base.replace(/\/+$/, "")
  const cleanPath = path.replace(/^\/+/, "")
  const url = base ? `${cleanBase}/api/${cleanPath}` : `/api/${cleanPath}`

  const options: RequestInit = {
    method: "PUT",
    credentials: base ? "omit" : "include",
    body: formData,
  }

  try {
    const response = await fetch(url, options)

    if (!response.ok) {
      throw new Error(`API upload failed: ${response.status} ${response.statusText}`)
    }

    // Handle empty responses
    const contentType = response.headers.get("content-type")
    if (!contentType || !contentType.includes("application/json")) {
      return {} as T
    }

    const text = await response.text()
    if (!text.trim()) {
      return {} as T
    }

    try {
      return JSON.parse(text)
    } catch (parseError) {
      console.warn("Failed to parse JSON response:", text)
      return {} as T
    }
  } catch (error) {
    console.error("API upload error:", error)
    throw error
  }
}
