$ErrorActionPreference = "Stop"

$email = Read-Host "Administrator email"
if ($email -notmatch '^[^@\s]+@[^@\s]+\.[^@\s]+$') {
    throw "Enter a valid administrator email address."
}

$securePassword = Read-Host "Administrator password (input is hidden; leave blank only to promote an existing account)" -AsSecureString
$secureConfirmation = Read-Host "Confirm password" -AsSecureString

function ConvertTo-PlainText([Security.SecureString]$Value) {
    $pointer = [Runtime.InteropServices.Marshal]::SecureStringToBSTR($Value)
    try {
        [Runtime.InteropServices.Marshal]::PtrToStringBSTR($pointer)
    } finally {
        [Runtime.InteropServices.Marshal]::ZeroFreeBSTR($pointer)
    }
}

$password = ConvertTo-PlainText $securePassword
$confirmation = ConvertTo-PlainText $secureConfirmation
if ($password -cne $confirmation) {
    $password = $null
    $confirmation = $null
    throw "Passwords do not match."
}

$projectRoot = Split-Path -Parent $PSScriptRoot
$processInfo = [Diagnostics.ProcessStartInfo]::new("node")
$processInfo.WorkingDirectory = $projectRoot
$processInfo.UseShellExecute = $false
$processInfo.RedirectStandardInput = $true
$processInfo.Arguments = 'scripts/setup-admin-stdin.mjs "{0}"' -f $email

$process = [Diagnostics.Process]::Start($processInfo)
try {
    $process.StandardInput.WriteLine($password)
    $process.StandardInput.Close()
    $password = $null
    $confirmation = $null
    $process.WaitForExit()
    if ($process.ExitCode -ne 0) {
        throw "Administrator setup failed. Check MarcFlow/.env and ensure MySQL is available."
    }
} finally {
    $process.Dispose()
    $securePassword.Dispose()
    $secureConfirmation.Dispose()
}
