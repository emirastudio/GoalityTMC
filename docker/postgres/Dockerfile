# Postgres 16 + pgBackRest for continuous WAL archiving / PITR to R2.
#
# Same base as the prod DB (postgres:16-alpine) so the existing
# goality_pgdata volume is byte-compatible — swapping the container does
# NOT touch data. Secrets are NOT baked in: the real pgbackrest.conf
# (with R2 keys) is bind-mounted from the host at runtime.
FROM postgres:16-alpine

RUN apk add --no-cache pgbackrest \
 && mkdir -p /etc/pgbackrest /var/lib/pgbackrest /var/log/pgbackrest \
 && chown -R postgres:postgres /etc/pgbackrest /var/lib/pgbackrest /var/log/pgbackrest

# pgbackrest.conf is mounted at runtime → /etc/pgbackrest/pgbackrest.conf
