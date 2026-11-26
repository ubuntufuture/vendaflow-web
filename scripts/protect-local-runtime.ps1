$ErrorActionPreference='Stop'
$runtimeRoot=[IO.Path]::GetFullPath('D:/VendaFlowAi-runtime')
if(-not (Test-Path -LiteralPath $runtimeRoot -PathType Container)){throw 'Runtime não localizado'}
if((Get-Item -LiteralPath $runtimeRoot).Attributes -band [IO.FileAttributes]::ReparsePoint){throw 'Redirecionamento inesperado no runtime'}
$currentSid=[Security.Principal.WindowsIdentity]::GetCurrent().User.Value
foreach($relativePath in @('secrets.json','runtime.json','worker.json','admin-runtime.json','admin-web.json','keycloak/keycloak-26.8.2/data')){
 $target=[IO.Path]::GetFullPath((Join-Path $runtimeRoot $relativePath))
 if(-not $target.StartsWith($runtimeRoot+[IO.Path]::DirectorySeparatorChar,[StringComparison]::OrdinalIgnoreCase)){throw 'Destino fora do runtime autorizado'}
 if(Test-Path -LiteralPath $target){
  $isDirectory=Test-Path -LiteralPath $target -PathType Container
  $inheritance=if($isDirectory){'(OI)(CI)'}else{''}
  & icacls.exe $target /inheritance:r /grant:r ('*'+$currentSid+':'+$inheritance+'F') ('*S-1-5-18:'+$inheritance+'F') ('*S-1-5-32-544:'+$inheritance+'F') /Q | Out-Null
  if($LASTEXITCODE -ne 0){throw 'ACL de segredos não foi aplicada'}
 }
}
Write-Output 'ACLs dos segredos locais e do armazenamento de identidade aplicadas.'
