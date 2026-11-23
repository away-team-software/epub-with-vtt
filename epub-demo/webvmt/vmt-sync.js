/*
 * (c) Copyright 2025-2026 Away Team Software (www.awayteam.co.uk)
 */
import * as stream from '../custom-cues/streamcue.js';
import * as parser from './vmt-sync-parser.js';

const SECS_DP = 3;

//var toString = obj => Object.entries(obj).map(([k, v]) => typeof v == 'object' ? `${k}: {${toString(v)}}` : `${k}: ${v}`).join(', ');

function getLatestStartTime(cueList) {
    var latestStartTime = -Infinity;
    for (const cue of cueList) {
        if (cue.startTime > latestStartTime) {
            latestStartTime = cue.startTime;
        }
    }
    return latestStartTime;
}

function syncToCues(vmtSync) {
    var cues = [];
    for (var s = 0; s < vmtSync.length; s++) {
        const dataCues = parser.parseCuePayload(vmtSync[s]);
        for (var c = 0; c < dataCues.length; c++) {
            var cue = {start: vmtSync[s].start, end: vmtSync[s].end}
            cue.class = DataCuePolyfill;
            cue.content = {type: dataCues[c].type, value: dataCues[c].data};
            if (dataCues[c].hasOwnProperty('id')) { // stream cue
                cue.class = stream.StreamCue;
                cue.content.id  = dataCues[c].id;
            }
            cues.push(cue);
        }
    }
    return cues;
}

function addCuesToTrack(cues, track, onEnter, onExit) {
    for (var c = 0; c < cues.length; c++) {
        // create cue
        var cue;
        switch (cues[c].class.name) { // use name to avoid unknown cue class errors
            case 'DataCuePolyfill': // DataCue
                cue = new (cues[c].class)(cues[c].start, cues[c].end, cues[c].content.value, cues[c].content.type);
                break;

            case 'StreamCue': // StreamCue
                cue = new (cues[c].class)(cues[c].start, cues[c].end, cues[c].content.value, cues[c].content.type, cues[c].content.id);
                break;

            default: // custom cue
                cue = new (cues[c].class)(cues[c].start, cues[c].end, cues[c].content);
                break;
        }

    	// add cue listeners
        if (onEnter) {
            cue.addEventListener('enter', onEnter);
        }
        if (onExit) {
            cue.addEventListener('exit', onExit);
        }

    	// add cue to track
    	track.addCue(cue);
    }
}

function getCueContent(cue) {
    var content = {};
    switch (cue.constructor.name) { // use name to avoid unknown cue class errors
        case 'CountCue':
            content = Number(cue.count);
            break;

        case 'ColourCue':
            content = {background: cue.background, foreground: cue.foreground};
            break;

    	case 'DataCuePolyfill':
            content = {type: cue.type, value: cue.value};
            break;

        default:
            break;
    }
    return content;
}

export { syncToCues, addCuesToTrack };
