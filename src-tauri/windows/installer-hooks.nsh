; PrettyCOM NSIS hooks - ensure user data is removed on full uninstall.
; Sessions, logs, aliases, send lists, and settings live in WebView2 storage under:
;   %LOCALAPPDATA%\com.prettycom.app\EBWebView\...
;   %APPDATA%\com.prettycom.app\...
; Registry install metadata: HKCU\Software\prettycom\PrettyCOM

!macro NSIS_HOOK_POSTUNINSTALL
  ; Skip during in-place updates; only purge on explicit uninstall.
  ${If} $UpdateMode <> 1
    SetShellVarContext current
    RmDir /r "$APPDATA\com.prettycom.app"
    RmDir /r "$LOCALAPPDATA\com.prettycom.app"
    DeleteRegKey HKCU "Software\prettycom\PrettyCOM"
  ${EndIf}
!macroend