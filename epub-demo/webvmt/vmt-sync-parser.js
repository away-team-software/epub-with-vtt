/*
 * (c) Copyright 2025-2026 Away Team Software (www.awayteam.co.uk)
 */
const NEG_INF = Number.MIN_VALUE; // -Infinity not supported by TextTrackCue

function parseVmt(req) {
    //console.log('parseVmt: ' + isInit);
    var cueList = [];

    // apply file transforms
    req = req.replaceAll(/\0/g, '\uFFFD'); // NULL -> U+FFFD
    req = req.replaceAll(/\r\n/g, '\n'); // CRLF -> LF
    req = req.replaceAll(/\r/g, '\n'); // CR -> LF

    // sanity check
    if (!req.startsWith('WEBVMT')) { // not first line
        console.error('Missing WEBVMT');
        return cueList;
    }

    // parse blocks
    var blocks = req.split('\n\n'); // block separator
    var preCue = true;
    //console.log('parseVmt: parse ' + blocks.length + ' blocks');
    for (var b = 0; b < blocks.length; b++) {
        var block = blocks[b];
        var line = block.split('\n');
        var blockLen = line.length;
        if (blockLen == 1 && line[0] == '') {
            continue; // ignore spurious newline
        }
        if (block.startsWith('NOTE')) {
            continue; // ignore comments
        }
        if (preCue) {
            if (block.includes('-->')) { // first cue found
                preCue = false;
            } // ignore header
        }

        if (preCue) {
            if (block.startsWith('DATA')) {
                const global = parseData(block);
                var cue = {start: NEG_INF, end: Infinity, payload: vmtSync(global)};
                cueList.push(cue);
            }
        } else { // cue
            var cue = parseCue(block, blockLen, line);
            if (cue != null) { // valid
                cueList.push(cue);
            } else { // invalid
                console.error('Bad cue\n');
            }
        }
    }
    return cueList;
}

function vmtSync(sync) {
    const quote = (sync.type.endsWith('.base64') || sync.type.endsWith('.hex') ? '"' : '');
    var vmt = "{\"sync\":{\"type\":\"" + sync.type + "\",\"data\":" + quote + sync.data + quote + "}}";
    return vmt;
}

function parseCue(block, blockLen, line) {
    var cue = null;
    var payloadStart = block.indexOf('\n') + 1; // skip 1st line
    if (line[0].includes('-->')) { // timestamp 1st
        cue = parseCueTimes(line[0]);
        cue.payload = block.substring(payloadStart, block.length);
    } else if (blockLen > 1 && line[1].includes('-->')) { // id 1st, timestamp 2nd
        cue = parseCueTimes(line[1]);
        cue.id = line[0].trim();
        payloadStart = block.indexOf('\n', payloadStart) + 1; // skip 2nd line
        cue.payload = block.substring(payloadStart, block.length);;
    }
    return cue;
}

function parseCueTimes(cueTimings) {
    var timestamp = cueTimings.split('-->');
    var time = {};
    time.start = cueSecs(timestamp[0]);
    if (timestamp[1]) { // if present
        time.end = cueSecs(timestamp[1]);
    } else {
        time.end = Infinity;
    }
    return time;
}

function cueSecs(cueTime) {
    const t = cueTime.match(/-?(\d{1,}:)?\d{2}:\d{2}(\.\d{3})/);
    if (t == null) {
        return NaN;
    }
    var ms = t[0].split('.');
    var hms = ms[0].split(':');
    var secs = Math.floor(Math.abs(hms[0])) * 60 + Math.floor(hms[1]);
    if (hms.length == 3) { // hours optional
        secs = secs * 60 + Math.floor(hms[2]);
    }
    secs += ms[1] / 1000;
    if (hms[0].indexOf('-') != -1) { // negative
        secs = -secs;
    }
    return secs;
}

