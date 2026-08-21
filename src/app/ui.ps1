function Invoke-MeminifyBridge {
    param([hashtable]$Request)
    $json = $Request | ConvertTo-Json -Depth 30 -Compress
    $result = $json | & $script:NodeExecutable $script:BridgePath 2>$null
    if ($LASTEXITCODE -ne 0 -and [string]::IsNullOrWhiteSpace(($result -join ''))) {
        return [pscustomobject]@{ ok = $false; diagnostic = [pscustomobject]@{ code = 'BRIDGE_FAILED'; message = 'A aplicação Node não retornou uma resposta estruturada.' } }
    }
    try { return (($result -join [Environment]::NewLine) | ConvertFrom-Json) }
    catch { return [pscustomobject]@{ ok = $false; diagnostic = [pscustomobject]@{ code = 'INVALID_BRIDGE_RESPONSE'; message = 'A resposta da aplicação Node é inválida.' } } }
}

function Show-Mensagem {
    param([string]$Text, [ConsoleColor]$Color = [ConsoleColor]::White)
    Write-Host $Text -ForegroundColor $Color
}

function Confirmar-Acao {
    param([string]$Question)
    return ((Read-Host "$Question (s/N)").Trim().ToLowerInvariant() -eq 's')
}

function Show-Analysis {
    param($Analysis)
    Show-Mensagem "`nEscopo efetivo" Cyan
    Show-Mensagem "Modo: $($Analysis.outputMode) | Perfil: $($Analysis.profile) | Risco do perfil: $($Analysis.profileRisk)"
    Show-Mensagem "Risco estimado da execução: ainda não disponível; não é risco zero." Yellow
    foreach ($source in $Analysis.sources) { Show-Mensagem "Origem $($source.id): $($source.path) | Recursivo: $($source.recursive)" Cyan }
    Show-Mensagem "Encontrados: $($Analysis.counts.found) | Elegíveis: $($Analysis.counts.eligible) | Ignorados: $($Analysis.counts.ignored)"
    if ($Analysis.conflicts.Count -gt 0) {
        Show-Mensagem 'Conflitos de destinos .min:' Yellow
        foreach ($conflict in $Analysis.conflicts) { Show-Mensagem "- $($conflict.destinationPath)" Yellow }
    }
    if ($Analysis.diagnostics.blockers.Count -gt 0) {
        Show-Mensagem 'Bloqueios:' Red
        foreach ($blocker in $Analysis.diagnostics.blockers) { Show-Mensagem "- $($blocker.code): $($blocker.message)" Red }
    }
    if ($Analysis.diagnostics.warnings.Count -gt 0) {
        Show-Mensagem 'Avisos:' Yellow
        foreach ($warning in $Analysis.diagnostics.warnings) { Show-Mensagem "- $($warning.message)" Yellow }
    }
}

function Invoke-Analyze {
    param([hashtable]$Adjustments)
    $request = @{ command = 'analyze'; adjustments = $Adjustments; riskAssessment = @{ authorized = $false; status = 'unavailable'; reason = 'EXECUTION_RISK_ALGORITHM_PENDING' } }
    $response = Invoke-MeminifyBridge $request
    if (-not $response.ok) {
        $message = if ($response.diagnostic) { $response.diagnostic.message } else { $response.message }
        Show-Mensagem "Erro: $message" Red
        return $null
    }
    Show-Analysis $response.analysis
    return $response.analysis
}

function Show-Artefatos {
    param([ValidateSet('reports', 'logs')][string]$Kind)
    $response = Invoke-MeminifyBridge @{ command = 'list-artifacts'; kind = $Kind }
    if (-not $response.ok) { Show-Mensagem "Erro: $($response.diagnostic.message)" Red; return }
    if ($response.names.Count -eq 0) { Show-Mensagem $(if ($Kind -eq 'reports') { 'Nenhum relatório operacional disponível.' } else { 'Nenhum log técnico disponível.' }) Yellow; return }
    Show-Mensagem $(if ($Kind -eq 'reports') { 'Relatórios operacionais:' } else { 'Logs técnicos:' }) Cyan
    for ($index = 0; $index -lt $response.names.Count; $index++) { Write-Host "$($index + 1). $($response.names[$index])" }
    $selected = (Read-Host 'Número para visualizar; Enter cancela').Trim()
    if (-not $selected) { Show-Mensagem 'Visualização cancelada.' Yellow; return }
    $number = 0
    if (-not [int]::TryParse($selected, [ref]$number) -or $number -lt 1 -or $number -gt $response.names.Count) { Show-Mensagem 'Seleção inválida; nenhum arquivo foi alterado.' Yellow; return }
    $content = Invoke-MeminifyBridge @{ command = 'read-artifact'; kind = $Kind; name = $response.names[$number - 1] }
    if ($content.ok) { Show-Mensagem "`n$($content.content)" White } else { Show-Mensagem "Erro: $($content.diagnostic.message)" Red }
}

