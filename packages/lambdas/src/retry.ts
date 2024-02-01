export async function retry<T>(args: {
  callback: () => Promise<T>;
  maxRetries: number;
  retryDelay: number;
}): Promise<T> {
  const { callback, maxRetries, retryDelay } = args;

  let lastError: unknown;

  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      return await callback();
    } catch (error) {
      lastError = error;
      console.log(
        `Attempt ${attempt + 1} failed. Retrying in ${retryDelay}ms...`
      );
      await new Promise((resolve) => setTimeout(resolve, retryDelay));
    }
  }

  throw lastError;
}
