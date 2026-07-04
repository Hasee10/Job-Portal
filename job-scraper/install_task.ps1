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
$PythonExe = (Get-Command python).Source
$RunScript = Join-Path $ScriptDir "run.py"

$Action = New-ScheduledTaskAction -Execute $PythonExe -Argument "`"$RunScript`"" -WorkingDirectory $ScriptDir

$Trigger1 = New-ScheduledTaskTrigger -Once -At (Get-Date) -RepetitionInterval (New-TimeSpan -Hours 12) -RepetitionDuration ([TimeSpan]::MaxValue)
$Trigger2 = New-ScheduledTaskTrigger -AtStartup

$Settings = New-ScheduledTaskSettingsSet -StartWhenAvailable -DontStopOnIdleEnd -ExecutionTimeLimit (New-TimeSpan -Hours 2)

Register-ScheduledTask -TaskName $TaskName `
  -Action $Action `
  -Trigger @($Trigger1, $Trigger2) `
  -Settings $Settings `
  -Description "Scrapes job postings from all configured sources every 12 hours and removes stale/acquired listings. See job-scraper/README.md." `
  -Force

Write-Host "Installed scheduled task '$TaskName' - runs every 12 hours and at startup."
Write-Host "Check status with: Get-ScheduledTask -TaskName '$TaskName' | Get-ScheduledTaskInfo"
Write-Host "Run it immediately with: Start-ScheduledTask -TaskName '$TaskName'"
