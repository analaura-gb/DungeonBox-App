const API_BASE_URL = import.meta.env.VITE_API_BASE_URL;

type RequestOptions = RequestInit & {
  body?: BodyInit | null;
};

type ApiErrorResponse = {
  message?: string | string[];
  error?: string;
  statusCode?: number;
};

export async function apiFetch<TResponse>(
  path: string,
  options: RequestOptions = {},
): Promise<TResponse> {
  const response = await fetch(`${API_BASE_URL}${path}`, {
    ...options,
    credentials: "include",
    headers: {
      "Content-Type": "application/json",
      ...options.headers,
    },
  });

  const data = await response.json().catch(() => null);

  if (!response.ok) {
    const errorData = data as ApiErrorResponse | null;

    let message = `Request failed with status ${response.status}`;

    if (Array.isArray(errorData?.message)) {
      message = errorData.message[0];
    } else if (typeof errorData?.message === "string") {
      message = errorData.message;
    }

    throw new Error(message);
  }

  return data as TResponse;
}
