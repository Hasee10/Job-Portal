# Removes the scheduled task created by install_task.ps1.
#   powershell -ExecutionPolicy Bypass -File uninstall_task.ps1

$TaskName = "JobPortal-Scraper"
Unregister-ScheduledTask -TaskName $TaskName -Confirm:$false
Write-Host "Removed scheduled task '$TaskName'."
