@echo off
setlocal

cd /d "%~dp0"
title Intrnd Dev Console

set "DB_CONTAINER=intrnd-postgres"
set "DB_USER=intrnd"
set "DB_PASSWORD=intrnd_local_password"
set "DB_NAME=intrnd"
set "DB_PORT=54329"
set "DATABASE_URL=postgresql://%DB_USER%:%DB_PASSWORD%@localhost:%DB_PORT%/%DB_NAME%"
set "PORT=4000"
set "CLIENT_ORIGIN=http://127.0.0.1:5173"
set "NODE_ENV=development"
set "JWT_SECRET=intrnd-local-dev-secret-change-before-production"

echo.
echo ===============================
echo   Intrnd Development Console
echo ===============================
echo.

where npm >nul 2>nul
if errorlevel 1 (
  echo npm was not found. Install Node.js, then run this file again.
  goto error
)

where docker >nul 2>nul
if errorlevel 1 (
  echo Docker was not found. Install Docker Desktop to run the local Postgres database.
  goto error
)

docker info >nul 2>nul
if errorlevel 1 (
  echo Docker Desktop is not running. Starting Docker Desktop...
  if exist "%ProgramFiles%\Docker\Docker\Docker Desktop.exe" (
    start "" "%ProgramFiles%\Docker\Docker\Docker Desktop.exe"
  ) else (
    echo Could not find Docker Desktop. Start Docker Desktop manually, then run this file again.
    goto error
  )

  echo Waiting for Docker Desktop to be ready...
  for /l %%i in (1,1,120) do (
    docker info >nul 2>nul
    if not errorlevel 1 goto docker_ready
    timeout /t 2 /nobreak >nul
  )

  echo Docker Desktop did not become ready in time.
  goto error
)

:docker_ready

if not exist node_modules (
  echo Installing dependencies...
  call npm ci
  if errorlevel 1 goto error
)

echo Starting local Postgres...
docker inspect "%DB_CONTAINER%" >nul 2>nul
if errorlevel 1 (
  docker run --name "%DB_CONTAINER%" ^
    -e POSTGRES_USER="%DB_USER%" ^
    -e POSTGRES_PASSWORD="%DB_PASSWORD%" ^
    -e POSTGRES_DB="%DB_NAME%" ^
    -p 127.0.0.1:%DB_PORT%:5432 ^
    -d postgres:16-alpine
  if errorlevel 1 goto error
) else (
  docker start "%DB_CONTAINER%" >nul
)

echo Waiting for Postgres to be ready...
for /l %%i in (1,1,30) do (
  docker exec "%DB_CONTAINER%" pg_isready -U "%DB_USER%" -d "%DB_NAME%" >nul 2>nul
  if not errorlevel 1 goto postgres_ready
  timeout /t 1 /nobreak >nul
)

echo Postgres did not become ready in time.
goto error

:postgres_ready
echo Postgres is ready on localhost:%DB_PORT%.

echo Generating Prisma client...
call npx prisma generate
if errorlevel 1 goto error

echo Running database migrations...
call npm run db:deploy
if errorlevel 1 goto error

echo.
echo Starting frontend and backend...
echo Frontend: http://127.0.0.1:5173
echo Backend:  http://127.0.0.1:4000
echo Admin:    http://127.0.0.1:5173/admin
echo.
echo Admin access requires a signed-in database user with role ADMIN.
echo.
echo Press Ctrl+C to stop the app. The Postgres container will keep running for next time.
echo.

call npm run dev:full
goto end

:error
echo.
echo Something failed. Check the output above.
pause

:end
endlocal
