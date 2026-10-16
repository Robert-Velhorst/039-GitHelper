param(
  [Parameter(Mandatory = $true)][string]$SourcePath,
  [Parameter(Mandatory = $true)][string]$DestinationPath
)

Compress-Archive -LiteralPath $SourcePath -DestinationPath $DestinationPath -CompressionLevel Optimal -Force
