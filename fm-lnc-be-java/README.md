# FM24 LNC Java Backend

Java 21 / Spring Boot replacement backend for `fm-lnc-be`.

## Run

The project builds in Docker, so local Maven is optional:

```bash
docker build -t fm-lnc-be-java .
docker run --rm -p 3001:3001 \
  -e DB_HOST=host.docker.internal \
  -e DB_PORT=5432 \
  -e DB_USERNAME=postgres \
  -e DB_PASSWORD=123456 \
  -e DB_NAME=fm_lnc_db \
  fm-lnc-be-java
```

Swagger UI: `http://localhost:3001/docs`

## LNC data on the server

Only these files are accepted and packaged into `/app/data`:

- `fm24_club.lnc`
- `fm24_competition_other.lnc`
- `fm24_geography.lnc`

- `POST /api/lnc/import`: import the packaged files.
- `POST /api/lnc/upload`: upload replacements and immediately sync the database.
- `GET /api/lnc/status`: check server files and database counts.

Upload body:

```json
{
  "files": [
    { "name": "fm24_club.lnc", "content": "..." },
    { "name": "fm24_competition_other.lnc", "content": "..." },
    { "name": "fm24_geography.lnc", "content": "..." }
  ]
}
```
