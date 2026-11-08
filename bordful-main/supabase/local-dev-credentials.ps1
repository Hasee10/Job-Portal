# Local development credentials for the native PostgreSQL 16 server on 5433.
#
# Run from a NATIVE PowerShell window (not Git Bash - PostgreSQL child
# processes inherit the MSYS environment there and fail with
# STATUS_DLL_INIT_FAILED):
#
#   powershell -ExecutionPolicy Bypass -File .\local-dev-credentials.ps1
#
# Re-runnable: it rotates all three local passwords every time it is run, so
# it doubles as the rotation tool. What it does, and nothing else:
#   1. Rotates the postgres, joblo_local and authenticator passwords.
#   2. Configures the PostgREST authenticator and the three API roles to match
#      hosted Supabase's authorization model.
#   3. Proves the logins work, that role switching works, and that the dev
#      role is confined to the joblo_local database on port 5433.
#   4. Writes the two gitignored local config files that need the passwords.
#
# Passwords are typed interactively and never printed, logged, passed on a
# command line (where the process list would expose them) or placed anywhere
# inside the repository.
#
# -NewPasswordFile <path> supplies the three NEW passwords from a file - one
# per line, in the order postgres, joblo_local, authenticator - instead of
# prompting for each twice. The current superuser password is still always
# typed interactively. The file is overwritten and deleted as soon as it is
# read, must live outside the repository, and exists so a rerun after a
# partial failure does not mean re-entering six prompts by hand.
#
# Nothing here touches the unrelated PostgreSQL server on port 5432.

[CmdletBinding()]
param(
  [string]$NewPasswordFile
)

$ErrorActionPreference = "Stop"

$PgBin     = "D:\PostgreSQL\16\bin"
$PgHost    = "127.0.0.1"
$PgPort    = "5433"
$OtherPort = "5432"
$Db        = "joblo_local"
$ConfDir   = "D:\JobLo-Local-DB"
$EnvFile   = Join-Path $PSScriptRoot "..\.env.local"
$VerifySql = Join-Path $PSScriptRoot "local-dev-verify-api-roles.sql"

$script:Failures = 0
function Check([bool]$ok, [string]$label, [string]$detail = "") {
  if ($ok) { Write-Host "  PASS  $label $detail" }
  else { Write-Host "  FAIL  $label $detail" -ForegroundColor Red; $script:Failures++ }
}

# ---------------------------------------------------------------------------
# Password entry
# ---------------------------------------------------------------------------

function Read-Secret([string]$prompt) {
  $s = Read-Host -Prompt $prompt -AsSecureString
  $bstr = [Runtime.InteropServices.Marshal]::SecureStringToBSTR($s)
  try { return [Runtime.InteropServices.Marshal]::PtrToStringBSTR($bstr) }
  finally { [Runtime.InteropServices.Marshal]::ZeroFreeBSTR($bstr) }
}

# Strength is checked by shape only - the password itself is never echoed and
# never appears in a rejection message.
$MinLength = 12

function Test-Strong([string]$pw) {
  if ($pw.Length -lt $MinLength) { return "must be at least $MinLength characters" }
  $classes = 0
  if ($pw -cmatch "[a-z]") { $classes++ }
  if ($pw -cmatch "[A-Z]") { $classes++ }
  if ($pw -match "[0-9]")  { $classes++ }
  if ($pw -match "[^a-zA-Z0-9]") { $classes++ }
  if ($classes -lt 3) { return "must mix at least three of: lower case, upper case, digits, symbols" }
  return $null
}

