@echo off
rem Atalho para Windows: duplo clique roda o iniciar.ps1 sem mexer na política do PowerShell.
powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0iniciar.ps1"
