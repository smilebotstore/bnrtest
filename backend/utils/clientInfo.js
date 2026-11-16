/**
 * Client Info & User Agent Parser Utility
 * Extracts IP, OS, Browser, and Timestamp for Security Audit Logging
 */

function parseClientInfo(req, bodyTimezone) {
    // 1. IP Address extraction
    let rawIp = req.headers['x-forwarded-for'] || 
               req.headers['x-real-ip'] || 
               req.socket?.remoteAddress || 
               req.ip || 
               '127.0.0.1';
               
    if (typeof rawIp === 'string' && rawIp.includes(',')) {
        rawIp = rawIp.split(',')[0].trim();
    }
    
    let ip = rawIp;
    if (ip === '::1' || ip === '::ffff:127.0.0.1' || ip === '127.0.0.1') {
        ip = '127.0.0.1 (Localhost)';
    } else if (ip.startsWith('::ffff:')) {
        ip = ip.replace('::ffff:', '');
    }

    // 2. User Agent parsing
    const userAgent = req.headers['user-agent'] || 'Unknown Agent';
    let browser = 'Unknown Browser';
    let os = 'Unknown OS';

    // Detect OS
    if (/Windows NT 10.0/i.test(userAgent)) {
        os = 'Windows 10 / 11';
    } else if (/Windows NT 6.3/i.test(userAgent)) {
        os = 'Windows 8.1';
    } else if (/Windows NT 6.2/i.test(userAgent)) {
        os = 'Windows 8';
    } else if (/Windows NT 6.1/i.test(userAgent)) {
        os = 'Windows 7';
    } else if (/Android/i.test(userAgent)) {
        const match = userAgent.match(/Android\s([0-9.]+)/i);
        os = match ? `Android ${match[1]}` : 'Android';
    } else if (/iPhone|iPad|iPod/i.test(userAgent)) {
        const match = userAgent.match(/OS\s([0-9_]+)/i);
        os = match ? `iOS ${match[1].replace(/_/g, '.')}` : 'iOS';
    } else if (/Macintosh|Mac OS X/i.test(userAgent)) {
        os = 'macOS';
    } else if (/Linux/i.test(userAgent)) {
        os = 'Linux';
    } else if (/CrOS/i.test(userAgent)) {
        os = 'ChromeOS';
    }

    // Detect Browser
    if (/Edg\/([0-9.]+)/i.test(userAgent)) {
        const match = userAgent.match(/Edg\/([0-9.]+)/i);
        browser = `Microsoft Edge ${match ? match[1].split('.')[0] : ''}`.trim();
    } else if (/OPR\/([0-9.]+)/i.test(userAgent)) {
        const match = userAgent.match(/OPR\/([0-9.]+)/i);
        browser = `Opera ${match ? match[1].split('.')[0] : ''}`.trim();
    } else if (/Chrome\/([0-9.]+)/i.test(userAgent)) {
        const match = userAgent.match(/Chrome\/([0-9.]+)/i);
        browser = `Google Chrome ${match ? match[1].split('.')[0] : ''}`.trim();
    } else if (/Firefox\/([0-9.]+)/i.test(userAgent)) {
        const match = userAgent.match(/Firefox\/([0-9.]+)/i);
        browser = `Mozilla Firefox ${match ? match[1].split('.')[0] : ''}`.trim();
    } else if (/Safari\/([0-9.]+)/i.test(userAgent) && !/Chrome/i.test(userAgent)) {
        const match = userAgent.match(/Version\/([0-9.]+)/i);
        browser = `Safari ${match ? match[1].split('.')[0] : ''}`.trim();
    }

    // 3. Timezone (Selalu menggunakan Waktu Indonesia Barat / WIB)
    const timezone = 'Asia/Jakarta (WIB)';

    // 4. Formatted Date & Time dalam format persis seperti transaction log BNR (WIB)
    const now = new Date();
    const formattedDate = `${now.toLocaleString('id-ID', { timeZone: 'Asia/Jakarta' })} WIB`;

    return {
        ip,
        browser,
        os,
        userAgent,
        timezone,
        timestamp: Date.now(),
        loginTime: formattedDate
    };
}

module.exports = { parseClientInfo };
