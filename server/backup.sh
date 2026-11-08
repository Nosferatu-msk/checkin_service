#!/bin/bash

# Database Backup Script
# Usage: ./backup.sh [backup_type]

set -e

BACKUP_DIR="./backups"
TIMESTAMP=$(date +"%Y%m%d_%H%M%S")
DB_NAME="checkin_db"
DB_USER="postgres"
DB_CONTAINER="checkin_postgres"

# Create backup directory if not exists
mkdir -p ${BACKUP_DIR}

# Full backup
full_backup() {
    echo "Starting full database backup..."
    
    docker exec ${DB_CONTAINER} pg_dump \
        -U ${DB_USER} \
        -d ${DB_NAME} \
        -F c \
        -Z 9 \
        > ${BACKUP_DIR}/full_backup_${TIMESTAMP}.dump
    
    echo "Backup created: ${BACKUP_DIR}/full_backup_${TIMESTAMP}.dump"
    
    # List backups and remove old ones (keep last 7 days)
    find ${BACKUP_DIR} -name "full_backup_*.dump" -mtime +7 -delete
    
    echo "Backup completed successfully"
}

# Schema-only backup
schema_backup() {
    echo "Starting schema backup..."
    
    docker exec ${DB_CONTAINER} pg_dump \
        -U ${DB_USER} \
        -d ${DB_NAME} \
        --schema-only \
        > ${BACKUP_DIR}/schema_backup_${TIMESTAMP}.sql
    
    echo "Schema backup created: ${BACKUP_DIR}/schema_backup_${TIMESTAMP}.sql"
}

# Data-only backup
data_backup() {
    echo "Starting data backup..."
    
    docker exec ${DB_CONTAINER} pg_dump \
        -U ${DB_USER} \
        -d ${DB_NAME} \
        --data-only \
        -F c \
        > ${BACKUP_DIR}/data_backup_${TIMESTAMP}.dump
    
    echo "Data backup created: ${BACKUP_DIR}/data_backup_${TIMESTAMP}.dump"
}

# Restore from backup
restore() {
    local backup_file=$1
    
    if [ -z "$backup_file" ]; then
        echo "Usage: ./backup.sh restore <backup_file>"
        exit 1
    fi
    
    if [ ! -f "$backup_file" ]; then
        echo "Error: Backup file not found: $backup_file"
        exit 1
    fi
    
    echo "Restoring from backup: $backup_file"
    
    docker exec -i ${DB_CONTAINER} pg_restore \
        -U ${DB_USER} \
        -d ${DB_NAME} \
        -F c \
        < "$backup_file"
    
    echo "Restore completed successfully"
}

# List backups
list_backups() {
    echo "Available backups:"
    ls -lh ${BACKUP_DIR}/
}

# Main
case "$1" in
    full)
        full_backup
        ;;
    schema)
        schema_backup
        ;;
    data)
        data_backup
        ;;
    restore)
        restore "$2"
        ;;
    list)
        list_backups
        ;;
    *)
        echo "Usage: $0 {full|schema|data|restore <file>|list}"
        exit 1
        ;;
esac
