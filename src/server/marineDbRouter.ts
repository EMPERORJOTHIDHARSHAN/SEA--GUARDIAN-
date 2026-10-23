/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { Router, Request, Response } from 'express';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { 
  marinePostgresService, 
  MARINE_TABLES, 
  MarineTableName, 
  TABLE_METADATA 
} from './marinePostgresService';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export const marineDbRouter = Router();

/**
 * GET /api/marine-db/status
 * Returns full status of the 13 tables in marineproject schema
 */
marineDbRouter.get('/status', (_req: Request, res: Response) => {
  try {
    const status = marinePostgresService.getStatus();
    res.json({
      success: true,
      status,
    });
  } catch (err: any) {
    res.status(500).json({ success: false, message: err.message });
  }
});

/**
 * GET /api/marine-db/tables
 * Returns metadata of all 13 tables
 */
marineDbRouter.get('/tables', (_req: Request, res: Response) => {
  try {
    const status = marinePostgresService.getStatus();
    res.json({
      success: true,
      tables: status.tables,
    });
  } catch (err: any) {
    res.status(500).json({ success: false, message: err.message });
  }
});

/**
 * GET /api/marine-db/tables/:tableName
 * Returns rows for a specific table
 */
marineDbRouter.get('/tables/:tableName', async (req: Request, res: Response) => {
  try {
    const tableName = req.params.tableName.toLowerCase() as MarineTableName;
    if (!MARINE_TABLES.includes(tableName)) {
      return res.status(404).json({
        success: false,
        message: `Table '${req.params.tableName}' not found in marineproject schema. Available: ${MARINE_TABLES.join(', ')}`,
      });
    }

    const limit = Number(req.query.limit) || 100;
    const rows = await marinePostgresService.getTableRows(tableName, limit);

    return res.json({
      success: true,
      table: tableName,
      count: rows.length,
      columns: TABLE_METADATA[tableName].columns,
      primaryKey: TABLE_METADATA[tableName].primaryKey,
      rows,
    });
  } catch (err: any) {
    return res.status(500).json({ success: false, message: err.message });
  }
});

/**
 * POST /api/marine-db/tables/:tableName
 * Insert a new row into the specified table
 */
marineDbRouter.post('/tables/:tableName', async (req: Request, res: Response) => {
  try {
    const tableName = req.params.tableName.toLowerCase() as MarineTableName;
    if (!MARINE_TABLES.includes(tableName)) {
      return res.status(404).json({
        success: false,
        message: `Table '${req.params.tableName}' not found.`,
      });
    }

    const row = await marinePostgresService.insertRow(tableName, req.body);
    return res.status(201).json({
      success: true,
      message: `Record successfully inserted into ${tableName}`,
      row,
    });
  } catch (err: any) {
    return res.status(400).json({ success: false, message: err.message });
  }
});

/**
 * PUT /api/marine-db/tables/:tableName/:id
 * Update an existing row
 */
marineDbRouter.put('/tables/:tableName/:id', async (req: Request, res: Response) => {
  try {
    const tableName = req.params.tableName.toLowerCase() as MarineTableName;
    if (!MARINE_TABLES.includes(tableName)) {
      return res.status(404).json({ success: false, message: `Table '${req.params.tableName}' not found.` });
    }

    const updated = await marinePostgresService.updateRow(tableName, req.params.id, req.body);
    return res.json({
      success: true,
      message: `Record in ${tableName} updated successfully`,
      row: updated,
    });
  } catch (err: any) {
    return res.status(400).json({ success: false, message: err.message });
  }
});

/**
 * DELETE /api/marine-db/tables/:tableName/:id
 * Delete an existing row
 */
marineDbRouter.delete('/tables/:tableName/:id', async (req: Request, res: Response) => {
  try {
    const tableName = req.params.tableName.toLowerCase() as MarineTableName;
    if (!MARINE_TABLES.includes(tableName)) {
      return res.status(404).json({ success: false, message: `Table '${req.params.tableName}' not found.` });
    }

    const success = await marinePostgresService.deleteRow(tableName, req.params.id);
    return res.json({
      success,
      message: success ? `Record deleted from ${tableName}` : 'Record not found or not deleted',
    });
  } catch (err: any) {
    return res.status(400).json({ success: false, message: err.message });
  }
});

/**
 * POST /api/marine-db/query
 * Execute arbitrary SQL query (e.g. SELECT * FROM users)
 */