# Re-prompts until the entry is acceptable rather than giving up after a fixed
# number of tries: aborting would discard the superuser password already
# entered and force the whole run to start over. Ctrl-C still exits.
# $taken holds the passwords chosen earlier in this run, so a collision is
# caught at the prompt instead of after all three have been typed.
function Read-NewSecret([string]$label, [string[]]$taken) {
  while ($true) {
    $pw = Read-Secret "NEW password for $label"
    $bad = Test-Strong $pw
    if ($bad) { Write-Host "  rejected: $bad" -ForegroundColor Yellow; continue }
    if ($taken -contains $pw) {
      Write-Host "  rejected: must differ from the other passwords set in this run" -ForegroundColor Yellow
      continue
    }
    $again = Read-Secret "confirm password for $label"
    if ($pw -ne $again) { Write-Host "  rejected: entries did not match" -ForegroundColor Yellow; continue }
    return $pw
  }
}

# ---------------------------------------------------------------------------
# Running psql
# ---------------------------------------------------------------------------

# Secret-bearing SQL goes in over stdin, so it never lands on disk and never
# appears in the process arguments. Returns stdout; a non-zero exit throws.
function Invoke-PsqlSecret([string]$user, [string]$database, [string]$sql, [string]$password) {
  $env:PGPASSWORD = $password
  try {
    $out = $sql | & "$PgBin\psql.exe" -h $PgHost -p $PgPort -U $user -d $database `
      -w -A -t -q -v ON_ERROR_STOP=1 --set=client_min_messages=warning -f -
    if ($LASTEXITCODE -ne 0) { throw "psql failed as $user on $database (exit $LASTEXITCODE)" }
    return ($out | Out-String).Trim()
  } finally { Remove-Item Env:PGPASSWORD -ErrorAction SilentlyContinue }
}

# Probe runner for checks whose outcome is the result, including ones EXPECTED
# to fail. Two PowerShell 5.1 traps are handled here deliberately:
#
#  1. Redirecting a native command's stderr inside PowerShell wraps each line
#     in an ErrorRecord, which under $ErrorActionPreference='Stop' turns a
#     successful isolation check into a terminating error. Start-Process
#     writes the child's streams to files instead, so stderr never reaches
#     PowerShell's error stream.
#  2. Start-Process does NOT quote the elements of -ArgumentList. Passing
#     @("-c", "select 1") sends psql '-c' 'select' '1', so the command fails
#     with a syntax error and a non-zero exit - which an "expected to fail"
#     check happily reads as proof of denial. A check that passes for the
#     wrong reason is worse than no check, so the SQL goes in a file (it is
#     never secret - secrets use Invoke-PsqlSecret and stdin) and the
#     argument string is built with explicit quoting.
function Invoke-PsqlProbe([string]$user, [string]$database, [string]$port, [string]$sql, [string]$password) {
  $env:PGPASSWORD = $password
  $outFile = [IO.Path]::GetTempFileName()
  $errFile = [IO.Path]::GetTempFileName()
  $sqlFile = [IO.Path]::GetTempFileName()
  try {
    Set-Content -Path $sqlFile -Value $sql -Encoding ascii
    $psqlArgs = "-h $PgHost -p $port -U `"$user`" -d `"$database`" -w -A -t -q -v ON_ERROR_STOP=1 -f `"$sqlFile`""
    $p = Start-Process -FilePath "$PgBin\psql.exe" -ArgumentList $psqlArgs `
      -NoNewWindow -Wait -PassThru `
      -RedirectStandardOutput $outFile -RedirectStandardError $errFile
    $err = Get-Content $errFile -Raw -ErrorAction SilentlyContinue
    $firstErr = ($err -split "\r?\n" | Where-Object { $_ -match "\S" } | Select-Object -First 1)
    $stdout = Get-Content $outFile -Raw -ErrorAction SilentlyContinue
    return @{
      ExitCode = $p.ExitCode
      Out      = ($stdout | Out-String).Trim()
      Err      = $firstErr
    }
  } finally {
    Remove-Item Env:PGPASSWORD -ErrorAction SilentlyContinue
    Remove-Item $outFile, $errFile, $sqlFile -Force -ErrorAction SilentlyContinue
  }
}

# PostgreSQL single-quoted literal: double any embedded quote.
function Sql-Lit([string]$v) { "'" + $v.Replace("'", "''") + "'" }

# Set-Content -Encoding utf8 writes a BOM in Windows PowerShell 5.1, and the
# consumers of these two files are not PowerShell. PostgREST treats the BOM
# as part of the first config key and fails to start; a dotenv parser reads
# the first variable's name as "﻿SUPABASE_URL", so SUPABASE_URL looks
# unset rather than wrong - a silent skip instead of a visible error. Both
# files are plain ASCII, so BOM-less UTF-8 is simply correct here.
function Write-Utf8NoBom([string]$path, [string]$text) {
  [IO.File]::WriteAllText($path, $text, (New-Object Text.UTF8Encoding $false))
}

function Base64Url([byte[]]$bytes) {
  [Convert]::ToBase64String($bytes).TrimEnd("=").Replace("+", "-").Replace("/", "_")
}

function New-Jwt([string]$role, [string]$secret) {
  $hdr  = Base64Url ([Text.Encoding]::UTF8.GetBytes('{"alg":"HS256","typ":"JWT"}'))
  $iat  = [DateTimeOffset]::UtcNow.ToUnixTimeSeconds()
  $exp  = $iat + 315360000
  $body = Base64Url ([Text.Encoding]::UTF8.GetBytes(
    '{"role":"' + $role + '","iss":"joblo-local","iat":' + $iat + ',"exp":' + $exp + '}'))
  $hmac = [Security.Cryptography.HMACSHA256]::new([Text.Encoding]::UTF8.GetBytes($secret))
  try { $sig = Base64Url ($hmac.ComputeHash([Text.Encoding]::UTF8.GetBytes("$hdr.$body"))) }
  finally { $hmac.Dispose() }
  return "$hdr.$body.$sig"
}

# ---------------------------------------------------------------------------
# 0. Server reachable, and it is the right server
# ---------------------------------------------------------------------------

Write-Host "== local PostgreSQL on ${PgHost}:${PgPort} =="
& "$PgBin\pg_isready.exe" -h $PgHost -p $PgPort
if ($LASTEXITCODE -ne 0) {
  throw "Server not accepting connections on $PgPort. Start it first with pg_ctl -D $ConfDir start"
}

$currentSuper = Read-Secret "CURRENT postgres superuser password (port $PgPort)"

# Probe before doing anything, so a wrong password gives a useful message
# instead of failing later in the run. This is the first thing a re-run after
# a partial failure hits: if an earlier run did rotate the password, the one
# to enter here is that NEW password, not the original.
$probe = Invoke-PsqlProbe "postgres" $Db $PgPort "select current_database() || ' @ ' || current_setting('port');" $currentSuper
if ($probe.ExitCode -ne 0) {
  throw "Cannot authenticate as postgres on $PgPort.`n" +
        "  $($probe.Err)`n" +
        "If an earlier run of this script got as far as '== configuring roles ==',`n" +
        "the password has already been rotated - enter the NEW one instead."
}
$target = $probe.Out
Write-Host "connected to: $target"
if ($target -ne "$Db @ $PgPort") { throw "Refusing to continue: expected '$Db @ $PgPort', got '$target'." }

# ---------------------------------------------------------------------------
# 1. New passwords
# ---------------------------------------------------------------------------

Write-Host ""
Write-Host "== new passwords =="

if ($NewPasswordFile) {
  if (-not (Test-Path $NewPasswordFile)) { throw "No such password file: $NewPasswordFile" }
  $repoRoot = (Resolve-Path (Join-Path $PSScriptRoot "..\..")).Path
  $given = (Resolve-Path $NewPasswordFile).Path
  if ($given.StartsWith($repoRoot, [StringComparison]::OrdinalIgnoreCase)) {
    throw "Refusing to read passwords from inside the repository: $given"
  }

  $lines = @(Get-Content $NewPasswordFile | Where-Object { $_ -match "\S" })
  # Shred before anything can fail later in the run: overwrite the bytes in
  # place, then unlink. Deleting alone would leave the plaintext recoverable.
  try {
    $len = (Get-Item $NewPasswordFile).Length
    [IO.File]::WriteAllBytes($NewPasswordFile, [byte[]]::new($len))
  } catch { }
  Remove-Item $NewPasswordFile -Force -ErrorAction SilentlyContinue
  Write-Host "read three passwords from the supplied file, which has been shredded"

  if ($lines.Count -ne 3) { throw "Expected exactly 3 non-blank lines (postgres, joblo_local, authenticator); got $($lines.Count)." }
  $superPw, $appPw, $authPw = $lines
  $labels = @("the postgres superuser", "the joblo_local app role", "the PostgREST authenticator role")
  for ($i = 0; $i -lt 3; $i++) {
    $bad = Test-Strong $lines[$i]
    if ($bad) { throw "Password for $($labels[$i]) $bad" }
  }
  if (($superPw -eq $appPw) -or ($superPw -eq $authPw) -or ($appPw -eq $authPw)) {
    throw "The three passwords must all be different."
  }
  Write-Host "all three passed the strength and distinctness checks"
} else {
  Write-Host "Each must be at least $MinLength characters, mix at least three of"
  Write-Host "lower case / upper case / digits / symbols, and differ from the other two."
  Write-Host "Each is typed twice. Nothing is echoed. Ctrl-C to abort."
  Write-Host ""
  $superPw = Read-NewSecret "the postgres superuser" @()
  $appPw   = Read-NewSecret "the joblo_local app role" @($superPw)
  $authPw  = Read-NewSecret "the PostgREST authenticator role" @($superPw, $appPw)
}

# ---------------------------------------------------------------------------
# 2. Roles, privileges and database isolation
# ---------------------------------------------------------------------------

Write-Host ""
Write-Host "== configuring roles =="
$dollar = '$'
# One transaction for the whole batch. Role changes are transactional in
# PostgreSQL, so either all three passwords and every grant land together or
# none do - there is no half-rotated state for a re-run to untangle.
$sql = @"
begin;

alter role postgres     with password $(Sql-Lit $superPw);
alter role joblo_local  with password $(Sql-Lit $appPw);

do ${dollar}${dollar}
begin
  if not exists (select 1 from pg_roles where rolname = 'authenticator') then
    create role authenticator noinherit login;
  end if;
end
${dollar}${dollar};

-- NOINHERIT is the point: the authenticator holds no privileges of its own
-- and can only act by switching into one of the three API roles, which is
-- exactly what PostgREST does per request from the JWT's role claim.
alter role authenticator with noinherit login password $(Sql-Lit $authPw);
grant anon, authenticated, service_role to authenticator;
grant connect on database $Db to authenticator;

-- Hosted Supabase gives service_role the BYPASSRLS attribute, and the
-- migrations depend on it: they enable RLS with zero policies and route all
-- real access through the service_role client. A stock PostgreSQL server has
-- no such attribute, so without this line every service_role query would
-- return zero rows instead of working, and the local stack would not
-- reproduce production behaviour.
alter role service_role with bypassrls;

-- Minimum effective privileges. anon and authenticated get schema usage so
-- PostgREST can introspect, and nothing else: the migrations revoke their
-- table grants, which is what denies unauthenticated access to private
-- organizations. service_role gets the table privileges hosted Supabase
-- provisions by default and no migration grants.
grant usage on schema public to anon, authenticated, service_role;
revoke create on schema public from anon, authenticated, service_role;
grant all on all tables in schema public to service_role;
grant all on all sequences in schema public to service_role;
alter default privileges in schema public grant all on tables to service_role;
alter default privileges in schema public grant all on sequences to service_role;

-- Confine the development role to its own database. PostgreSQL grants
-- CONNECT on every database to PUBLIC by default, which is why joblo_local
-- could open the unrelated 'postgres' database in this cluster. Revoking the
-- PUBLIC grant closes that; superusers are unaffected, and this is the
-- isolated 5433 cluster only - the server on $OtherPort is never touched.
revoke connect on database postgres from public;
revoke connect on database $Db from public;
grant connect on database $Db to joblo_local;

commit;
"@
# Authenticate with the password the server has NOW ($currentSuper), not the
# one this batch is about to set. Using $superPw here was the bug that failed
# at this exact point: the connection was opened with a password that did not
# exist yet, so the rotation never ran at all.
Invoke-PsqlSecret "postgres" $Db $sql $currentSuper | Out-Null
Write-Host "roles configured"

# ---------------------------------------------------------------------------
# 3. Local config files
#
# Written as soon as the rotation has committed, before the checks below: a
# failing check should leave a usable environment behind, not a rotated
# password with no config that knows it.
# ---------------------------------------------------------------------------

Write-Host ""
Write-Host "== local config =="
$rng = [Security.Cryptography.RandomNumberGenerator]::Create()
try {
  $buf = [byte[]]::new(48); $rng.GetBytes($buf); $jwtSecret = Base64Url $buf
  $buf = [byte[]]::new(32); $rng.GetBytes($buf); $authSecret = [Convert]::ToBase64String($buf)
  $buf = [byte[]]::new(32); $rng.GetBytes($buf)
  $cronSecret = [BitConverter]::ToString($buf).Replace("-", "").ToLower()
} finally { $rng.Dispose() }

$anonKey    = New-Jwt "anon" $jwtSecret
$serviceKey = New-Jwt "service_role" $jwtSecret

# PostgREST's config carries the authenticator password and the JWT secret, so
# it lives outside the repository - no secret is ever inside the working tree,
# not even transiently.
$conf = @"
# Generated by supabase/local-dev-credentials.ps1 - local development only.
# Regenerated on every run; edit the script, not this file.
db-uri = "postgres://authenticator:$([Uri]::EscapeDataString($authPw))@${PgHost}:${PgPort}/${Db}"
db-schemas = "public"
db-anon-role = "anon"
db-pool = 4
jwt-secret = "$jwtSecret"
server-host = "127.0.0.1"
server-port = 3001
"@
$confPath = Join-Path $ConfDir "postgrest.conf"
Write-Utf8NoBom $confPath $conf
Check (Test-Path $confPath) "wrote $confPath (UTF-8, no BOM)"

$envText = @"
# Generated by supabase/local-dev-credentials.ps1 - LOCAL development only.
# SUPABASE_URL points at the localhost gateway in front of standalone
# PostgREST (supabase/local-rest-gateway.mjs), never at hosted Supabase.
SUPABASE_URL=http://127.0.0.1:3002
SUPABASE_ANON_KEY=$anonKey
SUPABASE_SERVICE_ROLE_KEY=$serviceKey

AUTH_SECRET=$authSecret
NEXTAUTH_URL=http://localhost:3000
NEXT_PUBLIC_APP_URL=http://localhost:3000
CRON_SECRET=$cronSecret
"@
if (Test-Path $EnvFile) { Copy-Item $EnvFile "$EnvFile.bak" -Force }
Write-Utf8NoBom $EnvFile $envText
Check (Test-Path $EnvFile) "wrote bordful-main/.env.local (UTF-8, no BOM)"

# ---------------------------------------------------------------------------
# 4. Logins work with the new passwords
# ---------------------------------------------------------------------------

Write-Host ""
Write-Host "== logins =="
$who = Invoke-PsqlSecret "postgres" $Db "select current_user || ' -> ' || current_database();" $superPw
Check ($who -eq "postgres -> $Db") "postgres login after rotation" "($who)"
$who = Invoke-PsqlSecret "joblo_local" $Db "select current_user || ' -> ' || current_database();" $appPw
Check ($who -eq "joblo_local -> $Db") "joblo_local login after rotation" "($who)"
$who = Invoke-PsqlSecret "authenticator" $Db "select current_user || ' -> ' || current_database();" $authPw
Check ($who -eq "authenticator -> $Db") "authenticator login after rotation" "($who)"

# ---------------------------------------------------------------------------
# 5. Effective role switching, the way PostgREST actually does it
# ---------------------------------------------------------------------------

Write-Host ""
Write-Host "== authenticator role switching (inside a transaction, as PostgREST does) =="
foreach ($role in @("anon", "authenticated", "service_role")) {
  # SET LOCAL only has an effect inside a transaction block. Run bare, as the
  # previous version did, PostgreSQL discards it with a warning and
  # current_user never changes - so the check passed while proving nothing.
  # The explicit begin/commit is what makes this a real test.
  $sql = "begin; set local role $role; select current_user; commit;"
  $got = Invoke-PsqlSecret "authenticator" $Db $sql $authPw
  Check ($got -eq $role) "authenticator -> $role" "(current_user = $got)"
}

# Confirm the switch is genuinely scoped: outside the transaction the session
# is the authenticator again, which is what makes connection pooling safe.
$after = Invoke-PsqlSecret "authenticator" $Db "begin; set local role service_role; commit; select current_user;" $authPw
Check ($after -eq "authenticator") "role resets after the transaction" "(current_user = $after)"

# A denial has to be denied FOR THE RIGHT REASON. "could not connect to
# server" also exits non-zero, so a stopped server would otherwise be read as
# proof of isolation - which matters most for the port-5432 check, the one
# server this project must never touch and also the one most likely to be
# down. Anything that is not a recognised refusal is reported as inconclusive
# rather than counted as a pass.
$DeniedPattern = "password authentication failed|permission denied|does not exist|not permitted|no pg_hba.conf entry"

function Check-Denied($probe, [string]$label) {
  if ($probe.ExitCode -eq 0) {
    Check $false $label "- CONNECTED, but should have been refused"
    return
  }
  if ($probe.Err -match $DeniedPattern) {
    Check $true $label "($($probe.Err))"
    return
  }
  Check $false $label "- INCONCLUSIVE, not a refusal: $($probe.Err)"
}

# NOINHERIT means the authenticator itself reaches nothing until it switches.
$probe = Invoke-PsqlProbe "authenticator" $Db $PgPort "select 1 from public.organizations limit 1;" $authPw
Check-Denied $probe "authenticator has no table access of its own"

# ---------------------------------------------------------------------------
# 6. Database isolation
# ---------------------------------------------------------------------------

Write-Host ""
Write-Host "== database isolation =="
$probe = Invoke-PsqlProbe "joblo_local" "postgres" $PgPort "select 1;" $appPw
Check-Denied $probe "joblo_local denied the 'postgres' database on $PgPort"

$probe = Invoke-PsqlProbe "joblo_local" "postgres" $OtherPort "select 1;" $appPw
Check-Denied $probe "joblo_local denied the unrelated server on $OtherPort"

$probe = Invoke-PsqlProbe "joblo_local" $Db $PgPort "select 1;" $appPw
Check ($probe.ExitCode -eq 0) "joblo_local still reaches its own database" "($($probe.Err))"

# ---------------------------------------------------------------------------
# 7. API role privileges and RLS
# ---------------------------------------------------------------------------

if (Test-Path $VerifySql) {
  Write-Host ""
  Write-Host "== API role privileges and RLS =="
  $env:PGPASSWORD = $superPw
  try {
    & "$PgBin\psql.exe" -h $PgHost -p $PgPort -U postgres -d $Db -w -v ON_ERROR_STOP=1 -f $VerifySql
    Check ($LASTEXITCODE -eq 0) "privilege and RLS verification script completed"
  } finally { Remove-Item Env:PGPASSWORD -ErrorAction SilentlyContinue }
}

Write-Host ""
if ($script:Failures -gt 0) {
  Write-Host "$($script:Failures) check(s) FAILED." -ForegroundColor Red
  exit 1
}
Write-Host "All checks passed. Nothing above printed a password." -ForegroundColor Green
Write-Host "Next:  powershell -ExecutionPolicy Bypass -File .\local-postgrest-start.ps1"
