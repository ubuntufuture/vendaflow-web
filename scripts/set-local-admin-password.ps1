$ErrorActionPreference = 'Stop'
$taskRoot = Split-Path -Parent $PSScriptRoot
$secretPassword = Read-Host 'Defina sua senha interna (14+ caracteres, maiúscula, minúscula e número)' -AsSecureString
$secretConfirmation = Read-Host 'Confirme sua senha interna' -AsSecureString
$passwordPointer = [IntPtr]::Zero
$confirmationPointer = [IntPtr]::Zero
try {
  $passwordPointer = [Runtime.InteropServices.Marshal]::SecureStringToBSTR($secretPassword)
  $confirmationPointer = [Runtime.InteropServices.Marshal]::SecureStringToBSTR($secretConfirmation)
  $passwordText = [Runtime.InteropServices.Marshal]::PtrToStringBSTR($passwordPointer)
  $confirmationText = [Runtime.InteropServices.Marshal]::PtrToStringBSTR($confirmationPointer)
  if ($passwordText -cne $confirmationText) { throw 'As senhas não coincidem.' }
  Push-Location -LiteralPath $taskRoot
  $previousPasswordPipeEncoding = $OutputEncoding
  try {
    $OutputEncoding = New-Object System.Text.UTF8Encoding($false)
    @{ password = $passwordText } | ConvertTo-Json -Compress | node scripts/set-local-admin-password.mjs
  } finally {
    $OutputEncoding = $previousPasswordPipeEncoding
    Pop-Location
  }
  if ($LASTEXITCODE -ne 0) { throw 'A senha não foi configurada.' }
} finally {
  if ($passwordPointer -ne [IntPtr]::Zero) { [Runtime.InteropServices.Marshal]::ZeroFreeBSTR($passwordPointer) }
  if ($confirmationPointer -ne [IntPtr]::Zero) { [Runtime.InteropServices.Marshal]::ZeroFreeBSTR($confirmationPointer) }
  Remove-Variable passwordText,confirmationText -ErrorAction SilentlyContinue
  $secretPassword.Dispose()
  $secretConfirmation.Dispose()
}