function parseCuePayload(cue) {
    // add payload elements to list
    var jsonList = parseBlock(cue.payload);
    var cmdList = [];

    // parse elements list
    for (var t = 0; t < jsonList.length; t++) {
        try {
            const obj = JSON.parse(jsonList[t]);
            // identify command
            const tag = parseTag(obj);
            cmdList.push(tag);
        } catch (e) {
            if (e instanceof SyntaxError) {
                console.error('Parsing error\n');
                console.error(jsonList[t] + '\n');
            } else {
                console.error(e.name + ': ' + e.message + '\n');
            }
        }
    }
    return cmdList;
}

function parseBlock(block) {
    var results = new Array();
    var open = 0;
    var close = 0;
    var nested = 0;
    var start = 0;
    for (var i = 0; i < block.length; i++) {
        if (block.charAt(i) == '{') { // open
            if (nested == 0) { // start
                start = i;
            }
            nested++;
            open++;
        } else if (block.charAt(i) == '}') { // close
            nested--;
            close++;
            if (nested == 0) { // end
                results.push(block.substring(start, i + 1));
            }
        }
    }
    if (open != close) {
        var missing = open - close;
        if (missing > 0) {
            console.error('Parenthesis mismatch: extra open or missing close\n');
        } else {
            console.error('Parenthesis mismatch: extra close or missing open\n');
        }
    }
    return results;
}

function parseTag(obj) {
    var tag = {};
    // parse sync tag
    if (obj.hasOwnProperty('sync')) { // valid
        // parse attributes
        tag = parseAttribs(obj.sync, {type: 0, id: 1, data: 2, end: 3, dur: 4});
        tag.name = 'sync';
        // add end if required
    } else { // error
        console.error('Unknown tag: ' + firstProp(obj) + '\n');
    }
    return tag;
}

function parseAttribs(obj, tag) {
    var attribs = {};
    for (var a in tag) {
        if (obj.hasOwnProperty(a)) {
            if (a == 'end' || a == 'dur') {
                attribs[a] = cueSecs(obj[a]); // convert to time
            } else {
                attribs[a] = obj[a]; // copy
            }
        }
    }
    return attribs;
}

function parseData(block) {
    var data = {};
    const nl1 = block.indexOf("\n");
    const line1 = block.substring(0, nl1);
    if (!line1.startsWith('DATA')) {
        logError('Bad DATA block\n');
        return data;
    }
    // parse type
    var type = "";
    const kvlist = line1.split(/\s+/);
    for (const i in kvlist) {
        if (kvlist[i].indexOf(":") != -1) {
            const kv = kvlist[i].split(/\:/);
            if (kv[0] == "type") {
                type = kv[1];
                break;
            }
        }
    }
    if (type == "") {
        logError('Missing DATA type\n');
        return data;
    }
    // parse data
    data = {type: type, data: block.substring(nl1 + 1)};
    //console.log('parseData: ', data.type);
    return data;
}

function decodeBase64(base64) {
    const bin = atob(base64);
    return Uint8Array.from(bin, (m) => m.codePointAt(0));
}

function decodeHex(hex) {
    var bin = '';
    for (var i = 0; i < hex.length; i += 2) {
        var val = '0x' + hex[i] + hex[i + 1];
        bin += String.fromCharCode(Number(val));
    }
    return Uint8Array.from(bin, (m) => m.codePointAt(0));
}

function decodeCueContent(type, data, syncId) {
    var decoded;
    var s = type.lastIndexOf('.');
    var suffix = type.substring(s + 1);
    var prefix = type.substring(0, s);
    switch (suffix) {
        case 'hex':
            decoded = {type: prefix, data: decodeHex(data), syncId: syncId};
            break;
        case 'base64':
            decoded = {type: prefix, data: decodeBase64(data), syncId: syncId};
            break;
        default:
            decoded = {type: type, data: data, syncId: syncId};
            break;
    }
    return decoded;
}

function getSyncTime(syncEnd, cueStart) {
    return (syncEnd != undefined ? syncEnd : cueStart);
}

function firstProp(obj) {
    var prop = '';
    for (var p in obj) {
        prop = p;
        break; // first only
    }
    return prop;
}

export { parseVmt, parseCuePayload };
