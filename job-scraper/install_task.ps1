# Registers a Windows Scheduled Task that runs the job scraper every 12
# hours, starting now, and again on every system startup/logon in case a
# 12-hour boundary is missed while the machine was off.
#
# Run this once, from an elevated PowerShell prompt, after you've filled in
# job-scraper/.env:
#   powershell -ExecutionPolicy Bypass -File install_task.ps1

$ErrorActionPreference = "Stop"

$TaskName = "JobPortal-Scraper"
$ScriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$PythonExe = Join-Path $ScriptDir ".venv\Scripts\python.exe"
$RunScript = Join-Path $ScriptDir "run.py"

if (-not (Test-Path $PythonExe)) {
  throw "Virtual environment not found at $PythonExe. Run:`n  python -m venv .venv`n  .venv\Scripts\pip install -r requirements.txt`n  .venv\Scripts\python -m playwright install chromium`n  .venv\Scripts\python -m cloakbrowser install`nfrom job-scraper\, then re-run this script."
}

$LogDir = Join-Path $ScriptDir "logs"
New-Item -ItemType Directory -Force -Path $LogDir | Out-Null
$LogFile = Join-Path $LogDir "run.log"

# Task Scheduler discards stdout/stderr unless explicitly redirected - route
# through cmd.exe so every run's output (including tracebacks) is appended
# to logs\run.log for later inspection.
$Action = New-ScheduledTaskAction -Execute "cmd.exe" `
  -Argument "/c `"`"$PythonExe`" `"$RunScript`" >> `"$LogFile`" 2>&1`"" `
  -WorkingDirectory $ScriptDir

$Trigger1 = New-ScheduledTaskTrigger -Once -At (Get-Date) -RepetitionInterval (New-TimeSpan -Hours 12) -RepetitionDuration (New-TimeSpan -Days 3650)
$Trigger2 = New-ScheduledTaskTrigger -AtStartup

$Settings = New-ScheduledTaskSettingsSet -StartWhenAvailable -DontStopOnIdleEnd `
  -ExecutionTimeLimit (New-TimeSpan -Hours 2) -AllowStartIfOnBatteries `
  -DontStopIfGoingOnBatteries

Register-ScheduledTask -TaskName $TaskName `
  -Action $Action `
  -Trigger @($Trigger1, $Trigger2) `
  -Settings $Settings `
  -Description "Scrapes job postings from all configured sources every 12 hours and removes stale/acquired listings. See job-scraper/README.md." `
  -Force

Write-Host "Installed scheduled task '$TaskName' - runs every 12 hours and at startup."
Write-Host "Check status with: Get-ScheduledTask -TaskName '$TaskName' | Get-ScheduledTaskInfo"
Write-Host "Run it immediately with: Start-ScheduledTask -TaskName '$TaskName'"
