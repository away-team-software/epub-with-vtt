/*
 * (c) Copyright 2026 Away Team Software (www.awayteam.co.uk)
 */

// StreamCue class extended from DataCue

class StreamCue extends DataCuePolyfill {
    // attributes
    stream;

    // constructor
    constructor(startTime, endTime, value, type, stream) {
        // DataCue
        super(startTime, endTime, value, type);
        // StreamCue
        this.stream = stream;
    }

    // stream
    get stream() {
        return this.stream;
    }
    set stream(stream) {
        this.stream = stream;
    }
}

export { StreamCue };
