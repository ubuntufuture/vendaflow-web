param([Parameter(Mandatory=$true)][string]$Archive,[Parameter(Mandatory=$true)][string]$Destination)
$ErrorActionPreference='Stop'
$allowed=[IO.Path]::GetFullPath('D:/VendaFlowAi-runtime')+[IO.Path]::DirectorySeparatorChar
$target=[IO.Path]::GetFullPath($Destination)
if(-not $target.StartsWith($allowed,[StringComparison]::OrdinalIgnoreCase)){throw 'Destino fora do runtime autorizado'}
Expand-Archive -LiteralPath $Archive -DestinationPath $target -Force
