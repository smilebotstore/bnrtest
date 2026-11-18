/**
 * Client Info & User Agent Parser Utility
 * Extracts IP, OS, Browser, and Timestamp for Security Audit Logging
 */

function isIpv4(ip) {
    return typeof ip === 'string' && /^(\d{1,3}\.){3}\d{1,3}$/.test(ip.trim());
}

function formatTimezone(ianaTz) {
    let clean = (ianaTz || '').trim();
    if (!clean) clean = 'Asia/Jakarta';

    // Indonesian major timezones
    if (clean === 'Asia/Jakarta' || clean === 'Asia/Pontianak') {
        return { display: 'Asia/Jakarta (WIB)', key: 'Asia/Jakarta', abbr: 'WIB' };
    }
    if (clean === 'Asia/Makassar' || clean === 'Asia/Ujung_Pandang' || clean === 'Asia/Bali') {
        return { display: 'Asia/Makassar (WITA)', key: 'Asia/Makassar', abbr: 'WITA' };
    }
    if (clean === 'Asia/Jayapura') {
        return { display: 'Asia/Jayapura (WIT)', key: 'Asia/Jayapura', abbr: 'WIT' };
    }

    // Other global timezones
    try {
        const now = new Date();
        const str = now.toLocaleString('en-US', { timeZone: clean, timeZoneName: 'short' });
        const match = str.match(/([A-Z0-9+-]{3,8})$/);
        const abbr = match ? match[1] : 'Local';
        return { display: `${clean} (${abbr})`, key: clean, abbr };
    } catch {
        return { display: `${clean} (WIB)`, key: 'Asia/Jakarta', abbr: 'WIB' };
    }
}

function parseClientInfo(req, bodyTimezone, bodyOs, bodyBrowser) {
    // 1. Check client-reported IPv4 from request body or custom header
    let detectedIpv4 = null;
    const bodyIpv4 = req.body?.clientIpv4 || req.query?.clientIpv4;
    const headerIpv4 = req.headers['x-client-ipv4'];

    if (isIpv4(bodyIpv4)) {
        detectedIpv4 = bodyIpv4.trim();
    } else if (isIpv4(headerIpv4)) {
        detectedIpv4 = headerIpv4.trim();
    }

    // 2. Collect candidate IP strings from incoming server / proxy headers
    const candidateIps = [];
    ['x-forwarded-for', 'x-nf-client-connection-ip', 'client-ip', 'x-real-ip', 'cf-connecting-ip'].forEach(h => {
        const val = req.headers[h];
        if (typeof val === 'string') {
            val.split(',').forEach(part => {
                const clean = part.trim();
                if (clean) candidateIps.push(clean);
            });
        }
    });

    if (req.socket?.remoteAddress) candidateIps.push(req.socket.remoteAddress);
    if (req.ip) candidateIps.push(req.ip);

    // Look for any valid IPv4 in candidate headers
    if (!detectedIpv4) {
        for (let raw of candidateIps) {
            let clean = raw;
            if (clean.startsWith('::ffff:')) {
                clean = clean.replace('::ffff:', '');
            }
            if (isIpv4(clean)) {
                detectedIpv4 = clean;
                // If public IPv4, break immediately
                if (!clean.startsWith('10.') && !clean.startsWith('192.168.') && !clean.startsWith('172.16.') && clean !== '127.0.0.1') {
                    break;
                }
            }
        }
    }

    // 3. Fallback: Parse 6to4 embedded IPv4 (2002:WWXX:YYZZ::)
    if (!detectedIpv4) {
        for (let raw of candidateIps) {
            const match6to4 = raw.match(/^2002:([0-9a-fA-F]{1,4}):([0-9a-fA-F]{1,4}):/);
            if (match6to4) {
                const part1 = parseInt(match6to4[1], 16);
                const part2 = parseInt(match6to4[2], 16);
                const o1 = (part1 >> 8) & 255;
                const o2 = part1 & 255;
                const o3 = (part2 >> 8) & 255;
                const o4 = part2 & 255;
                detectedIpv4 = `${o1}.${o2}.${o3}.${o4}`;
                break;
            }
        }
    }

    let ip = detectedIpv4;

    // Final fallback if truly no IPv4 was found
    if (!ip) {
        const primary = candidateIps[0] || '127.0.0.1';
        if (primary === '::1' || primary === '::ffff:127.0.0.1' || primary === '127.0.0.1') {
            ip = '127.0.0.1 (Localhost)';
        } else {
            ip = primary.replace('::ffff:', '');
        }
    } else if (ip === '127.0.0.1' || ip === '::1') {
        ip = '127.0.0.1 (Localhost)';
    }

    // 4. Device Operating System (OS) Detection based on user's device
    const userAgent = req.headers['user-agent'] || 'Unknown Agent';
    let os = bodyOs || req.body?.clientOs || req.headers['x-client-os'];
    let browser = bodyBrowser || req.body?.clientBrowser || req.headers['x-client-browser'];

    if (!os || typeof os !== 'string' || os.trim() === '') {
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
        } else if (/iPhone/i.test(userAgent)) {
            const match = userAgent.match(/OS\s([0-9_]+)/i);
            os = match ? `iOS ${match[1].replace(/_/g, '.')}` : 'iOS (iPhone)';
        } else if (/iPad/i.test(userAgent)) {
            os = 'iPadOS';
        } else if (/Macintosh|Mac OS X/i.test(userAgent)) {
            os = 'macOS';
        } else if (/Linux/i.test(userAgent)) {
            os = 'Linux';
        } else if (/CrOS/i.test(userAgent)) {
            os = 'ChromeOS';
        } else {
            os = 'Unknown OS';
        }
    }

    // 5. Browser Detection
    if (!browser || typeof browser !== 'string' || browser.trim() === '') {
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
        } else {
            browser = 'Unknown Browser';
        }
    }

    // 6. Timezone based on user's device
    const rawTz = bodyTimezone || req.body?.timezone || req.headers['x-client-timezone'];
    const tzInfo = formatTimezone(rawTz);
    const timezone = tzInfo.display;

    // 7. Formatted Date & Time is ALWAYS in WIB (Official BNR Server Time)
    const now = new Date();
    const formattedDateWIB = `${now.toLocaleString('id-ID', { timeZone: 'Asia/Jakarta' })} WIB`;

    return {
        ip,
        browser,
        os,
        userAgent,
        timezone,
        timestamp: Date.now(),
        loginTime: formattedDateWIB
    };
}

module.exports = { parseClientInfo };
