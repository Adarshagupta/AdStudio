type JsonRecord = Record<string, unknown>;

export async function readJsonResponse<T extends JsonRecord = JsonRecord>(response: Response): Promise<T> {
  const text = await response.text();

  if (!text.trim()) {
    return {} as T;
  }

  try {
    return JSON.parse(text) as T;
  } catch {
    if (response.ok) {
      throw new Error("Unexpected server response.");
    }
    throw new Error(`Request failed (${response.status}).`);
  }
}

export function responseErrorMessage(
  response: Response,
  data: { error?: string; message?: string },
  fallback: string,
) {
  if (data.error) return data.error;
  if (data.message) return data.message;
  if (!response.ok) return `${fallback} (${response.status})`;
  return fallback;
}

export async function parseRequestJson<T extends JsonRecord = JsonRecord>(request: Request): Promise<T | null> {
  try {
    const text = await request.text();
    if (!text.trim()) return null;
    return JSON.parse(text) as T;
  } catch {
    return null;
  }
}

export function formatValidationErrors(
  errors: {
    fieldErrors?: Record<string, string[]>;
    formErrors?: string[];
  },
  fallback: string,
) {
  const fieldError = errors.fieldErrors
    ? Object.entries(errors.fieldErrors)
        .flatMap(([field, messages]) => messages.map((message) => `${field}: ${message}`))
        .at(0)
    : null;

  return fieldError ?? errors.formErrors?.at(0) ?? fallback;
}
