!macro customHeader
    BrandingText "Google Search Desktop App"
!macroend

!macro customInstall
    WriteRegStr HKCU "Software\Google Search" "Install_Dir" "$INSTDIR"
!macroend

!macro customUnInstall
    DeleteRegKey HKCU "Software\Google Search"
!macroend 