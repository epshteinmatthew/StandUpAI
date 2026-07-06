export type SerializedError = {
  name: string;
  message: string;
  stack?: string;
  digest?: string;
  cause?: string;
};

/** Show full server errors in production until debugging is done. Set HIDE_SERVER_ERRORS=1 to revert. */
export function shouldShowDebugErrors(): boolean {
  return process.env.HIDE_SERVER_ERRORS !== '1';
}

export function isNavigationError(error: unknown): boolean {
  if (typeof error !== 'object' || error === null) return false;
  const digest = (error as { digest?: string }).digest;
  return (
    typeof digest === 'string' &&
    (digest.startsWith('NEXT_REDIRECT') || digest.startsWith('NEXT_NOT_FOUND'))
  );
}

export function serializeError(error: unknown): SerializedError {
  if (error instanceof Error) {
    return {
      name: error.name,
      message: error.message,
      stack: error.stack,
      digest: 'digest' in error ? String((error as Error & { digest?: string }).digest ?? '') : undefined,
      cause: error.cause ? formatUnknown(error.cause) : undefined,
    };
  }

  return {
    name: 'Error',
    message: formatUnknown(error),
  };
}

function formatUnknown(value: unknown): string {
  if (value instanceof Error) {
    return `${value.name}: ${value.message}${value.stack ? `\n${value.stack}` : ''}`;
  }

  try {
    return JSON.stringify(value, null, 2);
  } catch {
    return String(value);
  }
}

export function formatErrorForDisplay(error: SerializedError): string {
  const parts = [
    `${error.name}: ${error.message}`,
    error.digest ? `Digest: ${error.digest}` : null,
    error.cause ? `Cause:\n${error.cause}` : null,
    error.stack ? `Stack:\n${error.stack}` : null,
  ].filter(Boolean);

  return parts.join('\n\n');
}
