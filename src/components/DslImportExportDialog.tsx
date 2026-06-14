import { useT } from "@/hooks/use-t"
import { copyTextToClipboard, loadTextFromFile, saveTextToFile } from "@/lib/text-export"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Textarea } from "@/components/ui/textarea"

export type DslDialogMode = "export" | "import"

export interface DslImportExportDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  mode: DslDialogMode
  text: string
  onTextChange: (text: string) => void
  onImport: () => void
  placeholder: string
  testIdPrefix: string
  defaultFileName: string
  importDescriptionKey: string
  importError?: string
}

export function DslImportExportDialog({
  open,
  onOpenChange,
  mode,
  text,
  onTextChange,
  onImport,
  placeholder,
  testIdPrefix,
  defaultFileName,
  importDescriptionKey,
  importError,
}: DslImportExportDialogProps) {
  const t = useT()

  const handleLoadFromFile = () => {
    void loadTextFromFile().then((content) => {
      if (content !== null) {
        onTextChange(content)
      }
    })
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg" data-testid={`${testIdPrefix}-dialog`}>
        <DialogHeader>
          <DialogTitle>{mode === "export" ? t("Export DSL") : t("Import DSL")}</DialogTitle>
          <DialogDescription>
            {mode === "export"
              ? t("Copy the DSL below or save to a file.")
              : t(importDescriptionKey)}
          </DialogDescription>
        </DialogHeader>
        <Textarea
          className="min-h-[200px] font-mono text-xs"
          value={text}
          onChange={(event) => onTextChange(event.target.value)}
          readOnly={mode === "export"}
          placeholder={placeholder}
          aria-invalid={mode === "import" && !!importError}
        />
        {mode === "import" && importError ? (
          <p className="text-sm text-destructive" data-testid={`${testIdPrefix}-import-error`}>
            {importError}
          </p>
        ) : null}
        <DialogFooter className="gap-2 sm:justify-end">
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
            {t("Cancel")}
          </Button>
          {mode === "export" ? (
            <>
              <Button
                type="button"
                variant="secondary"
                onClick={() => void copyTextToClipboard(text)}
                data-testid={`${testIdPrefix}-copy`}
              >
                {t("Copy DSL")}
              </Button>
              <Button
                type="button"
                onClick={() => void saveTextToFile(text, defaultFileName)}
                data-testid={`${testIdPrefix}-save-file`}
              >
                {t("Save to file")}
              </Button>
            </>
          ) : (
            <>
              <Button
                type="button"
                variant="secondary"
                onClick={handleLoadFromFile}
                data-testid={`${testIdPrefix}-load-file`}
              >
                {t("Load from file")}
              </Button>
              <Button type="button" onClick={onImport} data-testid={`${testIdPrefix}-confirm-import`}>
                {t("Import")}
              </Button>
            </>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}