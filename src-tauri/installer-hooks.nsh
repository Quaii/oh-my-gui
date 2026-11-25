; The silent installation engine reports real boundaries to its owning UI.
; This environment variable is supplied only by the custom installer host.
!macro OMP_REPORT_STAGE STAGE
  Push $R8
  Push $R9
  ReadEnvStr $R9 "OMP_INSTALL_PROGRESS"
  ${If} $R9 != ""
    ClearErrors
    FileOpen $R8 $R9 a
    ${IfNot} ${Errors}
      FileSeek $R8 0 END
      FileWrite $R8 "${STAGE}$\r$\n"
      FileClose $R8
    ${EndIf}
  ${EndIf}
  Pop $R9
  Pop $R8
!macroend

!macro NSIS_HOOK_PREINSTALL
  !insertmacro OMP_REPORT_STAGE "files"
!macroend

!macro NSIS_HOOK_POSTINSTALL
  ; Replace only the old desktop app registered in the original per-user folder.
  ${If} $INSTDIR == "$LOCALAPPDATA\Programs\omp"
    ReadRegStr $R8 HKCU "Software\Microsoft\Windows\CurrentVersion\Uninstall\omp" "UninstallString"
    ReadRegStr $R9 HKCU "Software\Microsoft\Windows\CurrentVersion\Uninstall\omp" "MainBinaryName"
    ${If} $R8 == '$\"$INSTDIR\uninstall.exe$\"'
    ${AndIf} $R9 == "omp-desktop.exe"
      !insertmacro IsShortcutTarget "$SMPROGRAMS\omp.lnk" "$INSTDIR\omp-desktop.exe"
      Pop $0
      ${If} $0 = 1
        Delete "$SMPROGRAMS\omp.lnk"
      ${EndIf}
      !insertmacro IsShortcutTarget "$DESKTOP\omp.lnk" "$INSTDIR\omp-desktop.exe"
      Pop $0
      ${If} $0 = 1
        Delete "$DESKTOP\omp.lnk"
      ${EndIf}
      ${If} ${FileExists} "$INSTDIR\omp-desktop.exe"
        ClearErrors
        Delete "$INSTDIR\omp-desktop.exe"
        ${If} ${Errors}
          SetErrorLevel 1
          Abort
        ${EndIf}
      ${EndIf}
      DeleteRegKey HKCU "Software\Microsoft\Windows\CurrentVersion\Uninstall\omp"
    ${EndIf}
  ${EndIf}
  !insertmacro OMP_REPORT_STAGE "integrated"
!macroend
