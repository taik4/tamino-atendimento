# Windows: renova sessões, sobe o painel, abre o navegador e o Claude Code.
$ErrorActionPreference = "Continue"
[Console]::OutputEncoding = [Text.Encoding]::UTF8
Set-Location $PSScriptRoot
$dados = Join-Path $env:LOCALAPPDATA "tamino-atendimento"
New-Item -ItemType Directory -Force -Path $dados | Out-Null
$log = Join-Path $dados "painel.log"

function PainelNoAr { try { Invoke-WebRequest -UseBasicParsing -TimeoutSec 2 http://127.0.0.1:8765/ | Out-Null; $true } catch { $false } }

Write-Host "== Atendimento Tamino =="
Write-Host "-> Renovando sessões..."
uv run -q renovar.py
if ($LASTEXITCODE -ne 0) {
    Write-Host "`nSessão expirada. Vai abrir uma janela: faça login no Tamino e no Evo e volte aqui."
    uv run -q renovar.py login
    if ($LASTEXITCODE -ne 0) { Read-Host "Login falhou. Enter para sair"; exit 1 }
}
uv run -q app.py checar

if (PainelNoAr) {
    Write-Host "-> Painel já estava rodando."
} else {
    Write-Host "-> Subindo o painel (log: $log)..."
    Start-Process -WindowStyle Hidden -FilePath "uv" -ArgumentList "run","-q","app.py","painel" `
        -RedirectStandardOutput $log -RedirectStandardError "$log.err"
    for ($i = 0; $i -lt 30 -and -not (PainelNoAr); $i++) { Start-Sleep 1 }
}

Write-Host "-> Abrindo o painel e o Evo no navegador..."
Start-Process "http://127.0.0.1:8765"
$evo = if ($env:EVO_WEB) { $env:EVO_WEB } else { "https://evo.dlip.com.br" }
Start-Process "$evo/conversations"

if (Get-Command claude -ErrorAction SilentlyContinue) {
    Write-Host "-> Abrindo Claude Code... (o painel continua rodando ao fechar)"
    claude
}
