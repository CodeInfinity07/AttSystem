const express = require('express');
const WebSocket = require('ws');
const crypto = require('crypto');
const fs = require('fs').promises;
const path = require('path');
const cors = require('cors');
const { EventEmitter } = require('events');

// ==================== CONFIGURATION ====================
const CONFIG = {
    PORT: 3003,
    CLUB_CODE: 2341357,
    BOTS_FILE: './fukrey.json',
    MEMBERS_FILE: './member_users.json',
    MAX_CONNECTIONS: 500,
    WEBSOCKET_URL: 'ws://ws.ls.superkinglabs.com/ws',
    WEBSOCKET_ORIGIN: 'http://ls.superkinglabs.com',

    TIMEOUTS: {
        MESSAGE_TASK: 60000,
        AUTH_RESPONSE: 10000,
        CLUB_JOIN: 10000,
        CONNECTION_TIMEOUT: 30000
    },

    DELAYS: {
        BETWEEN_MESSAGES: 600,
        RETRY_DELAY: 3000,
        KEEPALIVE_INTERVAL: 15000,
        BETWEEN_BOTS: 1000
    },

    MESSAGE_SETTINGS: {
        TOTAL_MESSAGES: 21
    }
};

// ==================== LOGGER ====================
class Logger {
    static log(level, msg, data = {}) {
        const timestamp = new Date().toISOString();
        const logEntry = `[${level}] ${timestamp} - ${msg}`;
        console.log(logEntry);
    }

    static info(msg, data) { this.log('INFO', msg, data); }
    static warn(msg, data) { this.log('WARN', msg, data); }
    static error(msg, data) { this.log('ERROR', msg, data); }
    static debug(msg, data) { this.log('DEBUG', msg, data); }
    static success(msg, data) { this.log('SUCCESS', msg, data); }
}

