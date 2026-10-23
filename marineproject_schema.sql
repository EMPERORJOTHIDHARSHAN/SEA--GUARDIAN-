-- ============================================================================
-- MARINE PROJECT POSTGRESQL + POSTGIS SCHEMA & SEED DATA
-- Schema: marineproject
-- Tables: 13 Tables with spatial indexes and integrity constraints
-- ============================================================================

-- 1. Create marineproject Schema
CREATE SCHEMA IF NOT EXISTS marineproject;

-- 2. Enable PostGIS Extension in public schema
CREATE EXTENSION IF NOT EXISTS postgis SCHEMA public;

-- 3. Set search path so PostgreSQL finds PostGIS types & project tables automatically
SET search_path TO marineproject, public;


-- ==========================================
-- 1. USERS
-- ==========================================
CREATE TABLE IF NOT EXISTS marineproject.users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    full_name TEXT NOT NULL,
    email TEXT UNIQUE,
    phone_number TEXT UNIQUE,
    role TEXT NOT NULL DEFAULT 'fisherman'
        CHECK (role IN ('fisherman', 'family', 'admin')),
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    last_login_at TIMESTAMPTZ
);


-- ==========================================
-- 2. BOATS
-- ==========================================
CREATE TABLE IF NOT EXISTS marineproject.boats (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    owner_user_id UUID NOT NULL
        REFERENCES marineproject.users(id)
        ON DELETE RESTRICT,
    boat_name TEXT NOT NULL,
    registration_number TEXT UNIQUE,
    boat_type TEXT,
    home_port TEXT,
    emergency_contact TEXT,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_boats_owner ON marineproject.boats(owner_user_id);


-- ==========================================
-- 3. DEVICES (Hardware - ESP32)
-- ==========================================
CREATE TABLE IF NOT EXISTS marineproject.devices (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    boat_id UUID
        REFERENCES marineproject.boats(id)
        ON DELETE SET NULL,
    device_uid TEXT UNIQUE NOT NULL,
    device_type TEXT NOT NULL DEFAULT 'ESP32',
    firmware_version TEXT,
    connection_status TEXT NOT NULL DEFAULT 'offline'
        CHECK (connection_status IN ('online', 'offline', 'unknown')),
    battery_level NUMERIC(5,2)
        CHECK (battery_level >= 0 AND battery_level <= 100),
    last_seen_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_devices_boat ON marineproject.devices(boat_id);
CREATE INDEX IF NOT EXISTS idx_devices_uid ON marineproject.devices(device_uid);


-- ==========================================
-- 4. BOAT CURRENT LOCATIONS
-- ==========================================
CREATE TABLE IF NOT EXISTS marineproject.boat_current_locations (
    boat_id UUID PRIMARY KEY
        REFERENCES marineproject.boats(id)
        ON DELETE CASCADE,
    device_id UUID
        REFERENCES marineproject.devices(id)
        ON DELETE SET NULL,
    latitude DOUBLE PRECISION NOT NULL,
    longitude DOUBLE PRECISION NOT NULL,
    location_point public.GEOGRAPHY(POINT, 4326) NOT NULL,
    altitude DOUBLE PRECISION,
    speed_mps DOUBLE PRECISION,
    course_degrees DOUBLE PRECISION,
    heading_degrees DOUBLE PRECISION,
    accuracy_meters DOUBLE PRECISION,
    source TEXT NOT NULL
        CHECK (source IN ('PHONE_GPS', 'ESP32_GPS', 'OTHER')),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_boat_current_location_spatial
ON marineproject.boat_current_locations
USING GIST(location_point);


-- ==========================================
-- 5. BOAT LOCATION HISTORY
-- ==========================================
CREATE TABLE IF NOT EXISTS marineproject.boat_locations (
    id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    boat_id UUID NOT NULL
        REFERENCES marineproject.boats(id)
        ON DELETE CASCADE,
    device_id UUID
        REFERENCES marineproject.devices(id)
        ON DELETE SET NULL,
    latitude DOUBLE PRECISION NOT NULL,
    longitude DOUBLE PRECISION NOT NULL,
    location_point public.GEOGRAPHY(POINT, 4326) NOT NULL,
    altitude DOUBLE PRECISION,
    speed_mps DOUBLE PRECISION,
    course_degrees DOUBLE PRECISION,
    heading_degrees DOUBLE PRECISION,
    accuracy_meters DOUBLE PRECISION,
    source TEXT NOT NULL
        CHECK (source IN ('PHONE_GPS', 'ESP32_GPS', 'OTHER')),
    recorded_at TIMESTAMPTZ NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_boat_locations_boat_time ON marineproject.boat_locations(boat_id, recorded_at DESC);
CREATE INDEX IF NOT EXISTS idx_boat_locations_spatial ON marineproject.boat_locations USING GIST(location_point);


-- ==========================================
-- 6. MARITIME BOUNDARIES
-- ==========================================
CREATE TABLE IF NOT EXISTS marineproject.maritime_boundaries (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    boundary_type TEXT NOT NULL,
    description TEXT,
    country_code CHAR(2),
    geometry public.GEOMETRY(MULTIPOLYGON, 4326) NOT NULL,
    data_source TEXT NOT NULL,
    source_version TEXT,
    effective_from TIMESTAMPTZ,
    effective_until TIMESTAMPTZ,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_maritime_boundaries_geometry ON marineproject.maritime_boundaries USING GIST(geometry);


-- ==========================================
-- 7. SAFETY ZONES
-- ==========================================
CREATE TABLE IF NOT EXISTS marineproject.safety_zones (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    zone_type TEXT NOT NULL
        CHECK (zone_type IN ('SAFE', 'RESTRICTED', 'DANGER', 'PORT', 'EMERGENCY')),
    description TEXT,
    geometry public.GEOMETRY(MULTIPOLYGON, 4326) NOT NULL,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_safety_zones_geometry ON marineproject.safety_zones USING GIST(geometry);


-- ==========================================
-- 8. BOUNDARY EVENTS
-- ==========================================
CREATE TABLE IF NOT EXISTS marineproject.boundary_events (
    id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    boat_id UUID NOT NULL
        REFERENCES marineproject.boats(id)
        ON DELETE CASCADE,
    boundary_id UUID NOT NULL
        REFERENCES marineproject.maritime_boundaries(id)
        ON DELETE RESTRICT,
    location_id BIGINT
        REFERENCES marineproject.boat_locations(id)
        ON DELETE SET NULL,
    event_type TEXT NOT NULL
        CHECK (event_type IN ('WARNING', 'DANGER', 'CRITICAL', 'CROSSED', 'RETURNING', 'SAFE')),
    distance_meters DOUBLE PRECISION,
    recorded_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    acknowledged_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_boundary_events_boat_time ON marineproject.boundary_events(boat_id, recorded_at DESC);
CREATE INDEX IF NOT EXISTS idx_boundary_events_boundary ON marineproject.boundary_events(boundary_id);


-- ==========================================
-- 9. SOS EVENTS
-- ==========================================
CREATE TABLE IF NOT EXISTS marineproject.sos_events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    boat_id UUID NOT NULL
        REFERENCES marineproject.boats(id)
        ON DELETE CASCADE,
    user_id UUID
        REFERENCES marineproject.users(id)
        ON DELETE SET NULL,
    device_id UUID
        REFERENCES marineproject.devices(id)
        ON DELETE SET NULL,
    latitude DOUBLE PRECISION NOT NULL,
    longitude DOUBLE PRECISION NOT NULL,
    location_point public.GEOGRAPHY(POINT, 4326) NOT NULL,
    message TEXT,
    status TEXT NOT NULL DEFAULT 'ACTIVE'
        CHECK (status IN ('ACTIVE', 'ACKNOWLEDGED', 'RESOLVED', 'CANCELLED')),
    trigger_source TEXT NOT NULL
        CHECK (trigger_source IN ('PHONE', 'ESP32_BUTTON', 'OTHER')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    resolved_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_sos_boat_time ON marineproject.sos_events(boat_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_sos_status ON marineproject.sos_events(status);
CREATE INDEX IF NOT EXISTS idx_sos_spatial ON marineproject.sos_events USING GIST(location_point);


-- ==========================================
-- 10. BOAT ACCESS
-- ==========================================
CREATE TABLE IF NOT EXISTS marineproject.boat_access (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    boat_id UUID NOT NULL
        REFERENCES marineproject.boats(id)
        ON DELETE CASCADE,
    user_id UUID NOT NULL
        REFERENCES marineproject.users(id)
        ON DELETE CASCADE,
    access_level TEXT NOT NULL
        CHECK (access_level IN ('OWNER', 'FAMILY', 'VIEWER', 'ADMIN')),
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    expires_at TIMESTAMPTZ,
    UNIQUE(boat_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_boat_access_user ON marineproject.boat_access(user_id);
CREATE INDEX IF NOT EXISTS idx_boat_access_boat ON marineproject.boat_access(boat_id);


-- ==========================================
-- 11. MARINE WEATHER
-- ==========================================
CREATE TABLE IF NOT EXISTS marineproject.marine_weather (
    id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    latitude DOUBLE PRECISION NOT NULL,
    longitude DOUBLE PRECISION NOT NULL,
    location_point public.GEOGRAPHY(POINT, 4326) NOT NULL,
    wind_speed_mps DOUBLE PRECISION,
    wind_direction_degrees DOUBLE PRECISION,
    wave_height_meters DOUBLE PRECISION,
    wave_direction_degrees DOUBLE PRECISION,
    wave_period_seconds DOUBLE PRECISION,
    current_speed_mps DOUBLE PRECISION,
    current_direction_degrees DOUBLE PRECISION,
    temperature_celsius DOUBLE PRECISION,
    source TEXT NOT NULL,
    forecast_time TIMESTAMPTZ NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_marine_weather_spatial ON marineproject.marine_weather USING GIST(location_point);
CREATE INDEX IF NOT EXISTS idx_marine_weather_forecast ON marineproject.marine_weather(forecast_time);


-- ==========================================
-- 12. SENSOR READINGS
-- ==========================================
CREATE TABLE IF NOT EXISTS marineproject.sensor_readings (
    id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    device_id UUID NOT NULL
        REFERENCES marineproject.devices(id)
        ON DELETE CASCADE,
    boat_id UUID NOT NULL
        REFERENCES marineproject.boats(id)
        ON DELETE CASCADE,
    sensor_type TEXT NOT NULL,
    value DOUBLE PRECISION NOT NULL,
    unit TEXT NOT NULL,
    latitude DOUBLE PRECISION,
    longitude DOUBLE PRECISION,
    location_point public.GEOGRAPHY(POINT, 4326),
    recorded_at TIMESTAMPTZ NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);


-- ==========================================
-- 13. NOTIFICATIONS
-- ==========================================
CREATE TABLE IF NOT EXISTS marineproject.notifications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL
        REFERENCES marineproject.users(id)
        ON DELETE CASCADE,
    boat_id UUID
        REFERENCES marineproject.boats(id)
        ON DELETE CASCADE,
    title TEXT NOT NULL,
    body TEXT NOT NULL,
    notification_type TEXT NOT NULL
        CHECK (notification_type IN ('BOUNDARY_WARNING', 'BORDER_CROSSED', 'SOS_ALERT', 'SYSTEM')),
    is_read BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_notifications_user ON marineproject.notifications(user_id, created_at DESC);


-- ============================================================================
-- SEED DATA (3 ROWS PER TABLE)
-- ============================================================================

SET search_path TO marineproject, public;

-- 1. USERS
INSERT INTO marineproject.users (id, full_name, email, phone_number, role) VALUES 
('a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', 'Kumaran', 'kumaran@coastmark.com', '+919876543210', 'fisherman'),
('a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a22', 'Selvi (Family)', 'selvi@coastmark.com', '+919876543211', 'family'),
('a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a33', 'Admin Officer', 'admin@coastmark.com', '+919876543212', 'admin')
ON CONFLICT (id) DO NOTHING;

-- 2. BOATS
INSERT INTO marineproject.boats (id, owner_user_id, boat_name, registration_number, boat_type, home_port, emergency_contact) VALUES 
('b1eecc88-8b0a-3de7-aa5c-5aa8ac270b22', 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', 'Sea Hawk', 'IND-TN-01-BK-1234', 'Trawler', 'Chennai Port', '+919876543299'),
('b2eecc88-8b0a-3de7-aa5c-5aa8ac270b33', 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', 'Blue Dolphin', 'IND-TN-01-BK-5678', 'Gillnetter', 'Kasimedu Harbour', '+919876543288'),
('b3eecc88-8b0a-3de7-aa5c-5aa8ac270b44', 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a33', 'Coastal Guard 1', 'IND-CG-02-9999', 'Patrol', 'Ennore Port', '+919876543277')
ON CONFLICT (id) DO NOTHING;

-- 3. DEVICES
INSERT INTO marineproject.devices (id, boat_id, device_uid, device_type, firmware_version, connection_status, battery_level, last_seen_at) VALUES 
('d111cc88-8b0a-3de7-aa5c-5aa8ac270333', 'b1eecc88-8b0a-3de7-aa5c-5aa8ac270b22', 'ESP32_DEV_9988', 'ESP32', 'v1.2.0', 'online', 85.50, NOW()),
('d222cc88-8b0a-3de7-aa5c-5aa8ac270444', 'b2eecc88-8b0a-3de7-aa5c-5aa8ac270b33', 'ESP32_DEV_7766', 'ESP32', 'v1.2.0', 'online', 92.00, NOW()),
('d333cc88-8b0a-3de7-aa5c-5aa8ac270555', 'b3eecc88-8b0a-3de7-aa5c-5aa8ac270b44', 'ESP32_DEV_5544', 'ESP32', 'v1.3.1', 'offline', 14.50, NOW() - INTERVAL '2 hours')
ON CONFLICT (id) DO NOTHING;

-- 4. BOAT CURRENT LOCATIONS
INSERT INTO marineproject.boat_current_locations (boat_id, device_id, latitude, longitude, location_point, speed_mps, course_degrees, source) VALUES 
('b1eecc88-8b0a-3de7-aa5c-5aa8ac270b22', 'd111cc88-8b0a-3de7-aa5c-5aa8ac270333', 13.0827, 80.2707, ST_SetSRID(ST_MakePoint(80.2707, 13.0827), 4326)::geography, 4.2, 120.5, 'ESP32_GPS'),
('b2eecc88-8b0a-3de7-aa5c-5aa8ac270b33', 'd222cc88-8b0a-3de7-aa5c-5aa8ac270444', 13.1000, 80.3000, ST_SetSRID(ST_MakePoint(80.3000, 13.1000), 4326)::geography, 5.0, 140.0, 'PHONE_GPS'),
('b3eecc88-8b0a-3de7-aa5c-5aa8ac270b44', 'd333cc88-8b0a-3de7-aa5c-5aa8ac270555', 13.1500, 80.3500, ST_SetSRID(ST_MakePoint(80.3500, 13.1500), 4326)::geography, 0.0, 0.0, 'ESP32_GPS')
ON CONFLICT (boat_id) DO UPDATE SET
  device_id = EXCLUDED.device_id,
  latitude = EXCLUDED.latitude,
  longitude = EXCLUDED.longitude,
  location_point = EXCLUDED.location_point,
  speed_mps = EXCLUDED.speed_mps,
  course_degrees = EXCLUDED.course_degrees,
  source = EXCLUDED.source,
  updated_at = NOW();

-- 5. BOAT LOCATION HISTORY
INSERT INTO marineproject.boat_locations (boat_id, device_id, latitude, longitude, location_point, speed_mps, source, recorded_at) VALUES 
('b1eecc88-8b0a-3de7-aa5c-5aa8ac270b22', 'd111cc88-8b0a-3de7-aa5c-5aa8ac270333', 13.0820, 80.2700, ST_SetSRID(ST_MakePoint(80.2700, 13.0820), 4326)::geography, 4.0, 'ESP32_GPS', NOW() - INTERVAL '30 minutes'),
('b1eecc88-8b0a-3de7-aa5c-5aa8ac270b22', 'd111cc88-8b0a-3de7-aa5c-5aa8ac270333', 13.0810, 80.2690, ST_SetSRID(ST_MakePoint(80.2690, 13.0810), 4326)::geography, 3.8, 'ESP32_GPS', NOW() - INTERVAL '60 minutes'),
('b2eecc88-8b0a-3de7-aa5c-5aa8ac270b33', 'd222cc88-8b0a-3de7-aa5c-5aa8ac270444', 13.0950, 80.2950, ST_SetSRID(ST_MakePoint(80.2950, 13.0950), 4326)::geography, 4.8, 'PHONE_GPS', NOW() - INTERVAL '20 minutes');

-- 6. MARITIME BOUNDARIES
INSERT INTO marineproject.maritime_boundaries (id, name, boundary_type, country_code, geometry, data_source) VALUES 
('999cc888-8b0a-3de7-aa5c-5aa8ac270666', 'International Maritime Boundary Line', 'IMBL', 'IN', ST_SetSRID(ST_GeomFromText('MULTIPOLYGON(((80.0 13.0, 81.0 13.0, 81.0 14.0, 80.0 14.0, 80.0 13.0)))'), 4326), 'Official Survey'),
('888cc888-8b0a-3de7-aa5c-5aa8ac270777', 'Palk Bay Restricted Zone', 'RESTRICTED', 'IN', ST_SetSRID(ST_GeomFromText('MULTIPOLYGON(((79.0 9.0, 80.0 9.0, 80.0 10.0, 79.0 10.0, 79.0 9.0)))'), 4326), 'Navy GIS'),
('777cc888-8b0a-3de7-aa5c-5aa8ac270888', 'Gulf of Mannar Biosphere', 'DANGER', 'IN', ST_SetSRID(ST_GeomFromText('MULTIPOLYGON(((78.0 8.0, 79.0 8.0, 79.0 9.0, 78.0 9.0, 78.0 8.0)))'), 4326), 'Coastal Dept')
ON CONFLICT (id) DO NOTHING;

-- 7. SAFETY ZONES
INSERT INTO marineproject.safety_zones (id, name, zone_type, geometry) VALUES 
('777cc888-8b0a-3de7-aa5c-5aa8ac270777', 'Chennai Port Safe Harbor', 'PORT', ST_SetSRID(ST_GeomFromText('MULTIPOLYGON(((80.25 13.05, 80.28 13.05, 80.28 13.09, 80.25 13.09, 80.25 13.05)))'), 4326)),
('666cc888-8b0a-3de7-aa5c-5aa8ac270666', 'Ennore Port Anchorage', 'PORT', ST_SetSRID(ST_GeomFromText('MULTIPOLYGON(((80.30 13.20, 80.33 13.20, 80.33 13.24, 80.30 13.24, 80.30 13.20)))'), 4326)),
('555cc888-8b0a-3de7-aa5c-5aa8ac270555', 'Emergency Refuge Zone North', 'SAFE', ST_SetSRID(ST_GeomFromText('MULTIPOLYGON(((80.10 13.40, 80.15 13.40, 80.15 13.45, 80.10 13.45, 80.10 13.40)))'), 4326))
ON CONFLICT (id) DO NOTHING;

-- 8. BOUNDARY EVENTS
INSERT INTO marineproject.boundary_events (boat_id, boundary_id, event_type, distance_meters) VALUES 
('b1eecc88-8b0a-3de7-aa5c-5aa8ac270b22', '999cc888-8b0a-3de7-aa5c-5aa8ac270666', 'WARNING', 450.5),
('b2eecc88-8b0a-3de7-aa5c-5aa8ac270b33', '999cc888-8b0a-3de7-aa5c-5aa8ac270666', 'SAFE', 1200.0),
('b1eecc88-8b0a-3de7-aa5c-5aa8ac270b22', '888cc888-8b0a-3de7-aa5c-5aa8ac270777', 'DANGER', 150.0);

-- 9. SOS EVENTS
INSERT INTO marineproject.sos_events (id, boat_id, user_id, device_id, latitude, longitude, location_point, message, status, trigger_source) VALUES 
('555cc888-8b0a-3de7-aa5c-5aa8ac270555', 'b1eecc88-8b0a-3de7-aa5c-5aa8ac270b22', 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', 'd111cc88-8b0a-3de7-aa5c-5aa8ac270333', 13.0827, 80.2707, ST_SetSRID(ST_MakePoint(80.2707, 13.0827), 4326)::geography, 'Engine trouble near coastal boundary', 'ACTIVE', 'ESP32_BUTTON'),
('666cc888-8b0a-3de7-aa5c-5aa8ac270666', 'b2eecc88-8b0a-3de7-aa5c-5aa8ac270b33', 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', 'd222cc88-8b0a-3de7-aa5c-5aa8ac270444', 13.1000, 80.3000, ST_SetSRID(ST_MakePoint(80.3000, 13.1000), 4326)::geography, 'Sudden heavy storm approaching', 'ACKNOWLEDGED', 'PHONE'),
('777cc888-8b0a-3de7-aa5c-5aa8ac270777', 'b3eecc88-8b0a-3de7-aa5c-5aa8ac270b44', 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a33', 'd333cc88-8b0a-3de7-aa5c-5aa8ac270555', 13.1500, 80.3500, ST_SetSRID(ST_MakePoint(80.3500, 13.1500), 4326)::geography, 'Battery failure test signal', 'RESOLVED', 'ESP32_BUTTON')
ON CONFLICT (id) DO NOTHING;

-- 10. BOAT ACCESS
INSERT INTO marineproject.boat_access (boat_id, user_id, access_level) VALUES 
('b1eecc88-8b0a-3de7-aa5c-5aa8ac270b22', 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', 'OWNER'),
('b1eecc88-8b0a-3de7-aa5c-5aa8ac270b22', 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a22', 'FAMILY'),
('b2eecc88-8b0a-3de7-aa5c-5aa8ac270b33', 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', 'OWNER')
ON CONFLICT (boat_id, user_id) DO NOTHING;

-- 11. MARINE WEATHER
INSERT INTO marineproject.marine_weather (latitude, longitude, location_point, wind_speed_mps, wave_height_meters, source, forecast_time) VALUES 
(13.0827, 80.2707, ST_SetSRID(ST_MakePoint(80.2707, 13.0827), 4326)::geography, 6.5, 1.2, 'OpenWeatherMarine', NOW()),
(13.1000, 80.3000, ST_SetSRID(ST_MakePoint(80.3000, 13.1000), 4326)::geography, 8.2, 1.8, 'OpenWeatherMarine', NOW()),
(13.1500, 80.3500, ST_SetSRID(ST_MakePoint(80.3500, 13.1500), 4326)::geography, 4.1, 0.9, 'OpenWeatherMarine', NOW());

-- 12. SENSOR READINGS
INSERT INTO marineproject.sensor_readings (device_id, boat_id, sensor_type, value, unit, latitude, longitude, location_point, recorded_at) VALUES 
('d111cc88-8b0a-3de7-aa5c-5aa8ac270333', 'b1eecc88-8b0a-3de7-aa5c-5aa8ac270b22', 'COMPASS', 142.0, 'degrees', 13.0827, 80.2707, ST_SetSRID(ST_MakePoint(80.2707, 13.0827), 4326)::geography, NOW()),
('d111cc88-8b0a-3de7-aa5c-5aa8ac270333', 'b1eecc88-8b0a-3de7-aa5c-5aa8ac270b22', 'BATTERY', 85.5, 'percent', 13.0827, 80.2707, ST_SetSRID(ST_MakePoint(80.2707, 13.0827), 4326)::geography, NOW()),
('d222cc88-8b0a-3de7-aa5c-5aa8ac270444', 'b2eecc88-8b0a-3de7-aa5c-5aa8ac270b33', 'COMPASS', 210.5, 'degrees', 13.1000, 80.3000, ST_SetSRID(ST_MakePoint(80.3000, 13.1000), 4326)::geography, NOW());

-- 13. NOTIFICATIONS
INSERT INTO marineproject.notifications (id, user_id, boat_id, title, body, notification_type) VALUES 
('a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a22', 'b1eecc88-8b0a-3de7-aa5c-5aa8ac270b22', 'SOS Alert Triggered!', 'Sea Hawk has triggered an SOS emergency signal.', 'SOS_ALERT'),
('a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', 'b1eecc88-8b0a-3de7-aa5c-5aa8ac270b22', 'Boundary Warning', 'You are approaching the international maritime boundary line.', 'BOUNDARY_WARNING'),
('a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a22', 'b2eecc88-8b0a-3de7-aa5c-5aa8ac270b33', 'System Update', 'Blue Dolphin hardware firmware updated successfully.', 'SYSTEM')
ON CONFLICT (id) DO NOTHING;