function Start-MeminifyUi {
    $script:TemporaryAdjustments = @{}
    while ($true) {
        Write-Host "`n=== Meminify ===" -ForegroundColor Cyan
        Write-Host '1. Analisar arquivos'
        Write-Host '2. Minificar'
        Write-Host '3. Ajustar somente esta execução'
        Write-Host '4. Configurações'
        Write-Host '5. Backups e restauração'
        Write-Host '6. Relatórios'
        Write-Host '7. Logs técnicos'
        Write-Host '0. Sair'
        $choice = (Read-Host 'Escolha').Trim()
        try {
            switch ($choice) {
                '1' { [void](Invoke-Analyze $script:TemporaryAdjustments) }
                '2' {
                    $analysis = Invoke-Analyze $script:TemporaryAdjustments
                    if ($null -eq $analysis -or $analysis.status -ne 'ready') { Show-Mensagem 'A minificação foi bloqueada pela pré-análise.' Red; break }
                    if ($analysis.riskAssessment.status -eq 'unavailable' -and -not (Confirmar-Acao 'A autorização de risco da execução ainda não possui estimativa implementada. Autorizar explicitamente esta execução')) { Show-Mensagem 'Execução cancelada.' Yellow; break }
                    if (-not (Confirmar-Acao 'Confirmar a minificação do escopo exibido')) { Show-Mensagem 'Execução cancelada.' Yellow; break }
                    $overwrite = $true
                    if ($analysis.conflicts.Count -gt 0) { $overwrite = Confirmar-Acao 'Autorizar globalmente a sobrescrita de todos os destinos .min listados' }
                    if (-not $overwrite) { Show-Mensagem 'Execução cancelada; nenhum arquivo foi alterado.' Yellow; break }
                    $response = Invoke-MeminifyBridge @{ command = 'execute'; adjustments = $script:TemporaryAdjustments; confirmed = $true; authorizeOverwriteConflicts = $true; riskAssessment = @{ authorized = $true; status = 'explicitly-authorized'; reason = 'USER_CONFIRMATION_WITHOUT_EXECUTION_RISK_ESTIMATE' } }
                    if ($response.ok -and $response.result.status -eq 'completed') { Show-Mensagem 'Minificação concluída.' Green } elseif ($response.ok -and $response.result.status -eq 'cancelled') { Show-Mensagem 'Execução cancelada.' Yellow } else { Show-Mensagem "Falha: $($response.diagnostic.message)" Red }
                }
                '3' {
                    $mode = Read-Host 'Modo temporário (vazio mantém o persistente; BackupESobrescreverOriginais ou PreservarOriginaisECriarMinificados)'
                    if ($mode) { $script:TemporaryAdjustments.outputMode = $mode; Show-Mensagem 'Ajuste mantido somente nesta execução.' Green }
                }
                '4' {
                    $summary = Invoke-MeminifyBridge @{ command = 'summary' }
                    if ($summary.ok -and $summary.configuration) { $summary.configuration | ConvertTo-Json -Depth 10 | Write-Host }
                    elseif ($summary.code -eq 'CONFIGURATION_MISSING') {
                        Show-Mensagem "Configuração ausente: $($summary.configurationPath)" Yellow
                        if (Confirmar-Acao 'Criar a configuração a partir do modelo, sem sobrescrever arquivo existente') { Show-Mensagem ((Invoke-MeminifyBridge @{ command = 'create-configuration'; confirmed = $true }).configurationPath) Green }
                    } else { Show-Mensagem "Erro de configuração: $($summary.diagnostic.message)" Red }
                }
                '5' { Show-Mensagem 'Backups e restauração ainda não disponível.' Yellow }
                '6' { Show-Artefatos reports }
                '7' { Show-Artefatos logs }
                '0' { return }
                default { Show-Mensagem 'Opção inválida; nenhuma ação foi executada.' Yellow }
            }
        } catch [System.Management.Automation.PipelineStoppedException] { Show-Mensagem 'Operação cancelada.' Yellow }
          catch { Show-Mensagem "Operação bloqueada: $($_.Exception.Message)" Red }
    }
}