marineDbRouter.post('/query', async (req: Request, res: Response) => {
  try {
    const { sql } = req.body;
    if (!sql || typeof sql !== 'string') {
      return res.status(400).json({ success: false, message: 'SQL statement string is required.' });
    }

    const result = await marinePostgresService.executeRawQuery(sql);
    return res.json({
      success: true,
      ...result,
    });
  } catch (err: any) {
    return res.status(400).json({
      success: false,
      message: err.message,
    });
  }
});

/**
 * POST /api/marine-db/connect
 * Test and connect to an external live PostgreSQL / PostGIS database
 */
marineDbRouter.post('/connect', async (req: Request, res: Response) => {
  try {
    const { connectionString, host, port, user, password, database, ssl } = req.body;
    const result = await marinePostgresService.connectWithCredentials({
      connectionString,
      host,
      port: port ? Number(port) : 5432,
      user,
      password,
      database: database || 'marineproject',
      ssl: Boolean(ssl),
    });

    return res.json(result);
  } catch (err: any) {
    return res.status(500).json({ success: false, message: err.message });
  }
});

/**
 * POST /api/marine-db/boat-sync
 * Endpoint called by Boat GPS Simulator or ESP32 hardware transponder
 */
marineDbRouter.post('/boat-sync', async (req: Request, res: Response) => {
  try {
    const { 
      boatId, 
      boatName, 
      deviceId, 
      latitude, 
      longitude, 
      speedMps, 
      courseDegrees, 
      headingDegrees, 
      source, 
      batteryLevel, 
      alertStatus, 
      distanceMeters 
    } = req.body;

    if (latitude === undefined || longitude === undefined || speedMps === undefined) {
      return res.status(400).json({
        success: false,
        message: 'latitude, longitude, and speedMps are required',
      });
    }

    const result = await marinePostgresService.syncBoatTelemetry({
      boatId,
      boatName,
      deviceId,
      latitude: Number(latitude),
      longitude: Number(longitude),
      speedMps: Number(speedMps),
      courseDegrees: courseDegrees !== undefined ? Number(courseDegrees) : undefined,
      headingDegrees: headingDegrees !== undefined ? Number(headingDegrees) : undefined,
      source,
      batteryLevel: batteryLevel !== undefined ? Number(batteryLevel) : undefined,
      alertStatus,
      distanceMeters: distanceMeters !== undefined ? Number(distanceMeters) : undefined,
    });

    return res.json({
      success: true,
      message: 'Boat location & ESP32 telemetry recorded into marineproject database',
      result,
    });
  } catch (err: any) {
    return res.status(500).json({ success: false, message: err.message });
  }
});

/**
 * POST /api/marine-db/sos-sync
 * Endpoint to trigger and record an emergency SOS distress event
 */
marineDbRouter.post('/sos-sync', async (req: Request, res: Response) => {
  try {
    const { boatId, userId, deviceId, latitude, longitude, message, triggerSource } = req.body;

    if (latitude === undefined || longitude === undefined) {
      return res.status(400).json({ success: false, message: 'latitude and longitude are required for SOS' });
    }

    const event = await marinePostgresService.triggerSosEvent({
      boatId,
      userId,
      deviceId,
      latitude: Number(latitude),
      longitude: Number(longitude),
      message,
      triggerSource,
    });

    return res.status(201).json({
      success: true,
      message: 'SOS distress event logged into marineproject.sos_events and notification dispatched',
      event,
    });
  } catch (err: any) {
    return res.status(500).json({ success: false, message: err.message });
  }
});

/**
 * POST /api/marine-db/reset
 * Reset all 13 tables back to the user's initial seed data
 */
marineDbRouter.post('/reset', (_req: Request, res: Response) => {
  try {
    const status = marinePostgresService.resetToDefaultSeed();
    return res.json({
      success: true,
      message: 'All 13 marineproject tables reset to user initial seed values.',
      status,
    });
  } catch (err: any) {
    return res.status(500).json({ success: false, message: err.message });
  }
});

/**
 * GET /api/marine-db/export-sql
 * Return the raw SQL script
 */
marineDbRouter.get('/export-sql', (_req: Request, res: Response) => {
  try {
    const sqlPath = path.resolve(__dirname, '../../marineproject_schema.sql');
    if (!fs.existsSync(sqlPath)) {
      return res.status(404).send('-- SQL file not found');
    }
    const sql = fs.readFileSync(sqlPath, 'utf8');
    res.setHeader('Content-Type', 'application/sql');
    res.setHeader('Content-Disposition', 'attachment; filename="marineproject_schema.sql"');
    return res.send(sql);
  } catch (err: any) {
    return res.status(500).json({ success: false, message: err.message });
  }
});
