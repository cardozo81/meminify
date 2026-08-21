[CmdletBinding()]
param()

$ErrorActionPreference = 'Stop'
$projectRoot = [System.IO.Path]::GetFullPath((Join-Path $PSScriptRoot '..\..'))
$packageTool = Join-Path $projectRoot 'scripts\release\package.mjs'

function Invoke-Checked {
    param([string]$Label, [scriptblock]$Action)
    Write-Host "[VALIDAR] $Label" -ForegroundColor Cyan
    & $Action
    if ($LASTEXITCODE -ne 0) { throw "$Label falhou com código $LASTEXITCODE." }
}

try {
    $node = (Get-Command node.exe -ErrorAction Stop).Source
    $npm = (Get-Command npm.cmd -ErrorAction Stop).Source
    Push-Location $projectRoot
    try {
        Invoke-Checked 'ambiente, versão, package/lock e dependências' { & $node $packageTool validate-project $projectRoot | Out-Null }
        Invoke-Checked 'UTF-8 e mojibake' { & $node (Join-Path $projectRoot 'scripts\quality\check-encoding.mjs') }
        Invoke-Checked 'testes do pacote' { & $npm test }
        Invoke-Checked 'documentação HTML offline' { & $npm run build:docs }

        $metadataJson = & $node $packageTool assemble $projectRoot
        if ($LASTEXITCODE -ne 0) { throw 'A montagem allowlisted do pacote falhou.' }
        $metadata = $metadataJson | ConvertFrom-Json
        Invoke-Checked 'estrutura e conteúdo do pacote montado' { & $node $packageTool validate-package $projectRoot | Out-Null }

        $distRoot = [System.IO.Path]::GetFullPath($metadata.distRoot)
        $packageRoot = [System.IO.Path]::GetFullPath($metadata.packageRoot)
        $zipPath = [System.IO.Path]::GetFullPath($metadata.zipPath)
        $checksumPath = [System.IO.Path]::GetFullPath($metadata.checksumPath)
        if ((Split-Path -Parent $packageRoot) -ne $distRoot -or (Split-Path -Parent $zipPath) -ne $distRoot -or (Split-Path -Parent $checksumPath) -ne $distRoot) {
            throw 'Os destinos de distribuição não permanecem sob dist.'
        }

        Compress-Archive -LiteralPath $packageRoot -DestinationPath $zipPath -CompressionLevel Optimal -Force
        Add-Type -AssemblyName System.IO.Compression.FileSystem
        $archive = [System.IO.Compression.ZipFile]::OpenRead($zipPath)
        try {
            $prefix = "$($metadata.packageName)/"
            $entries = @($archive.Entries | ForEach-Object { $_.FullName.Replace('\', '/') })
            if ($entries.Count -eq 0 -or @($entries | Where-Object { -not $_.StartsWith($prefix, [System.StringComparison]::Ordinal) }).Count -gt 0) {
                throw 'O ZIP não contém exclusivamente a raiz versionada esperada.'
            }
            foreach ($required in @('Executar.ps1', 'package.json', 'package-lock.json', 'Configuracao/configuracao.ini.example', 'Documentacao/Gerada/Manual-Usuario/index.html', 'Documentacao/Gerada/Manual-Tecnico/index.html')) {
                if ($entries -notcontains "$prefix$required") { throw "Arquivo obrigatório ausente no ZIP: $required." }
            }
        } finally { $archive.Dispose() }

        $hash = (Get-FileHash -LiteralPath $zipPath -Algorithm SHA256).Hash.ToLowerInvariant()
        $checksumLine = "$hash  $([System.IO.Path]::GetFileName($zipPath))`n"
        [System.IO.File]::WriteAllText($checksumPath, $checksumLine, [System.Text.UTF8Encoding]::new($false))
        $recorded = ([System.IO.File]::ReadAllText($checksumPath, [System.Text.Encoding]::UTF8)).Trim().Split(' ')[0]
        if ($recorded -ne $hash) { throw 'O checksum persistido não corresponde ao ZIP.' }

        Write-Host "Pacote validado: $packageRoot" -ForegroundColor Green
        Write-Host "ZIP validado: $zipPath" -ForegroundColor Green
        Write-Host "SHA-256: $hash" -ForegroundColor Green
        Write-Host "Checksum: $checksumPath" -ForegroundColor Green
    } finally { Pop-Location }
} catch {
    Write-Error "Empacotamento bloqueado: $($_.Exception.Message)"
    exit 1
}
