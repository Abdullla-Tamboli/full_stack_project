param(
  [string]$MongodPath = 'C:\Program Files\MongoDB\Server\7.0\bin\mongod.exe',
  [int]$MongoPort = 27018
)
$ErrorActionPreference = 'Stop'
if (!(Test-Path -LiteralPath $MongodPath)) { throw "MongoDB executable not found at $MongodPath. Pass -MongodPath with your installed executable." }
$crmMongoFolder = Join-Path (Split-Path -Parent $PSScriptRoot) '.local\mongo'
New-Item -ItemType Directory -Force -Path $crmMongoFolder | Out-Null
Write-Host "Starting local MongoDB on port $MongoPort. Keep this terminal open and run npm start in another terminal."
& $MongodPath --dbpath $crmMongoFolder --bind_ip 127.0.0.1 --port $MongoPort
exit $LASTEXITCODE
