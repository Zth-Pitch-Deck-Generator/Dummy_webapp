// backend/middleware/requestLogger.ts
import { Request, Response, NextFunction } from "express";

interface RequestWithFile extends Request {
  file?: Express.Multer.File;
  files?: Express.Multer.File[];
}

// Console color codes for better readability
const colors = {
  reset: "\x1b[0m",
  bright: "\x1b[1m",
  dim: "\x1b[2m",
  red: "\x1b[31m",
  green: "\x1b[32m",
  yellow: "\x1b[33m",
  blue: "\x1b[34m",
  magenta: "\x1b[35m",
  cyan: "\x1b[36m",
  white: "\x1b[37m",
};

/**
 * Get status code color
 */
function getStatusColor(statusCode: number): string {
  if (statusCode >= 500) return colors.red;
  if (statusCode >= 400) return colors.yellow;
  if (statusCode >= 300) return colors.cyan;
  if (statusCode >= 200) return colors.green;
  return colors.white;
}

/**
 * Get method color
 */
function getMethodColor(method: string): string {
  switch (method.toUpperCase()) {
    case "GET": return colors.blue;
    case "POST": return colors.green;
    case "PUT": return colors.yellow;
    case "DELETE": return colors.red;
    case "PATCH": return colors.magenta;
    default: return colors.white;
  }
}

/**
 * Custom request logging middleware for debugging
 * Logs method, URL, headers, body, file info, response status, and duration
 */
export function requestLogger(req: RequestWithFile, res: Response, next: NextFunction) {
  const startTime = Date.now();
  const timestamp = new Date().toISOString();
  const method = req.method.toUpperCase();
  const url = req.originalUrl || req.url;
  const methodColor = getMethodColor(method);

  // Log incoming request with colors
  console.log("\n" + colors.bright + "=".repeat(80) + colors.reset);
  console.log(
    colors.dim + `[${timestamp}]` + colors.reset + " " +
    methodColor + colors.bright + method + colors.reset + " " +
    colors.cyan + url + colors.reset
  );
  console.log(colors.dim + "-".repeat(80) + colors.reset);

  // Log IP address
  const clientIp = req.ip || req.socket.remoteAddress || "unknown";
  console.log(colors.dim + `IP: ${clientIp}` + colors.reset);

  // Log headers (sanitize sensitive data)
  const headers: Record<string, string> = {};
  Object.keys(req.headers).forEach((key) => {
    const lowerKey = key.toLowerCase();
    if (lowerKey === "authorization") {
      // Show only first 20 chars of token for debugging
      const authHeader = req.headers[key] as string;
      headers[key] = authHeader ? `${authHeader.substring(0, 20)}...` : "none";
    } else {
      headers[key] = req.headers[key] as string;
    }
  });
  console.log(colors.blue + "Headers:" + colors.reset, JSON.stringify(headers, null, 2));

  // Log query parameters
  if (Object.keys(req.query).length > 0) {
    console.log(colors.blue + "Query:" + colors.reset, JSON.stringify(req.query, null, 2));
  }

  // Log request body (skip for file uploads to avoid logging binary data)
  if (req.body && Object.keys(req.body).length > 0 && !req.file && !req.files) {
    // Truncate large bodies for readability
    const bodyStr = JSON.stringify(req.body);
    if (bodyStr.length > 1000) {
      console.log(colors.blue + "Body:" + colors.reset, bodyStr.substring(0, 1000) + colors.dim + "... (truncated)" + colors.reset);
    } else {
      console.log(colors.blue + "Body:" + colors.reset, JSON.stringify(req.body, null, 2));
    }
  }

  // Capture response data
  const originalSend = res.send;
  res.send = function (body: any) {
    const duration = Date.now() - startTime;
    const responseSize = body ? JSON.stringify(body).length : 0;
    const statusColor = getStatusColor(res.statusCode);
    const durationColor = duration > 1000 ? colors.yellow : duration > 500 ? colors.cyan : colors.green;

    // Log file upload info (check after multer has processed)
    if (req.file) {
      console.log(colors.magenta + "File Upload:" + colors.reset, {
        fieldname: req.file.fieldname,
        originalname: req.file.originalname,
        mimetype: req.file.mimetype,
        size: `${(req.file.size / 1024).toFixed(2)} KB`,
      });
    }

    if (req.files && Array.isArray(req.files) && req.files.length > 0) {
      console.log(colors.magenta + "Files Uploaded:" + colors.reset, req.files.map((f) => ({
        fieldname: f.fieldname,
        originalname: f.originalname,
        mimetype: f.mimetype,
        size: `${(f.size / 1024).toFixed(2)} KB`,
      })));
    }

    console.log(colors.dim + "-".repeat(80) + colors.reset);
    
    // Log response with colors
    const responseTime = new Date().toISOString();
    console.log(
      colors.dim + `[${responseTime}]` + colors.reset + " " +
      statusColor + colors.bright + `Response: ${res.statusCode}` + colors.reset + " | " +
      durationColor + `Duration: ${duration}ms` + colors.reset + " | " +
      colors.cyan + `Size: ${(responseSize / 1024).toFixed(2)} KB` + colors.reset
    );

    // Log response body for errors or small responses
    if (res.statusCode >= 400 || (responseSize > 0 && responseSize < 500)) {
      try {
        const parsedBody = typeof body === "string" ? JSON.parse(body) : body;
        console.log(statusColor + "Response Body:" + colors.reset, JSON.stringify(parsedBody, null, 2));
      } catch {
        // If not JSON, log first 500 chars
        const bodyStr = String(body);
        console.log(statusColor + "Response Body:" + colors.reset, bodyStr.substring(0, 500) + (bodyStr.length > 500 ? "..." : ""));
      }
    } else if (responseSize > 0) {
      console.log(colors.dim + `Response Body: (too large to log, size: ${(responseSize / 1024).toFixed(2)} KB)` + colors.reset);
    }

    console.log(colors.bright + "=".repeat(80) + colors.reset + "\n");

    return originalSend.call(this, body);
  };

  next();
}

