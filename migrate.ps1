# Get the Heroku database URL
$databaseUrl = heroku config:get DATABASE_URL

if (-not $databaseUrl) {
    Write-Error "Could not get DATABASE_URL from Heroku"
    exit 1
}

Write-Host "Starting database migration..."

# Execute the migration
Get-Content migration.sql | psql $databaseUrl

Write-Host "Migration completed!" 