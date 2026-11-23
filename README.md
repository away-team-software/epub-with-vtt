# epub-with-vtt
EPUB fileset with WebVTT, and simple demo player

[Demo](https://marisademeglio.github.io/epub-with-vtt/epub-demo/)

And, a side note, the standalone-xhtml folder has a self-playing xhtml + vtt file, to show compatibility.

**WebVMT Port**

The epub-demo has been ported to WebVMT as follows:
 * `.vtt` files have been converted to `.vmt`
 * Other differences can be easily seen by comparing files with their `-vmt` counterpart.
     * For example, `diff my-file.js my-file-vmt.js`

WebVMT cue payloads are not limited to text strings and can contain structured data objects with an identified type using [DataCue](https://developer.mozilla.org/en-US/docs/Web/API/DataCue) and custom cues.

[VMT Demo](https://away-team-software.github.io/epub-demo/index-vmt.html)
