import { useQuery } from "@tanstack/react-query";
import { listPalettes } from "./palettes";
import { listTags } from "./tags";
import { queryKeys } from "./queryKeys";
import type { PaletteListParams } from "../types/api";

export function usePalettes(params: PaletteListParams = {}) {
  return useQuery({
    queryKey: queryKeys.palettes(params),
    queryFn: () => listPalettes(params),
  });
}

export function useTags() {
  return useQuery({
    queryKey: queryKeys.tags,
    queryFn: listTags,
    staleTime: 5 * 60_000,
  });
}
