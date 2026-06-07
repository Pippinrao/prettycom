import { translate } from "@/i18n"
import { usePrettyComStore } from "@/store/prettycom-store"

export function useT() {
  const language = usePrettyComStore((state) => state.language)
  return (key: string) => translate(key, language)
}
