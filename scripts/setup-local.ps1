param(
    [switch]$Force
)

$ErrorActionPreference = "Stop"
$projectRoot = Split-Path -Parent $PSScriptRoot
$envPath = Join-Path $projectRoot ".env"
$examplePath = Join-Path $projectRoot ".env.example"

if (-not (Test-Path -LiteralPath $examplePath -PathType Leaf)) {
    throw "MarcFlow .env.example was not found."
}

if ((Test-Path -LiteralPath $envPath -PathType Leaf) -and -not $Force) {
    throw "MarcFlow/.env already exists. Back it up and rerun with -Force only if you intend to replace it."
}

if (-not (Test-Path (Join-Path $projectRoot "node_modules"))) {
    throw "MarcFlow dependencies are missing. Run npm run marcflow:install first."
}

$dbHost = Read-Host "MySQL host [127.0.0.1]"
if ([string]::IsNullOrWhiteSpace($dbHost)) {
    $dbHost = "127.0.0.1"
}
if ($dbHost -match '[/@?#\s"]') {
    throw "Enter a hostname or IP address, not a URL."
}

$portInput = Read-Host "MySQL port [3306]"
$dbPort = 3306
if (-not [string]::IsNullOrWhiteSpace($portInput) -and
    (-not [int]::TryParse($portInput, [ref]$dbPort) -or $dbPort -lt 1 -or $dbPort -gt 65535)) {
    throw "MySQL port must be an integer between 1 and 65535."
}

$databaseName = Read-Host "Existing empty MySQL database name [marcflow]"
if ([string]::IsNullOrWhiteSpace($databaseName)) {
    $databaseName = "marcflow"
}
if ($databaseName -notmatch '^[A-Za-z][A-Za-z0-9_]{0,63}$') {
    throw "Database name must start with a letter and contain only letters, numbers, or underscores."
}

$databaseUser = Read-Host "MySQL username"
if ([string]::IsNullOrWhiteSpace($databaseUser) -or $databaseUser -match '[/@?#\s"]') {
    throw "Enter a valid MySQL username."
}

$secureDatabasePassword = Read-Host "MySQL password (input is hidden)" -AsSecureString
$passwordPointer = [IntPtr]::Zero
try {
    $passwordPointer = [Runtime.InteropServices.Marshal]::SecureStringToBSTR($secureDatabasePassword)
    $databasePassword = [Runtime.InteropServices.Marshal]::PtrToStringBSTR($passwordPointer)
} finally {
    if ($passwordPointer -ne [IntPtr]::Zero) {
        [Runtime.InteropServices.Marshal]::ZeroFreeBSTR($passwordPointer)
    }
}
if ([string]::IsNullOrEmpty($databasePassword)) {
    throw "A MySQL password is required. Use a dedicated database user, not the root account."
}

$client = [System.Net.Sockets.TcpClient]::new()
try {
    $connectTask = $client.ConnectAsync($dbHost, $dbPort)
    if (-not $connectTask.Wait(3000)) {
        throw "Timed out connecting to MySQL at ${dbHost}:$dbPort. Start MySQL and rerun setup."
    }
    $connectTask.GetAwaiter().GetResult()
} catch {
    throw "Could not connect to MySQL at ${dbHost}:$dbPort. Start MySQL and rerun setup. $($_.Exception.Message)"
} finally {
    $client.Dispose()
}

$baseUrl = "http://127.0.0.1:3030"
$hostForUrl = if ($dbHost.Contains(":") -and -not $dbHost.StartsWith("[")) { "[$dbHost]" } else { $dbHost }
$databaseUrl = "mysql://{0}:{1}@{2}:{3}/{4}" -f `
    [Uri]::EscapeDataString($databaseUser), `
    [Uri]::EscapeDataString($databasePassword), `
    $hostForUrl, $dbPort, $databaseName
function New-RandomSecret {
    $bytes = New-Object byte[] 32
    $generator = [Security.Cryptography.RandomNumberGenerator]::Create()
    try {
        $generator.GetBytes($bytes)
        return [Convert]::ToBase64String($bytes)
    } finally {
        $generator.Dispose()
        [Array]::Clear($bytes, 0, $bytes.Length)
    }
}

$authSecret = New-RandomSecret

$content = [IO.File]::ReadAllText($examplePath)
$settings = [ordered]@{
    PORT = "3030"
    DATABASE_URL = $databaseUrl
    AUTH_SECRET = $authSecret
    BASE_URL = $baseUrl
    NODE_ENV = "development"
    HOSTNAME = "127.0.0.1"
    NEXTAUTH_URL = $baseUrl
    AUTH_TRUST_HOST = "true"
    NEXT_PUBLIC_APP_URL = $baseUrl
    NEXT_PUBLIC_API_URL = "$baseUrl/api"
    NEXT_PUBLIC_SWAGGER_ENABLED = "false"
    MYSQL_ROOT_PASSWORD = ""
    ADMIN_EMAIL = ""
    ADMIN_PASSWORD = ""
}

$lines = [Collections.Generic.List[string]]::new()
$lines.AddRange([string[]]($content -split "\r?\n"))
foreach ($entry in $settings.GetEnumerator()) {
    $matched = $false
    for ($index = 0; $index -lt $lines.Count; $index++) {
        if ($lines[$index] -match "^\s*$([regex]::Escape($entry.Key))\s*=") {
            $lines[$index] = "$($entry.Key)=`"$($entry.Value)`""
            $matched = $true
            break
        }
    }
    if (-not $matched) {
        throw "Configuration template is missing the $($entry.Key) setting."
    }
}
$content = $lines -join "`n"

if (Test-Path -LiteralPath $envPath -PathType Leaf) {
    $backupPath = "$envPath.backup.$(Get-Date -Format 'yyyyMMddHHmmss')"
    Copy-Item -LiteralPath $envPath -Destination $backupPath
    Write-Host "Existing MarcFlow configuration backed up without displaying its contents."
}

[IO.File]::WriteAllText($envPath, $content, [Text.UTF8Encoding]::new($false))
$databasePassword = $null
$authSecret = $null
$swaggerSecret = $null
$databaseUrl = $null

Write-Host "Local MarcFlow configuration saved. Secrets were not printed."
Write-Host "Pushing the Prisma schema to the configured database..."
Push-Location $projectRoot
try {
    npm run db:push
    if ($LASTEXITCODE -ne 0) {
        throw "Prisma schema setup failed. Check MySQL database existence, credentials, and database privileges."
    }
} finally {
    Pop-Location
}

Write-Host ""
Write-Host "Database setup succeeded. Create your dashboard administrator with:"
Write-Host "  npm run marcflow:admin:interactive"
Write-Host "Then start the local panel with:"
Write-Host "  npm run marcflow:dev"
Write-Host "Swagger is disabled by default. Keep the panel local until remaining dependency advisories are reviewed."
