/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { Router, Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import { executeQuery, getDbStatus } from './db';

export const signupRouter = Router();

/**
 * Health check & database connection status
 */
signupRouter.get('/health', (_req: Request, res: Response) => {
  const status = getDbStatus();
  res.json({
    status: 'ONLINE',
    service: 'Sea Guardian Marine Auth Service',
    database: status,
    timestamp: new Date().toISOString(),
  });
});

/**
 * Get all registered fishermen/users (passwords stripped)
 */
signupRouter.get('/users', async (_req: Request, res: Response) => {
  try {
    const [rows] = await executeQuery<any[]>(
      'SELECT id, name, email, boat_name, crew_count, home_port, reg_number, role, created_at FROM users ORDER BY id DESC',
      []
    );
    res.json({
      success: true,
      count: rows.length,
      users: rows,
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      message: 'Failed to retrieve registered users',
      error: error.message,
    });
  }
});

/**
 * Automatic User Registration / Sign-Up Endpoint
 * POST /api/signup
 */
signupRouter.post('/signup', async (req: Request, res: Response) => {
  try {
    const { 
      name, 
      email, 
      password, 
      boatName, 
      crewCount, 
      homePort, 
      regNumber 
    } = req.body;

    // 1. Validation: Required fields
    if (!name || !email || !password) {
      return res.status(400).json({
        success: false,
        message: 'Name, email, and password are required (பெயர், மின்னஞ்சல், கடவுச்சொல் அவசியம்).',
      });
    }

    // 2. Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email.trim())) {
      return res.status(400).json({
        success: false,
        message: 'Please provide a valid email address (சரியான மின்னஞ்சலை உள்ளிடவும்).',
      });
    }

    // 3. Password length check
    if (String(password).length < 4) {
      return res.status(400).json({
        success: false,
        message: 'Password must be at least 4 characters long (குறைந்தது 4 எழுத்துக்கள் தேவை).',
      });
    }

    const normalizedEmail = email.trim().toLowerCase();

    // 4. Parameterized query: Check if email already registered
    const checkSql = 'SELECT id FROM users WHERE email = ? LIMIT 1';
    const [existingUsers] = await executeQuery<any[]>(checkSql, [normalizedEmail]);

    if (existingUsers && existingUsers.length > 0) {
      return res.status(409).json({
        success: false,
        message: 'This email is already registered. Please log in or use another email (இந்த மின்னஞ்சல் ஏற்கனவே பதிவு செய்யப்பட்டுள்ளது).',
      });
    }

    // 5. Hash password with bcrypt
    const saltRounds = 10;
    const hashedPassword = await bcrypt.hash(password, saltRounds);

    // 6. Dynamic Parameterized Query to insert new user
    const insertSql = `
      INSERT INTO users (name, email, password, boat_name, crew_count, home_port, reg_number)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `;

    const parsedCrewCount = crewCount ? Math.max(1, Number(crewCount)) : 1;

    const [result] = await executeQuery<any>(insertSql, [
      name.trim(),
      normalizedEmail,
      hashedPassword,
      boatName ? boatName.trim() : null,
      parsedCrewCount,
      homePort ? homePort.trim() : 'Rameswaram Fishing Jetty',
      regNumber ? regNumber.trim() : null,
    ]);

    // 7. Successful registration response
    return res.status(201).json({
      success: true,
      message: 'User registered successfully! (மீனவர் பயனர் கணக்கு வெற்றிகரமாக பதிவு செய்யப்பட்டது)',
      user: {
        id: result.insertId || Date.now(),
        name: name.trim(),
        email: normalizedEmail,
        boatName: boatName ? boatName.trim() : undefined,
        crewCount: parsedCrewCount,
        homePort: homePort ? homePort.trim() : 'Rameswaram Fishing Jetty',
        regNumber: regNumber ? regNumber.trim() : undefined,
        role: 'FISHERMAN',
      },
    });

  } catch (error: any) {
    console.error('Error during /api/signup:', error);

    // MySQL Duplicate Key Error code (ER_DUP_ENTRY)
    if (error.code === 'ER_DUP_ENTRY') {
      return res.status(409).json({
        success: false,
        message: 'Email already exists in the system (மின்னஞ்சல் ஏற்கனவே பயன்பாட்டில் உள்ளது).',
      });
    }

    return res.status(500).json({
      success: false,
      message: 'Internal server error occurred while processing registration.',
      error: error.message,
    });
  }
});

// In-memory Cloud DB store for Telemetry points (Store & Forward)
interface CloudTelemetryLog {
  id: number;
  uuid: string;
  boatRegNo: string;
  boatName: string;
  lat: number;
  lng: number;
  sog: number;
  cog: number;
  batteryPercent: number;
  alertLevel: string;
  distanceToBorderNm: number;
  recordedAt: string;
  forwardedAt: string;
}

