import useSWR, { type SWRConfiguration } from "swr";

export function useApi<T>(path: string | null, config?: SWRConfiguration<T>) {
  return useSWR<T>(path, config);
}
