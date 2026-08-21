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
    try { $node = (Get-Command node.exe -ErrorAction Stop).Source } catch { throw 'Node.js não foi encontrado. Instale uma linha LTS homologada e tente novamente.' }
    try { $npm = (Get-Command npm.cmd -ErrorAction Stop).Source } catch { throw 'npm.cmd não foi encontrado. Instale Node.js com npm e tente novamente.' }
    & $npm --version | Out-Null
    if ($LASTEXITCODE -ne 0) { throw 'npm.cmd está indisponível ou não pôde ser validado.' }
    Push-Location $projectRoot
    try {
        Invoke-Checked 'Node.js homologado e package/lock' { & $node $packageTool validate-manifests $projectRoot | Out-Null }
        $dependencyOutput = & $node $packageTool validate-dependencies $projectRoot 2>&1
        $dependencyExit = $LASTEXITCODE
        if ($dependencyExit -ne 0) {
            Write-Host 'Dependências locais necessárias para gerar a distribuição não estão instaladas ou estão divergentes.' -ForegroundColor Yellow
            Write-Host (($dependencyOutput | Out-String).Trim()) -ForegroundColor Yellow
            if (Test-Path -LiteralPath (Join-Path $projectRoot 'node_modules')) { Write-Host 'O npm ci recriará a árvore local de dependências existente.' -ForegroundColor Yellow }
            $answer = Read-Host 'Deseja preparar o ambiente executando "npm ci"? (s/N)'
            if ($answer -notmatch '^[sS]$') { throw 'Preparação das dependências recusada; empacotamento cancelado sem gerar pacote.' }
            $manifestHashes = @{}
            foreach ($manifest in @('package.json', 'package-lock.json')) { $manifestHashes[$manifest] = (Get-FileHash -Algorithm SHA256 -LiteralPath (Join-Path $projectRoot $manifest)).Hash }
            Write-Host '[PREPARAR] npm ci no checkout de desenvolvimento' -ForegroundColor Cyan
            & $npm ci --no-audit --no-fund
            if ($LASTEXITCODE -ne 0) { throw "npm ci falhou com código $LASTEXITCODE." }
            foreach ($manifest in $manifestHashes.Keys) { if ((Get-FileHash -Algorithm SHA256 -LiteralPath (Join-Path $projectRoot $manifest)).Hash -ne $manifestHashes[$manifest]) { throw "npm ci alterou $manifest; empacotamento bloqueado." } }
            Invoke-Checked 'revalidação das dependências locais' { & $node $packageTool validate-dependencies $projectRoot | Out-Null }
        }
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
            foreach ($required in @('Executar.cmd', 'Executar.ps1', 'LEIA-ME.txt', 'package.json', 'package-lock.json', 'Configuracao/configuracao.ini.example', 'Documentacao/Gerada/Manual-Usuario/index.html', 'Documentacao/Gerada/Manual-Tecnico/index.html')) {
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
