# Start standalone PostgREST against the local joblo_local database.
#
#   powershell -ExecutionPolicy Bypass -File .\local-postgrest-start.ps1
#
# PostgREST's official Windows build links libpq.dll DYNAMICALLY (everything
# else in it is static). Without libpq on PATH the process dies at load time
# with STATUS_DLL_INIT_FAILED (0xC0000142) and prints nothing at all, which
# looks like a crash but is just an unresolved import. The installed
# PostgreSQL 16 client library is the right one to use - same major version
# as the server it connects to - so it is added to PATH for this process
# only. Nothing system-wide changes.
#
# Config, including the authenticator password and JWT secret, lives at
# D:\JobLo-Local-DB\postgrest.conf, outside the repository, and is written by
# local-dev-credentials.ps1.

$ErrorActionPreference = "Stop"

$PgBin    = "D:\PostgreSQL\16\bin"
$Exe      = "D:\PostgREST-16\postgrest.exe"
$ConfPath = "D:\JobLo-Local-DB\postgrest.conf"

foreach ($p in @($Exe, $ConfPath, "$PgBin\libpq.dll")) {
  if (-not (Test-Path $p)) { throw "Missing: $p" }
}

$env:PATH = "$PgBin;" + $env:PATH

Write-Host "PostgREST:" (& $Exe --version)
Write-Host "config:   $ConfPath"
Write-Host "Ctrl-C to stop."
Write-Host ""

& $Exe $ConfPath
