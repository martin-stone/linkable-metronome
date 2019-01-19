(function () {
    const errorDiv = watchErrors();
    const AudioContext = window.AudioContext || window.webkitAudioContext;
    const initialBpm = readBpm();
    updatePage(initialBpm);
    
    if (isBrowserSupported()) {
        return main();
    }
    else {
        return browserMessage();
    }

    function main() {
        // Give context time to transition to "running" state (Firefox).
        // Else we'll assume that we need a touch event and begin stopped.
        const context = new AudioContext();
        setTimeout(begin, 500);

        function begin() {
            const canAutoplay = context.state == "running";
            var bpm = initialBpm;
            var source = null;
            var buffer = null;

            setUpLinks(onClickLink);
            attachButton(onStartStopClick);
            updateAudio(bpm, canAutoplay);
            updateButton(source);
            return;

            function onClickLink(updateBpm) {
                bpm = Math.max(1, updateBpm(bpm));
                updateAudio(bpm);
                updatePage(bpm);
            }

            function updateAudio(bpm, forceStart) {
                const shouldStart = !!source || forceStart;
                buffer = createBuffer(context, bpm);
                if (shouldStart) {
                    start();
                }
            }

            function start() {
                stop();
                source = createSource(context, buffer)
                source.start();
            }

            function stop() {
                if (source) {
                    source.stop();
                    source = null;
                }
            }
        
            function onStartStopClick() {
                if (context.state != "running") {
                    context.resume().then(onStartStopClick);
                }
                else { 
                    if (source) {
                        stop()
                    }
                    else {
                        start();
                    }
                    updateButton(source);
                }
            }

        }
    }

    function attachButton(onClick) {
        const button = document.getElementById("start-stop");
        button.onclick = onClick;
    }

    function setUpLinks(onClickLink) {
        const addLinks = Array.from(document.getElementById("add-links").children);
        addLinks.forEach(function (a) {
            a.onclick = function () {
                const delta = parseInt(a.innerText)
                onClickLink(function(bpm) {
                    return bpm + delta;
                });
            };
        });
        const timesLinks = Array.from(document.getElementById("times-links").children);
        timesLinks.forEach(function (a) {
            const op = a.innerText.substring(0,1);
            const num = parseInt(a.innerText.substring(1));
            const factor = op === "÷" ? 1 / num : num;
            a.onclick = function () {
                onClickLink(function(bpm) {
                    return Math.round(bpm * factor);
                });
            };
        });
    }

    function updatePage(bpm) {
        document.getElementById("title").innerText = bpm; 
        document.title = document.title.replace(/\d+/, bpm);
        history.replaceState({}, document.title.replace(/\d+/, bpm), "?bpm="+bpm);
    }

    function updateButton(source) {
        const button = document.getElementById("start-stop");
        button.innerText = source ? "Stop" : "Start";
    }

    function createSource(context, buffer) {
        const source = context.createBufferSource();
        source.loop = true;
        source.buffer = buffer;
        source.connect(context.destination);
        return source;
    }

    function createBuffer(context, bpm) {
        const sr = context.sampleRate;
        const beatsPerBar = 1;
        const beatSecs = 60 / bpm;
        const beatSamps = Math.round(sr * beatSecs);
        const barSamps = beatsPerBar * beatSamps;

        const buffer = context.createBuffer(1, barSamps, sr);
        const data = buffer.getChannelData(0);
        for (var i = 0; i < buffer.length; i++) {
            const iBeat = i % beatSamps;
            data[i] = click(iBeat / sr);
        }
        return buffer;
    }

    function click(tSec) {
        // Cosine blend from sharp 1 down to zero, based on clickToneFreq.
        const clickToneFreq = 1000; // Hz
        const period = 0.5 / clickToneFreq;
        return tSec > period 
            ? 0 
            : 0.5 * (1 + Math.cos(2 * Math.PI * clickToneFreq * tSec));
    }

    function readBpm() {
        const match = /bpm=(\d+)/gi.exec(document.location.search);
        return match ? parseInt(match[1]) : 120;
    }

    function isBrowserSupported() {
        return (typeof AudioContext == "function"
            && typeof Array.from == "function"
            && typeof history.replaceState == "function"
        );
    }

    function browserMessage() {
        if (probablyHuman()) {
            errorDiv.innerText = "Your browser is not supported";
        }
        // else keep the page clean for the bot.
    }

    function watchErrors() {
        const errorDiv = document.getElementById("error-message");
        if (probablyHuman()) {
            window.addEventListener('error', function(event) { 
                errorDiv.innerText = 
                    event.message +
                    "\n(Line " + event.lineno +")";
            });
        }
        return errorDiv;
    }

    function probablyHuman() {
        return !/bot|crawl|spider/i.test(navigator.userAgent);
    }

})();