const cloudTelemetryDatabase: CloudTelemetryLog[] = [
  {
    id: 1,
    uuid: 'seed_pt_1',
    boatRegNo: 'IND-TN-10-MM-4421',
    boatName: 'Veera Maravan',
    lat: 9.2882,
    lng: 79.3135,
    sog: 0.0,
    cog: 85,
    batteryPercent: 98,
    alertLevel: 'SAFE',
    distanceToBorderNm: 12.4,
    recordedAt: new Date(Date.now() - 5 * 3600 * 1000).toISOString(),
    forwardedAt: new Date(Date.now() - 1 * 3600 * 1000).toISOString(),
  },
  {
    id: 2,
    uuid: 'seed_pt_2',
    boatRegNo: 'IND-TN-10-MM-4421',
    boatName: 'Veera Maravan',
    lat: 9.3180,
    lng: 79.3950,
    sog: 8.2,
    cog: 75,
    batteryPercent: 94,
    alertLevel: 'SAFE',
    distanceToBorderNm: 7.5,
    recordedAt: new Date(Date.now() - 4 * 3600 * 1000).toISOString(),
    forwardedAt: new Date(Date.now() - 1 * 3600 * 1000).toISOString(),
  },
  {
    id: 3,
    uuid: 'seed_pt_3',
    boatRegNo: 'IND-TN-10-MM-4421',
    boatName: 'Veera Maravan',
    lat: 9.3450,
    lng: 79.4620,
    sog: 3.5,
    cog: 45,
    batteryPercent: 88,
    alertLevel: 'SAFE',
    distanceToBorderNm: 3.1,
    recordedAt: new Date(Date.now() - 3 * 3600 * 1000).toISOString(),
    forwardedAt: new Date(Date.now() - 1 * 3600 * 1000).toISOString(),
  },
];
let telemetryIdCounter = 4;

/**
 * Store & Forward Sync Endpoint
 * POST /api/telemetry/sync
 * Pushes offline-recorded GNSS waypoints when vessel returns to GSM coverage.
 */
signupRouter.post('/telemetry/sync', async (req: Request, res: Response) => {
  try {
    const { boatRegNo, boatName, points } = req.body;

    if (!points || !Array.isArray(points) || points.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'No telemetry points provided in request body.',
      });
    }

    const forwardedAt = new Date().toISOString();
    let insertedCount = 0;

    for (const pt of points) {
      // Check duplicate by uuid
      const exists = cloudTelemetryDatabase.some((existing) => existing.uuid === pt.uuid);
      if (!exists) {
        cloudTelemetryDatabase.push({
          id: telemetryIdCounter++,
          uuid: pt.uuid || `pt_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
          boatRegNo: boatRegNo || pt.boatRegNo || 'IND-TN-10-MM-4421',
          boatName: boatName || pt.boatName || 'Sea Guardian Vessel',
          lat: Number(pt.lat),
          lng: Number(pt.lng),
          sog: Number(pt.sog || 0),
          cog: Number(pt.cog || 0),
          batteryPercent: Number(pt.batteryPercent || 100),
          alertLevel: pt.alertLevel || 'SAFE',
          distanceToBorderNm: Number(pt.distanceToBorderNm || 0),
          recordedAt: pt.recordedAt || forwardedAt,
          forwardedAt,
        });
        insertedCount++;
      }
    }

    console.log(`📡 [Store & Forward] Received ${points.length} waypoints, ${insertedCount} new saved to Cloud DB.`);

    return res.status(200).json({
      success: true,
      message: `Offline Store & Forward sync completed! (${insertedCount} new points pushed to Cloud Database)`,
      syncedCount: insertedCount,
      totalCloudPoints: cloudTelemetryDatabase.length,
      forwardedAt,
      syncedUuids: points.map((p) => p.uuid),
    });
  } catch (error: any) {
    console.error('Error during /api/telemetry/sync:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to process telemetry sync.',
      error: error.message,
    });
  }
});

/**
 * Retrieve Historical Voyage Tracks from Cloud Database
 * GET /api/telemetry/history
 */
signupRouter.get('/telemetry/history', (req: Request, res: Response) => {
  const { boatRegNo } = req.query;

  let results = [...cloudTelemetryDatabase];
  if (boatRegNo && typeof boatRegNo === 'string') {
    results = results.filter((r) => r.boatRegNo === boatRegNo);
  }

  // Sort chronologically ascending
  results.sort((a, b) => new Date(a.recordedAt).getTime() - new Date(b.recordedAt).getTime());

  res.json({
    success: true,
    count: results.length,
    boatRegNo: boatRegNo || 'ALL_VESSELS',
    history: results,
  });
});

/**
 * Clear Cloud Telemetry History (for fresh testing)
 * DELETE /api/telemetry/history
 */
signupRouter.delete('/telemetry/history', (_req: Request, res: Response) => {
  cloudTelemetryDatabase.length = 0;
  telemetryIdCounter = 1;
  res.json({
    success: true,
    message: 'Cloud telemetry history cleared successfully.',
  });
});
