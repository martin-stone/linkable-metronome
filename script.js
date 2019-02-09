(function () {
    const errorDiv = watchErrors();
    const AudioContext = window.AudioContext || window.webkitAudioContext;
    const minBpm = 30;
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
        setUpKeyboard();
        setTimeout(begin, 500);

        function begin() {
            const canAutoplay = context.state == "running";
            var bpm = initialBpm;
            var buffer = createBuffer(context);
            var source = canAutoplay ? start() : null;

            setUpLinks(onClickLink);
            attachButton(onStartStopClick);
            updateButton(source);
            return;

            function onClickLink(updateBpm) {
                bpm = Math.max(minBpm, updateBpm(bpm));
                setSourceLoop(source, bpm);
                updatePage(bpm);
            }

            function start() {
                stop();
                source = createSource(context, buffer);
                setSourceLoop(source, bpm);
                source.start();
                return source;
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
                    source ? stop() : start();
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

    function setUpKeyboard() {
        const [...shortcutElements] = document.body.querySelectorAll("[data-shortcut]");
        const keyMap = shortcutElements.reduce(function (km, element) {
            const key = element.getAttribute("data-shortcut");
            km[key.toUpperCase()] = element;
            return km;
        }, {});

        document.body.onkeyup = function(event) {
            const element = keyMap[event.key.toUpperCase()]; 
            if (element) {
                element.click();
                element.className += " clicking";
                setTimeout(function () {
                    element.className = element.className.replace(" clicking", "");
                }, 150);
            }
        }
    }

    function setSourceLoop(source, bpm) {
        if (source) {
            source.loopEnd = 60 / bpm;
        }
    }

    function updatePage(bpm) {
        document.getElementById("title").innerText = bpm; 
        document.title = document.title.replace(/\d+/, bpm);
        history.replaceState({}, document.title.replace(/\d+/, bpm), "?bpm="+bpm);
    }

    function updateButton(source) {
        const button = document.getElementById("start-stop");
        button.innerText = source ? "Stop" : "Start";
        button.className = source ? "stop" : "start";
    }

    function createSource(context, buffer) {
        const source = context.createBufferSource();
        source.loop = true;
        source.buffer = buffer;
        source.connect(context.destination);
        return source;
    }

    function createBuffer(context) {
        const sr = context.sampleRate;
        const maxBeatSecs = 60 / minBpm;
        const bufferSamps = Math.round(sr * maxBeatSecs);
        const buffer = context.createBuffer(1, bufferSamps, sr);
        writeClick(buffer.getChannelData(0), sr);
        return buffer;
    }

    function writeClick(data, sr) {
        // Cosine blend from sharp 1 down to zero, based on clickToneFreq.
        const clickToneFreq = 1000; // Hz
        const clickSamps = sr * 0.5 / clickToneFreq;
        for (var i = 0; i < clickSamps; i++) {
            const tSec = i / sr;
            data[i] = 0.5 * (1 + Math.cos(2 * Math.PI * clickToneFreq * tSec));
        }
    }

    function readBpm() {
        const match = /bpm=(\d+)/gi.exec(document.location.search);
        return match ? Math.max(minBpm, parseInt(match[1])) : 120;
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