import express, { type Request, Response, NextFunction } from "express";
import { createServer } from "http";
import { spawn, type ChildProcess } from "child_process";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3055;
const BOT_SERVER_PORT = 3091;

app.use(express.json());
app.use(express.urlencoded({ extended: false }));

let botServerProcess: ChildProcess | null = null;

function startBotServer() {
  console.log("Starting bot management server...");
  
  botServerProcess = spawn("node", [path.join(__dirname, "ibot.cjs")], {
    stdio: ["inherit", "inherit", "inherit"],
    cwd: __dirname,
  });

  botServerProcess.on("error", (error) => {
    console.error("Bot server error:", error);
  });

  botServerProcess.on("exit", (code) => {
    console.log(`Bot server exited with code ${code}`);
    if (code !== 0 && code !== null) {
      console.log("Restarting bot server in 5 seconds...");
      setTimeout(startBotServer, 5000);
    }
  });
}

app.use("/api", async (req: Request, res: Response) => {
  try {
    const targetUrl = `http://localhost:${BOT_SERVER_PORT}/api${req.url}`;
    const headers: Record<string, string> = {
      "Content-Type": "application/json",
    };
    
    // Copy relevant headers from the original request
    if (req.headers["authorization"]) {
      headers["authorization"] = req.headers["authorization"] as string;
    }
    
    const fetchOptions: RequestInit = {
      method: req.method,
      headers,
    };
    
    if (req.method !== "GET" && req.method !== "HEAD") {
      if (req.body && Object.keys(req.body).length > 0) {
        fetchOptions.body = JSON.stringify(req.body);
      }
    }
    
    const response = await fetch(targetUrl, fetchOptions);
    
    // Get content type
    const contentType = response.headers.get("content-type");
    
    // Forward status and headers
    res.status(response.status);
    if (contentType) {
      res.setHeader("Content-Type", contentType);
    }
    
    // Parse and forward response
    if (contentType && contentType.includes("application/json")) {
      const data = await response.json();
      res.json(data);
    } else {
      const text = await response.text();
      res.send(text);
    }
  } catch (error) {
    console.error("Proxy error details:", {
      url: req.url,
      method: req.method,
      error: error instanceof Error ? error.message : String(error),
    });
    res.status(500).json({ 
      success: false, 
      message: "Failed to connect to bot server. Please ensure it's running." 
    });
  }
});

if (process.env.NODE_ENV === "development") {
  const vite = await import("vite");
  const viteDevServer = await vite.createServer({
    server: {
      middlewareMode: true,
      allowedHosts: true,
      hmr: process.env.REPL_ID ? false : true,
    },
    appType: "spa",
  });

  app.use(viteDevServer.middlewares);
} else {
  const distPath = path.join(__dirname, "..", "dist", "public");
  app.use(express.static(distPath));
  
  app.get("*", (_req, res) => {
    res.sendFile(path.join(distPath, "index.html"));
  });
}

const server = app.listen(PORT, () => {
  console.log(`Frontend server running on port ${PORT}`);
  console.log(`Environment: ${process.env.NODE_ENV}`);
  
  startBotServer();
});

function gracefulShutdown() {
  console.log("\nShutting down gracefully...");
  
  if (botServerProcess) {
    botServerProcess.kill("SIGTERM");
  }
  
  server.close(() => {
    console.log("Server closed");
    process.exit(0);
  });
  
  setTimeout(() => {
    console.error("Forced shutdown");
    process.exit(1);
  }, 10000);
}

process.on("SIGTERM", gracefulShutdown);
process.on("SIGINT", gracefulShutdown);
