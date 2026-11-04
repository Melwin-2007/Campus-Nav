-- =============================================================================
-- Campus Navigator — Unified Database Schema DDL
-- Compatible with SQLite 3.x and PostgreSQL 14+ / PostGIS 3.x
-- =============================================================================

-- -----------------------------------------------------------------------------
-- 1. Table: categories
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS categories (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name VARCHAR(100) NOT NULL UNIQUE,
    slug VARCHAR(100) NOT NULL UNIQUE,
    description TEXT,
    icon VARCHAR(50) NOT NULL,
    color VARCHAR(20) NOT NULL,
    is_active BOOLEAN NOT NULL DEFAULT 1,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_categories_slug ON categories(slug);
CREATE INDEX IF NOT EXISTS idx_categories_is_active ON categories(is_active);

-- -----------------------------------------------------------------------------
-- 2. Table: path_nodes
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS path_nodes (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name VARCHAR(100),
    latitude REAL NOT NULL,
    longitude REAL NOT NULL,
    floor INTEGER NOT NULL DEFAULT 0,
    node_type VARCHAR(50) NOT NULL DEFAULT 'junction',
    is_accessible BOOLEAN NOT NULL DEFAULT 1,
    is_active BOOLEAN NOT NULL DEFAULT 1,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT chk_node_latitude CHECK (latitude >= -90.0 AND latitude <= 90.0),
    CONSTRAINT chk_node_longitude CHECK (longitude >= -180.0 AND longitude <= 180.0),
    CONSTRAINT chk_node_floor CHECK (floor >= -5 AND floor <= 100)
);

CREATE INDEX IF NOT EXISTS idx_path_nodes_coords ON path_nodes(latitude, longitude);
CREATE INDEX IF NOT EXISTS idx_path_nodes_is_active ON path_nodes(is_active);
CREATE INDEX IF NOT EXISTS idx_path_nodes_is_accessible ON path_nodes(is_accessible);

-- -----------------------------------------------------------------------------
-- 3. Table: path_edges
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS path_edges (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    from_node_id INTEGER NOT NULL,
    to_node_id INTEGER NOT NULL,
    distance REAL NOT NULL,
    edge_type VARCHAR(50) NOT NULL DEFAULT 'footpath',
    is_accessible BOOLEAN NOT NULL DEFAULT 1,
    is_bidirectional BOOLEAN NOT NULL DEFAULT 1,
    is_active BOOLEAN NOT NULL DEFAULT 1,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_path_edges_from_node FOREIGN KEY (from_node_id) REFERENCES path_nodes(id) ON DELETE CASCADE,
    CONSTRAINT fk_path_edges_to_node FOREIGN KEY (to_node_id) REFERENCES path_nodes(id) ON DELETE CASCADE,
    CONSTRAINT chk_edge_distance_non_negative CHECK (distance >= 0.0),
    CONSTRAINT chk_edge_no_self_loop CHECK (from_node_id != to_node_id)
);

CREATE INDEX IF NOT EXISTS idx_path_edges_from_node ON path_edges(from_node_id);
CREATE INDEX IF NOT EXISTS idx_path_edges_to_node ON path_edges(to_node_id);
CREATE INDEX IF NOT EXISTS idx_path_edges_traversal ON path_edges(is_active, is_accessible, edge_type);

-- -----------------------------------------------------------------------------
-- 4. Table: locations
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS locations (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    category_id INTEGER NOT NULL,
    name VARCHAR(150) NOT NULL,
    description TEXT,
    department VARCHAR(100),
    latitude REAL NOT NULL,
    longitude REAL NOT NULL,
    entrance_node_id INTEGER,
    opening_hours VARCHAR(100),
    facilities TEXT NOT NULL DEFAULT '[]', -- JSON string array in SQLite; JSONB in PostgreSQL
    photo_url VARCHAR(255),
    is_active BOOLEAN NOT NULL DEFAULT 1,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_locations_category FOREIGN KEY (category_id) REFERENCES categories(id) ON DELETE RESTRICT,
    CONSTRAINT fk_locations_entrance_node FOREIGN KEY (entrance_node_id) REFERENCES path_nodes(id) ON DELETE SET NULL,
    CONSTRAINT chk_location_latitude CHECK (latitude >= -90.0 AND latitude <= 90.0),
    CONSTRAINT chk_location_longitude CHECK (longitude >= -180.0 AND longitude <= 180.0)
);

CREATE INDEX IF NOT EXISTS idx_locations_name ON locations(name);
CREATE INDEX IF NOT EXISTS idx_locations_category_id ON locations(category_id);
CREATE INDEX IF NOT EXISTS idx_locations_entrance_node ON locations(entrance_node_id);
CREATE INDEX IF NOT EXISTS idx_locations_is_active ON locations(is_active);

-- -----------------------------------------------------------------------------
-- 5. Table: qr_codes
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS qr_codes (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    location_id INTEGER NOT NULL UNIQUE,
    identifier VARCHAR(64) NOT NULL UNIQUE,
    code_url VARCHAR(255) NOT NULL,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_qr_codes_location FOREIGN KEY (location_id) REFERENCES locations(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_qr_codes_identifier ON qr_codes(identifier);
CREATE INDEX IF NOT EXISTS idx_qr_codes_location_id ON qr_codes(location_id);

-- -----------------------------------------------------------------------------
-- 6. Table: administrators
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS administrators (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    username VARCHAR(50) NOT NULL UNIQUE,
    email VARCHAR(120) NOT NULL UNIQUE,
    hashed_password VARCHAR(255) NOT NULL,
    is_active BOOLEAN NOT NULL DEFAULT 1,
    is_superuser BOOLEAN NOT NULL DEFAULT 0,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_administrators_username ON administrators(username);
CREATE INDEX IF NOT EXISTS idx_administrators_email ON administrators(email);
