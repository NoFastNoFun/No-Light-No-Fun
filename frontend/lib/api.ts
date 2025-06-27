/**
 * API utility functions for backend communication
 */

/**
 * Fetch wrapper with configurable base URL
 * @param path - API endpoint path (e.g., "config", "patch/csv")
 * @param init - Fetch options
 * @returns Promise with typed response data
 */
export async function apiFetch<T>(
  path: string,
  init?: RequestInit
): Promise<T> {
  const base = process.env.NEXT_PUBLIC_API_URL || "";
  const cleanBase = base.replace(/\/+$/, "");
  const cleanPath = path.replace(/^\/+/, "");
  const url = base ? `${cleanBase}/api/${cleanPath}` : `/api/${cleanPath}`;

  const options: RequestInit = {
    ...init,
    credentials: base ? "omit" : "include",
    headers: {
      "Content-Type": "application/json",
      ...init?.headers,
    },
  };

  const response = await fetch(url, options);
  if (!response.ok) {
    const text = await response.text();
    throw new Error(`API error ${response.status}: ${text}`);
  }

  // 1) Pas de contenu ➔ rien à parser
  if (response.status === 204) {
    return {} as T;
  }

  // 2) Récupère toujours le texte
  const text = await response.text();

  // 3) Body vide ➔ cas OK, on renvoie rien
  if (!text.trim()) {
    return {} as T;
  }

  // 4) Essaye de parser le JSON
  try {
    return JSON.parse(text) as T;
  } catch (err) {
    // On ne masque plus l’erreur de parsing
    throw new Error(`Invalid JSON from ${url}: ${err}`);
  }
}

/**
 * Upload file via multipart form data
 * @param path - API endpoint path
 * @param formData - Form data to upload
 * @returns Promise with typed response data
 */
export async function apiUpload<T>(
  path: string,
  formData: FormData
): Promise<T> {
  const base = process.env.NEXT_PUBLIC_API_URL || "";
  const cleanBase = base.replace(/\/+$/, "");
  const cleanPath = path.replace(/^\/+/, "");
  const url = base ? `${cleanBase}/api/${cleanPath}` : `/api/${cleanPath}`;

  const options: RequestInit = {
    method: "POST",
    credentials: base ? "omit" : "include",
    body: formData,
    // Don't set Content-Type header for multipart/form-data
  };

  try {
    const response = await fetch(url, options);

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(
        `API upload failed: ${response.status} ${response.statusText} - ${errorText}`
      );
    }

    // Handle 204 No Content responses
    if (response.status === 204) {
      return {} as T;
    }

    // Handle empty responses
    const contentType = response.headers.get("content-type");
    if (!contentType || !contentType.includes("application/json")) {
      return {} as T;
    }

    const text = await response.text();
    if (!text.trim()) {
      return {} as T;
    }

    try {
      return JSON.parse(text);
    } catch (parseError) {
      console.warn("Failed to parse JSON response:", text);
      return {} as T;
    }
  } catch (error) {
    console.error("API upload error:", error);
    throw error;
  }
}

/**
 * Upload CSV data as text
 * @param path - API endpoint path
 * @param csvData - CSV content as string
 * @returns Promise with typed response data
 */
export async function apiUploadCSV<T>(
  path: string,
  csvData: string
): Promise<T> {
  const base = process.env.NEXT_PUBLIC_API_URL || "";
  const cleanBase = base.replace(/\/+$/, "");
  const cleanPath = path.replace(/^\/+/, "");
  const url = base ? `${cleanBase}/api/${cleanPath}` : `/api/${cleanPath}`;

  const options: RequestInit = {
    method: "POST",
    credentials: base ? "omit" : "include",
    headers: {
      "Content-Type": "text/csv",
    },
    body: csvData,
  };

  try {
    const response = await fetch(url, options);

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(
        `CSV upload failed: ${response.status} ${response.statusText} - ${errorText}`
      );
    }

    // Handle 204 No Content responses
    if (response.status === 204) {
      return {} as T;
    }

    return {} as T;
  } catch (error) {
    console.error("CSV upload error:", error);
    throw error;
  }
}
