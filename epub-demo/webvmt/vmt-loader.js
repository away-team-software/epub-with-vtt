/*
 * (c) Copyright 2025-2026 Away Team Software (www.awayteam.co.uk)
 */
import * as parser from './vmt-sync-parser.js';

function loadVmtFile(src, callback) {
    // parse file on load complete
    const onLoaded = function(req) {
        const vmt = parser.parseVmt(req);
        if (vmt == []) {
            console.error('Could not parse: ' + src);
        }
        callback(vmt);
    };

    if (src != "" && src != undefined) {
        // load VMT file
        getHtmlUrlAsync(src, onLoaded);
    }
}

function getHtmlUrlAsync(url, callback) {
    const req = new XMLHttpRequest();
    req.onreadystatechange = function() {
        if (req.readyState == 4 && req.status == 200) { // success
            callback(req.responseText);
        }
    };
    req.open('GET', url, true); // async
    req.overrideMimeType('text/vmt'); // prevent xml parsing error
    req.send(null);
}

export { loadVmtFile };
