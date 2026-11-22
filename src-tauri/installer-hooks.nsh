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
  !insertmacro OMP_REPORT_STAGE "integrated"
!macroend