// ==================== UTILITIES ====================
const Utils = {
    generateId: () => `${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
    delay: (ms) => new Promise(resolve => setTimeout(resolve, ms)),

    createAuthMessage: (bot) => JSON.stringify({
        RH: "jo",
        PU: "",
        PY: JSON.stringify({ KEY: bot.key, EP: bot.ep }),
        EN: true
    }),

    createJoinClubMessage: (clubCode) => JSON.stringify({
        RH: "CBC",
        PU: "CJ",
        PY: JSON.stringify({
            IDX: "1",
            CID: clubCode.toString(),
            PI: {
                GA: false, NM: "♜NAILA DON♜", XP: 0, AD: "", ABI: "", CV: 289, WS: 0, PT: 3, LV: 1,
                snuid: "", GC: "GOHO9614", PBI: "", VT: 0, TID: 0, SEI: {}, AF: "", LVT: 0, AV: "",
                UI: "683c3e356aac4e0001161afa", CLR: [], SLBR: 0, LLC: "PK"
            },
            JTY: "15", CF: 0
        })
    }),

    createLeaveClubMessage: () => JSON.stringify({
        RH: "CBC",
        PU: "LC",
        PY: JSON.stringify({
            IDX: "1",
            TY: 0
        })
    }),

    sendMessage: (ws, message) => {
        if (ws && ws.readyState === WebSocket.OPEN) {
            try {
                const base64 = Buffer.from(message, 'utf8').toString('base64');
                ws.send(base64);
                return true;
            } catch (error) {
                Logger.error(`Failed to send message: ${error.message}`);
                return false;
            }
        }
        return false;
    },

    decodeFrame: (frame) => {
        try {
            const lengthByte = frame[1] & 127;
            let offset = 2;

            if (lengthByte === 126) offset = 4;
            else if (lengthByte === 127) offset = 10;

            const payload = frame.slice(offset);
            const base64Data = payload.toString().startsWith("ey") ? payload.toString() : frame.toString();
            const jsonString = Buffer.from(base64Data, 'base64').toString('utf-8');
            return JSON.parse(jsonString);
        } catch (error) {
            return {};
        }
    },

    async withRetry(operation, maxRetries = 2, delay = CONFIG.DELAYS.RETRY_DELAY) {
        let lastError;
        for (let attempt = 0; attempt <= maxRetries; attempt++) {
            try {
                return await operation(attempt);
            } catch (error) {
                lastError = error;
                if (attempt < maxRetries) {
                    Logger.warn(`Attempt ${attempt + 1} failed, retrying in ${delay}ms: ${error.message}`);
                    await Utils.delay(delay);
                }
            }
        }
        throw lastError;
    }
};

// ==================== FILE MANAGER ====================
const FileManager = {
    async loadBots() {
        try {
            const data = await fs.readFile(CONFIG.BOTS_FILE, 'utf8');
            const bots = JSON.parse(data);
            const validBots = Array.isArray(bots) ? bots.filter(bot =>
                bot && bot.name && bot.key && bot.ep
            ) : [];
            Logger.info(`Loaded ${validBots.length} valid bots from ${CONFIG.BOTS_FILE}`);
            return validBots;
        } catch (error) {
            Logger.warn(`Could not load ${CONFIG.BOTS_FILE}: ${error.message}`);
            return [];
        }
    },

    async saveBots(bots) {
        try {
            const backup = `${CONFIG.BOTS_FILE}.backup.${Date.now()}`;
            try {
                await fs.copyFile(CONFIG.BOTS_FILE, backup);
                Logger.debug(`Created backup: ${backup}`);
            } catch (backupError) {
                Logger.warn(`Backup creation failed: ${backupError.message}`);
            }
            await fs.writeFile(CONFIG.BOTS_FILE, JSON.stringify(bots, null, 2));
            Logger.success(`Saved ${bots.length} bots to file`);
            return true;
        } catch (error) {
            Logger.error(`Save failed: ${error.message}`);
            return false;
        }
    },

    async saveMembers(members) {
        try {
            await fs.writeFile(CONFIG.MEMBERS_FILE, JSON.stringify(members, null, 2));
            Logger.success(`Saved ${members.length} members to file`);
            return true;
        } catch (error) {
            Logger.error(`Save members failed: ${error.message}`);
            return false;
        }
    }
};

// ==================== BOT CONNECTION CLASS ====================
class BotConnection extends EventEmitter {
    constructor(bot, botId) {
        super();
        this.bot = bot;
        this.botId = botId;
        this.ws = null;
        this.isAuthenticated = false;
        this.isInClub = false;
        this.currentClubCode = null;
        this.sequenceNumber = 2;
        this.keepaliveInterval = null;
        this.timeouts = new Map();
        this.status = 'disconnected';
        this.createdAt = null;
    }

    async connect() {
        try {
            this.status = 'connecting';
            
            this.ws = new WebSocket(CONFIG.WEBSOCKET_URL, {
                headers: {
                    'Host': 'ws.ls.superkinglabs.com',
                    'Upgrade': 'websocket',
                    'Connection': 'Upgrade',
                    'Sec-WebSocket-Key': crypto.randomBytes(16).toString('base64'),
                    'Sec-WebSocket-Version': '13',
                    'Accept': '*/*',
                    'Origin': CONFIG.WEBSOCKET_ORIGIN,
                    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
                },
                timeout: 15000
            });

            this.setupEventHandlers();
            this.createdAt = Date.now();

            return new Promise((resolve, reject) => {
                const timeout = setTimeout(() => {
                    reject(new Error('Connection timeout - awaiting authentication token input'));
                }, CONFIG.TIMEOUTS.CONNECTION_TIMEOUT);

                this.once('authenticated', () => {
                    clearTimeout(timeout);
                    resolve(true);
                });

                this.once('error', (error) => {
                    clearTimeout(timeout);
                    reject(error);
                });
            });

        } catch (error) {
            this.status = 'failed';
            throw error;
        }
    }

    setupEventHandlers() {
        if (!this.ws) return;

        this.ws.on('open', () => {
            Logger.debug(`Bot ${this.bot.name} WebSocket opened`);
            this.authenticate();
        });

        this.ws.on('message', (data) => {
            try {
                const msg = Utils.decodeFrame(data);
                console.log(msg)
                this.handleMessage(msg);
            } catch (error) {
                Logger.error(`Message parse error for ${this.bot.name}: ${error.message}`);
            }
        });

        this.ws.on('error', (error) => {
            Logger.error(`WebSocket error for ${this.bot.name}: ${error.message}`);
            this.emit('error', error);
        });

        this.ws.on('close', () => {
            Logger.debug(`WebSocket closed for ${this.bot.name}`);
            this.handleDisconnection();
        });
    }

    authenticate() {
        if (!Utils.sendMessage(this.ws, Utils.createAuthMessage(this.bot))) {
            this.emit('error', new Error('Failed to send auth message'));
            return;
        }

        this.timeouts.set('auth', setTimeout(() => {
            if (!this.isAuthenticated) {
                this.emit('error', new Error('Authentication timeout'));
            }
        }, CONFIG.TIMEOUTS.AUTH_RESPONSE));
    }

    handleMessage(msg) {
        // Clear auth timeout on any successful response
        if (this.timeouts.has('auth')) {
            clearTimeout(this.timeouts.get('auth'));
            this.timeouts.delete('auth');
        }

        // Handle authentication prompt - show message and wait for token input
        if (msg.PY?.hasOwnProperty('IA')) {
            Logger.info(`Bot ${this.bot.name} received auth prompt, this.botId = ${this.botId}, waiting for token input`);
            this.status = 'awaiting-auth';
            
            // Store auth prompt globally so frontend can fetch it
            const messageJson = JSON.stringify(msg);
            const messageBase64 = Buffer.from(messageJson).toString('base64');
            Logger.info(`[AUTH_PROMPT] Storing auth prompt with botId: ${this.botId}`);
            authPrompts.set(this.botId, {
                botId: this.botId,
                botName: this.bot.name,
                message: messageBase64,
                rawMessage: msg,
                timestamp: new Date().toISOString()
            });
            Logger.info(`[AUTH_PROMPT] Auth prompts now: ${Array.from(authPrompts.keys()).join(', ')}`);
            
            // Emit event with the exact message to show in frontend
            this.emit('authPrompt', {
                botId: this.botId,
                botName: this.bot.name,
                message: msg,
                timestamp: new Date().toISOString()
            });
        }

        // Handle actual authentication when AUA is received
        if (msg.RH === "AUA") {
            Logger.success(`Bot ${this.bot.name} authenticated via AUA`);
            this.isAuthenticated = true;
            this.status = 'connected';
            
            // Start keepalive
            this.startKeepalive();
            
            this.emit('authenticated');
        }

        // Handle error responses
        if (msg.RH === "cr") {
            Logger.debug(`Received error message for ${this.bot.name}`);
        }

        // Handle club join responses
        if (msg.PU === "CJA" || msg.PU === "REA") {
            this.isInClub = true;
            
            // Clear join timeout
            if (this.timeouts.has('clubJoin')) {
                clearTimeout(this.timeouts.get('clubJoin'));
                this.timeouts.delete('clubJoin');
            }
            
            this.emit('clubJoined');
        }

        this.emit('message', msg);
    }

    startKeepalive() {
        if (this.keepaliveInterval) {
            clearInterval(this.keepaliveInterval);
        }

        this.keepaliveInterval = setInterval(() => {
            if (this.ws && this.ws.readyState === WebSocket.OPEN) {
                this.sendPingMessage();
            }
        }, CONFIG.DELAYS.KEEPALIVE_INTERVAL);
    }

    joinClub(clubCode) {
        if (!this.isAuthenticated) {
            return false;
        }

        if (!Utils.sendMessage(this.ws, Utils.createJoinClubMessage(clubCode))) {
            return false;
        }

        this.currentClubCode = clubCode;
        
        this.timeouts.set('clubJoin', setTimeout(() => {
            if (!this.isInClub) {
                Logger.warn(`Club join timeout for ${this.bot.name}`);
            }
        }, CONFIG.TIMEOUTS.CLUB_JOIN));
        
        return true;
    }

    leaveClub() {
        if (!this.isAuthenticated) {
            return false;
        }

        const success = Utils.sendMessage(this.ws, Utils.createLeaveClubMessage());
        if (success) {
            this.isInClub = false;
            this.currentClubCode = null;
        }
        return success;
    }

    sendClubMessage(message, clubCode = null) {
        const code = clubCode || this.currentClubCode || CONFIG.CLUB_CODE;
        
        const msg = {
            RH: "CBC",
            PU: "CM",
            PY: JSON.stringify({
                CID: code.toString(),
                MG: message
            }),
            SQ: this.sequenceNumber++,
            EN: false
        };

        return Utils.sendMessage(this.ws, JSON.stringify(msg));
    }

    sendPingMessage() {
        const msg = {
            RH: "JO",
            PU: "",
            PY: JSON.stringify({})
        };

        return Utils.sendMessage(this.ws, JSON.stringify(msg));
    }

    sendRawMessage(message) {
        if (this.ws && this.ws.readyState === WebSocket.OPEN) {
            try {
                this.ws.send(message);
                Logger.debug(`Sent raw message for ${this.bot.name}`);
                return true;
            } catch (error) {
                Logger.error(`Failed to send raw message: ${error.message}`);
                return false;
            }
        }
        return false;
    }

    clearTimeout(name) {
        if (this.timeouts.has(name)) {
            clearTimeout(this.timeouts.get(name));
            this.timeouts.delete(name);
        }
    }

    handleDisconnection() {
        this.status = 'disconnected';
        this.isAuthenticated = false;
        this.isInClub = false;
        this.currentClubCode = null;

        if (this.keepaliveInterval) {
            clearInterval(this.keepaliveInterval);
            this.keepaliveInterval = null;
        }

        // Clear all timeouts
        this.timeouts.forEach((timeout) => {
            clearTimeout(timeout);
        });
        this.timeouts.clear();

        this.emit('disconnected');
    }

    disconnect() {
        if (this.keepaliveInterval) {
            clearInterval(this.keepaliveInterval);
            this.keepaliveInterval = null;
        }

        // Clear all timeouts
        this.timeouts.forEach((timeout) => {
            clearTimeout(timeout);
        });
        this.timeouts.clear();

        if (this.isInClub) {
            this.leaveClub();
        }

        if (this.ws) {
            this.ws.removeAllListeners();
            this.ws.terminate();
            this.ws = null;
        }

        this.status = 'disconnected';
        this.isAuthenticated = false;
        this.isInClub = false;
    }
}

// ==================== PERSISTENT CONNECTION MANAGER ====================
class PersistentConnectionManager {
    constructor() {
        this.connections = new Map(); // botId -> BotConnection
        this.bots = new Map(); // botId -> bot data
    }

    async loadAllBots() {
        const mainBots = await FileManager.loadBots();

        // Load bots with their existing data
        mainBots.forEach((bot, index) => {
            const botId = `bot_${bot.gc}`;
            this.bots.set(botId, {
                ...bot,
                botId,
                source: 'main',
                index
            });
        });

        Logger.info(`Loaded ${this.bots.size} bots from ${CONFIG.BOTS_FILE}`);
    }

    async reloadBots() {
        Logger.info('Reloading bots from files...');
        
        // Store existing data
        const existingData = new Map();
        
        // Clear and reload
        this.bots.clear();
        const mainBots = await FileManager.loadBots();

        mainBots.forEach((bot, index) => {
            const botId = `bot_${bot.gc}`;
            const existing = existingData.get(bot.gc);
            
            this.bots.set(botId, {
                ...bot,
                botId,
                source: 'main',
                index
            });
        });
        
        Logger.success(`Reloaded ${this.bots.size} bots`);
        return this.bots.size;
    }

    async connectBot(botId) {
        Logger.info(`[connectBot] Starting with botId: ${botId}`);
        
        // Reuse existing connection if already connected
        if (this.connections.has(botId)) {
            Logger.info(`[connectBot] Connection already exists for ${botId}`);
            return { success: true, botId, message: 'Using existing connection' };
        }

        const bot = this.bots.get(botId);
        if (!bot) {
            Logger.error(`[connectBot] Bot not found for botId: ${botId}`);
            return { success: false, message: 'Bot not found' };
        }

        try {
            Logger.info(`[connectBot] Creating BotConnection for ${bot.name} with botId: ${botId}`);
            const connection = new BotConnection(bot, botId);
            Logger.info(`[connectBot] BotConnection created, connection.botId = ${connection.botId}`);
            
            // ADD CONNECTION TO MAP IMMEDIATELY before connect() so auth prompts can find it
            this.connections.set(botId, connection);
            Logger.info(`[connectBot] Connection added to map immediately. Connections now: ${Array.from(this.connections.keys()).join(', ')}`);
            
            // Handle disconnection
            connection.on('disconnected', () => {
                Logger.warn(`Bot ${bot.name} disconnected unexpectedly`);
                this.connections.delete(botId);
            });

            await connection.connect();
            
            Logger.success(`Bot ${bot.name} connected successfully with botId: ${botId}`);

            return { success: true, botId };
        } catch (error) {
            Logger.error(`Failed to connect bot ${bot.name}: ${error.message}`);
            // Remove connection from map if connect failed
            this.connections.delete(botId);
            return { success: false, message: error.message };
        }
    }

    disconnectBot(botId) {
        const connection = this.connections.get(botId);
        if (!connection) {
            return { success: false, message: 'Bot not connected' };
        }

        const bot = this.bots.get(botId);
        connection.disconnect();
        this.connections.delete(botId);
        
        Logger.info(`Bot ${bot.name} disconnected`);
        return { success: true };
    }

    getConnection(botId) {
        return this.connections.get(botId);
    }

    getAllConnectedBots() {
        return Array.from(this.connections.keys());
    }

    getStats() {
        const allBots = Array.from(this.bots.values());
        return {
            totalBots: this.bots.size,
            connected: this.connections.size,
            mainBots: allBots.filter(b => b.source === 'main').length,
            loaderBots: 0 // Not using loader bots
        };
    }

    getAllBotsWithStatus() {
        return Array.from(this.bots.entries()).map(([botId, bot]) => {
            const connection = this.connections.get(botId);
            return {
                botId,
                name: bot.name,
                gc: bot.gc || 'N/A',
                source: bot.source,
                connected: !!connection,
                inClub: connection?.isInClub || false,
                clubCode: connection?.currentClubCode || null,
                status: connection?.status || 'disconnected',
                uptime: connection ? Date.now() - connection.createdAt : 0
            };
        });
    }

    updateBotData(botId, updates) {
        const bot = this.bots.get(botId);
        if (bot) {
            Object.assign(bot, updates);
        }
    }

    disconnectAll() {
        this.connections.forEach((connection, botId) => {
            connection.disconnect();
        });
        this.connections.clear();
        Logger.info('All bots disconnected');
    }
}

// ==================== GLOBAL CONNECTION MANAGER ====================
const connectionManager = new PersistentConnectionManager();

// ==================== AUTH PROMPTS STORAGE ====================
const authPrompts = new Map(); // botId -> { botId, botName, message, timestamp }

// ==================== TASK STATE ====================
const TaskState = {
    message: {
        isRunning: false,
        total: 0,
        completed: 0,
        failed: 0,
        completedBots: new Set()
    }
};

// ==================== MESSAGE TASK ====================
const MessageTask = {
    async sendMessages(botId) {
        const connection = connectionManager.getConnection(botId);
        if (!connection) {
            return { success: false, error: 'Bot not connected' };
        }

        return new Promise((resolve) => {
            let messageCount = 0;
            let messageInterval = null;

            const timeout = setTimeout(() => {
                if (messageInterval) clearInterval(messageInterval);
                resolve({ success: false, error: 'Timeout', messagesSent: messageCount });
            }, CONFIG.TIMEOUTS.MESSAGE_TASK);

            const startSending = () => {
                messageInterval = setInterval(() => {
                    if (!TaskState.message.isRunning) {
                        clearInterval(messageInterval);
                        clearTimeout(timeout);
                        resolve({ success: false, error: 'Task stopped', messagesSent: messageCount });
                        return;
                    }

                    if (connection.sendClubMessage(messageCount.toString())) {
                        messageCount++;
                        Logger.debug(`Bot ${botId} sent message ${messageCount}/${CONFIG.MESSAGE_SETTINGS.TOTAL_MESSAGES}`);

                        if (messageCount >= CONFIG.MESSAGE_SETTINGS.TOTAL_MESSAGES) {
                            clearInterval(messageInterval);
                            clearTimeout(timeout);
                            resolve({ success: true, messagesSent: messageCount });
                        }
                    } else {
                        clearInterval(messageInterval);
                        clearTimeout(timeout);
                        resolve({ success: false, error: 'Failed to send', messagesSent: messageCount });
                    }
                }, CONFIG.DELAYS.BETWEEN_MESSAGES);
            };

            if (!connection.isInClub) {
                connection.joinClub(CONFIG.CLUB_CODE);
                connection.once('clubJoined', startSending);
            } else {
                startSending();
            }
        });
    },

    async run(botIds) {
        if (TaskState.message.isRunning) {
            return { success: false, message: 'Message task already running' };
        }

        TaskState.message.isRunning = true;
        TaskState.message.total = botIds.length;
        TaskState.message.completed = 0;
        TaskState.message.failed = 0;
        TaskState.message.completedBots.clear();

        Logger.info(`Starting message task for ${botIds.length} bots with club code: ${CONFIG.CLUB_CODE}`);

        for (const botId of botIds) {
            if (!TaskState.message.isRunning) break;

            // Join club first
            const connection = connectionManager.getConnection(botId);
            if (connection) {
                const joinSuccess = connection.joinClub(CONFIG.CLUB_CODE);
                if (!joinSuccess) {
                    Logger.warn(`Failed to join club ${CONFIG.CLUB_CODE} for bot ${botId}`);
                    TaskState.message.failed++;
                    await Utils.delay(CONFIG.DELAYS.BETWEEN_BOTS);
                    continue;
                }
                await Utils.delay(1000); // Wait for club join to process
            }

            const result = await this.sendMessages(botId);
            
            if (result.success) {
                TaskState.message.completed++;
                TaskState.message.completedBots.add(botId);
                
                Logger.success(`Message task completed for ${botId}`);
            } else {
                TaskState.message.failed++;
                Logger.error(`Message task failed for ${botId}: ${result.error}`);
            }

            await Utils.delay(CONFIG.DELAYS.BETWEEN_BOTS);
        }

        TaskState.message.isRunning = false;
        Logger.success(`Message task completed: ${TaskState.message.completed} successful, ${TaskState.message.failed} failed`);

        // Save results
        await this.saveResults();

        return { success: true };
    },

    async saveResults() {
        try {
            const allBots = Array.from(connectionManager.bots.values());
            
            const botsToSave = allBots.map(bot => ({
                name: bot.name,
                key: bot.key,
                ep: bot.ep,
                gc: bot.gc,
                snuid: bot.snuid,
                ui: bot.ui
            }));

            await FileManager.saveBots(botsToSave);
            Logger.success('Message task results saved to file');
        } catch (error) {
            Logger.error(`Failed to save message results: ${error.message}`);
        }
    },

    stop() {
        TaskState.message.isRunning = false;
        Logger.info('Message task stopped');
    }
};

// ==================== EXPRESS APP ====================
const app = express();
app.use(cors());
app.use(express.json({ limit: '1mb' }));
app.use(express.static('public'));

// ==================== API ROUTES ====================

// Config routes
app.get('/api/config/club-code', (req, res) => {
    try {
        res.json({
            success: true,
            clubCode: CONFIG.CLUB_CODE
        });
    } catch (error) {
        Logger.error(`Get club code error: ${error.message}`);
        res.status(500).json({ success: false, message: error.message });
    }
});

app.post('/api/config/club-code', (req, res) => {
    try {
        const { clubCode } = req.body;
        
        if (!clubCode || !clubCode.toString().trim()) {
            return res.json({ success: false, message: 'Club code is required' });
        }

        const newClubCode = parseInt(clubCode.toString().trim());
        
        if (isNaN(newClubCode)) {
            return res.json({ success: false, message: 'Club code must be a valid number' });
        }

        CONFIG.CLUB_CODE = newClubCode;
        Logger.success(`Club code updated to: ${CONFIG.CLUB_CODE}`);

        res.json({ 
            success: true, 
            message: 'Club code updated successfully',
            clubCode: CONFIG.CLUB_CODE
        });
    } catch (error) {
        Logger.error(`Update club code error: ${error.message}`);
        res.status(500).json({ success: false, message: error.message });
    }
});

// Health check
app.get('/api/health', (req, res) => {
    res.json({
        success: true,
        status: 'healthy',
        uptime: process.uptime(),
        memory: process.memoryUsage(),
        timestamp: new Date().toISOString()
    });
});

// Get all bots with connection status
app.get('/api/bots', (req, res) => {
    try {
        const bots = connectionManager.getAllBotsWithStatus();
        const stats = connectionManager.getStats();

        res.json({
            success: true,
            bots,
            stats
        });
    } catch (error) {
        Logger.error(`Get bots error: ${error.message}`);
        res.status(500).json({ success: false, message: error.message });
    }
});

// Reload bots from file
app.post('/api/bots/reload', async (req, res) => {
    try {
        const count = await connectionManager.reloadBots();
        res.json({ success: true, message: `Reloaded ${count} bots from file` });
    } catch (error) {
        Logger.error(`Reload bots error: ${error.message}`);
        res.status(500).json({ success: false, message: error.message });
    }
});

// Import bots
app.post('/api/bots/import', async (req, res) => {
    try {
        const { botStrings } = req.body;
        
        if (!Array.isArray(botStrings) || botStrings.length === 0) {
            return res.json({ success: false, message: 'No bot strings provided' });
        }

        const existingBots = await FileManager.loadBots();
        const existingGcs = new Set(existingBots.map(b => b.gc));
        let added = 0;
        let skipped = 0;

        for (const botString of botStrings) {
            try {
                const parts = botString.trim().split(',');
                if (parts.length < 4) {
                    Logger.warn(`Invalid bot format: ${botString}`);
                    skipped++;
                    continue;
                }

                const [base64Str, ui, gc, ...nameParts] = parts;
                const name = nameParts.join(',').trim();

                // Check if bot already exists
                if (existingGcs.has(gc)) {
                    Logger.warn(`Bot with GC ${gc} already exists, skipping`);
                    skipped++;
                    continue;
                }

                // Decode base64 to get the JSON
                const jsonString = Buffer.from(base64Str.trim(), 'base64').toString('utf-8');
                const decodedData = JSON.parse(jsonString);

                // Extract KEY and EP from nested PY field
                let key, ep;
                if (decodedData.PY) {
                    try {
                        const pyData = typeof decodedData.PY === 'string' 
                            ? JSON.parse(decodedData.PY) 
                            : decodedData.PY;
                        key = pyData.KEY;
                        ep = pyData.EP;
                    } catch (pyError) {
                        Logger.warn(`Failed to parse PY field for ${gc}: ${pyError.message}`);
                        skipped++;
                        continue;
                    }
                }

                if (!key || !ep) {
                    Logger.warn(`Missing KEY or EP for bot ${gc}`);
                    skipped++;
                    continue;
                }

                // Create bot object
                const newBot = {
                    name: name || `Bot_${gc}`,
                    key,
                    ep,
                    gc,
                    ui
                };

                // Add to file
                existingBots.push(newBot);
                existingGcs.add(gc);
                added++;

                Logger.success(`Imported bot: ${newBot.name} (${gc})`);
            } catch (error) {
                Logger.error(`Failed to parse bot string: ${error.message}`);
                skipped++;
            }
        }

        // Save updated bots to file
        if (added > 0) {
            await FileManager.saveBots(existingBots);
            
            // Reload bots in connection manager
            await connectionManager.reloadBots();
        }

        res.json({ 
            success: true, 
            message: `Added ${added} bot(s)`,
            added,
            skipped
        });
    } catch (error) {
        Logger.error(`Import bots error: ${error.message}`);
        res.status(500).json({ success: false, message: error.message });
    }
});

// Connect single bot
app.post('/api/bots/:botId/connect', async (req, res) => {
    try {
        const { botId } = req.params;
        Logger.info(`[CONNECT] Received request to connect bot: ${botId}`);
        const result = await connectionManager.connectBot(botId);
        Logger.info(`[CONNECT] Result: ${JSON.stringify(result)}`);
        res.json(result);
    } catch (error) {
        Logger.error(`Connect bot error: ${error.message}`);
        res.status(500).json({ success: false, message: error.message });
    }
});

// Disconnect single bot
app.post('/api/bots/:botId/disconnect', (req, res) => {
    try {
        const { botId } = req.params;
        const result = connectionManager.disconnectBot(botId);
        res.json(result);
    } catch (error) {
        Logger.error(`Disconnect bot error: ${error.message}`);
        res.status(500).json({ success: false, message: error.message });
    }
});

// Get pending auth prompts
app.get('/api/bots/auth/prompts', (req, res) => {
    try {
        const prompts = Array.from(authPrompts.values());
        res.json({ success: true, prompts });
    } catch (error) {
        Logger.error(`Get auth prompts error: ${error.message}`);
        res.status(500).json({ success: false, message: error.message });
    }
});

// Send authentication token
app.post('/api/bots/:botId/auth/token', (req, res) => {
    try {
        const { botId } = req.params;
        const { token } = req.body;

        Logger.info(`[AUTH_TOKEN] Received auth token request for botId: ${botId}`);
        Logger.info(`[AUTH_TOKEN] Available connections: ${Array.from(connectionManager.connections.keys()).join(', ')}`);
        Logger.info(`[AUTH_TOKEN] Available auth prompts: ${Array.from(authPrompts.keys()).join(', ')}`);

        if (!token) {
            return res.json({ success: false, message: 'Token is required' });
        }

        const connection = connectionManager.getConnection(botId);
        if (!connection) {
            Logger.error(`[AUTH_TOKEN] Connection not found for botId: ${botId}. Available connections: ${Array.from(connectionManager.connections.keys()).join(', ')}`);
            return res.json({ success: false, message: 'Bot not connected' });
        }

        Logger.info(`[AUTH_TOKEN] Found connection for ${botId}, sending token`);
        const success = connection.sendRawMessage(token);
        if (success) {
            authPrompts.delete(botId);
        }
        res.json({ success, message: success ? 'Token sent to bot server' : 'Failed to send token' });
    } catch (error) {
        Logger.error(`Auth token error: ${error.message}`);
        res.status(500).json({ success: false, message: error.message });
    }
});

// Join club
app.post('/api/bots/:botId/join', (req, res) => {
    try {
        const { botId } = req.params;
        const { clubCode } = req.body;

        const connection = connectionManager.getConnection(botId);
        if (!connection) {
            return res.json({ success: false, message: 'Bot not connected' });
        }

        const success = connection.joinClub(clubCode);
        res.json({ success, message: success ? 'Joining club...' : 'Failed to join' });
    } catch (error) {
        Logger.error(`Join club error: ${error.message}`);
        res.status(500).json({ success: false, message: error.message });
    }
});

// Leave club
app.post('/api/bots/:botId/leave', (req, res) => {
    try {
        const { botId } = req.params;

        const connection = connectionManager.getConnection(botId);
        if (!connection) {
            return res.json({ success: false, message: 'Bot not connected' });
        }

        const success = connection.leaveClub();
        res.json({ success, message: success ? 'Left club' : 'Failed to leave' });
    } catch (error) {
        Logger.error(`Leave club error: ${error.message}`);
        res.status(500).json({ success: false, message: error.message });
    }
});

// Bulk connect
app.post('/api/bots/bulk/connect', async (req, res) => {
    try {
        const { botIds } = req.body;
        
        if (!Array.isArray(botIds)) {
            return res.json({ success: false, message: 'botIds must be an array' });
        }

        res.json({ success: true, message: `Connecting ${botIds.length} bots...` });

        // Connect in background
        (async () => {
            for (const botId of botIds) {
                await connectionManager.connectBot(botId);
                await Utils.delay(500);
            }
        })();

    } catch (error) {
        Logger.error(`Bulk connect error: ${error.message}`);
        res.status(500).json({ success: false, message: error.message });
    }
});

// Bulk disconnect
app.post('/api/bots/bulk/disconnect', (req, res) => {
    try {
        const { botIds } = req.body;
        
        if (!Array.isArray(botIds)) {
            return res.json({ success: false, message: 'botIds must be an array' });
        }

        botIds.forEach(botId => {
            connectionManager.disconnectBot(botId);
        });

        res.json({ success: true, message: `Disconnected ${botIds.length} bots` });

    } catch (error) {
        Logger.error(`Bulk disconnect error: ${error.message}`);
        res.status(500).json({ success: false, message: error.message });
    }
});

// ==================== TASK ROUTES ====================


// Message task
app.get('/api/tasks/message/status', (req, res) => {
    const stats = connectionManager.getStats();
    const taskStatus = {
        ...TaskState.message,
        connectedBots: stats.connected,
        totalBots: stats.totalBots
    };
    res.json({ success: true, taskStatus });
});

app.post('/api/tasks/message/start', async (req, res) => {
    try {
        const { botIds, clubCode } = req.body;
        
        let botsToUse = botIds;
        
        if (!botIds || !Array.isArray(botIds) || botIds.length === 0) {
            // Use all connected bots - NO reconnection needed
            botsToUse = connectionManager.getAllConnectedBots();

            if (botsToUse.length === 0) {
                return res.json({ success: false, message: 'No connected bots available' });
            }
        }

        if (clubCode) {
            CONFIG.CLUB_CODE = parseInt(clubCode);
        }

        res.json({ success: true, message: `Starting message task for ${botsToUse.length} bots` });
        MessageTask.run(botsToUse);
    } catch (error) {
        Logger.error(`Message task error: ${error.message}`);
        res.status(500).json({ success: false, message: error.message });
    }
});

app.post('/api/tasks/message/stop', (req, res) => {
    MessageTask.stop();
    res.json({ success: true, message: 'Message task stopped' });
});

// Mic task
// Connection stats
app.get('/api/connections/stats', (req, res) => {
    try {
        const stats = connectionManager.getStats();
        const systemStats = {
            memory: process.memoryUsage(),
            uptime: process.uptime(),
            platform: process.platform,
            nodeVersion: process.version
        };

        res.json({
            success: true,
            connectionStats: stats,
            systemStats,
            taskStats: {
                message: TaskState.message
            },
            config: {
                botsFile: CONFIG.BOTS_FILE,
                membersFile: CONFIG.MEMBERS_FILE,
                clubCode: CONFIG.CLUB_CODE
            }
        });
    } catch (error) {
        Logger.error(`Stats error: ${error.message}`);
        res.status(500).json({ success: false, message: error.message });
    }
});

// Error handlers
app.use((error, req, res, next) => {
    Logger.error(`Server error: ${error.message}`);
    res.status(500).json({
        success: false,
        message: 'Internal server error',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
});

app.use((req, res) => {
    res.status(404).json({
        success: false,
        message: `Route ${req.method} ${req.path} not found`
    });
});

// ==================== SERVER STARTUP ====================
app.listen(CONFIG.PORT, async () => {
    Logger.success(`Server running on port ${CONFIG.PORT}`);
    Logger.info(`Dashboard: http://localhost:${CONFIG.PORT}`);
    Logger.info(`Max connections: ${CONFIG.MAX_CONNECTIONS}`);
    Logger.info(`Bots file: ${CONFIG.BOTS_FILE}`);

    try {
        await connectionManager.loadAllBots();
        Logger.success('Bot registry initialized');
    } catch (error) {
        Logger.error(`Failed to load bots: ${error.message}`);
    }

    // System monitoring
    setInterval(() => {
        const mem = process.memoryUsage();
        const memMB = Math.round(mem.heapUsed / 1024 / 1024);
        const stats = connectionManager.getStats();

        if (memMB > 250) {
            Logger.warn(`High memory usage: ${memMB}MB`);
            if (global.gc) {
                global.gc();
                Logger.info('Garbage collection triggered');
            }
        }

        if (stats.connected > 0) {
            Logger.info(`Connected bots: ${stats.connected}/${stats.totalBots}`);
        }

        if (TaskState.message.isRunning) {
            Logger.info(`Active task: message (${TaskState.message.completed}/${TaskState.message.total})`);
        }
    }, 60000); // Every 60 seconds

    Logger.info('Server initialization completed');
});

// Graceful shutdown
const shutdown = (signal) => {
    Logger.info(`Received ${signal}, shutting down gracefully...`);
    
    MessageTask.stop();
    connectionManager.disconnectAll();

    Logger.success('Shutdown completed');
    process.exit(0);
};

process.on('SIGINT', () => shutdown('SIGINT'));
process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('uncaughtException', (error) => {
    Logger.error(`Uncaught Exception: ${error.message}`);
    console.error(error.stack);
    shutdown('uncaughtException');
});
process.on('unhandledRejection', (reason, promise) => {
    Logger.error(`Unhandled Rejection at: ${promise}, reason: ${reason}`);
});