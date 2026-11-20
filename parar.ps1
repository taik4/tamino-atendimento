# Windows: para o painel/vigia (processo escutando na porta 8765).
$c = Get-NetTCPConnection -LocalPort 8765 -State Listen -ErrorAction SilentlyContinue
if ($c) { $c | ForEach-Object { Stop-Process -Id $_.OwningProcess -Force }; Write-Host "Painel parado." }
else { Write-Host "Painel não estava rodando." }
