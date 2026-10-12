param(
  [string]$MongodPath = 'C:\Program Files\MongoDB\Server\7.0\bin\mongod.exe',
  [int]$MongoPort = 27019
)
$ErrorActionPreference = 'Stop'
$crmProject = Split-Path -Parent $PSScriptRoot
$crmDatabaseFolder = Join-Path $crmProject '.local\verification-mongo'
New-Item -ItemType Directory -Force -Path $crmDatabaseFolder | Out-Null
$crmPreviousUri = $env:TEST_MONGODB_URI
$crmMongoProcess = $null
Push-Location $crmProject
try {
  $crmMongoProcess = Start-Process -FilePath $MongodPath -ArgumentList @('--dbpath', "`"$crmDatabaseFolder`"", '--bind_ip', '127.0.0.1', '--port', "$MongoPort", '--logpath', "`"$crmDatabaseFolder\mongod.log`"") -WindowStyle Hidden -PassThru
  Start-Sleep -Seconds 2
  if ($crmMongoProcess.HasExited) { throw 'Test MongoDB failed to start; inspect .local/verification-mongo/mongod.log or choose another port.' }
  $env:TEST_MONGODB_URI = "mongodb://127.0.0.1:$MongoPort"
  npm test
  if ($LASTEXITCODE -ne 0) { throw 'API acceptance checks failed' }
} finally {
  if ($crmMongoProcess -and !$crmMongoProcess.HasExited) { Stop-Process -Id $crmMongoProcess.Id -ErrorAction SilentlyContinue }
  $env:TEST_MONGODB_URI = $crmPreviousUri
  Pop-Location
}
