(function () {
    if (isBrowserSupported()) {
        return main();
    }
    else {
        return browserMessage();
    }

    function main() {
        const defaults = {
            bpm: 120,
        }
        const options = Object.assign(defaults, readParams());
        const initialBpm = parseFloat(options.bpm) || 120;
        const context = new window.AudioContext();

        updatePage(initialBpm);

        // Give context time to transition to "running" state (Firefox).
        // Else we'll assume that we need a touch event and begin stopped.
        setTimeout(begin, 500);

        function begin() {
            const canAutoplay = context.state == "running"
            var bpm = initialBpm;
            var source = null;

            setUpLinks(onClickLink);
            attachButton(onStartStopClick);
            updateAudio(bpm, canAutoplay);
            updateButton(source);
            return;

            function onClickLink(deltaBpm) {
                bpm = Math.max(1, bpm + deltaBpm);
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

    function attachButton(onClick) {
        const button = document.getElementById("start-stop");
        button.onclick = onClick;
    }

    function setUpLinks(onClickLink) {
        const links = Array.from(document.getElementById("bpm-links").children);
        links.forEach(function (a) {
            a.onclick = function () {
                onClickLink(parseInt(a.innerText));
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
        const sr = 8000;
        const beatsPerBar = 1;
        const beatSecs = 60 / bpm;
        const beatSamps = Math.round(sr * beatSecs);
        const barSamps = beatsPerBar * beatSamps;

        const buffer = context.createBuffer(1, barSamps, sr);
        const data = buffer.getChannelData(0);
        for (var i = 0; i < buffer.length; i++) {
            const ibeat = i % beatSamps;
            data[i] = click(ibeat / sr * 10000);
        }
        return buffer;
    }

    function click(x) {
        return 1 / x;
    }

    function readParams() {
        const args = document.location.search.substring(1).split("&");
        const opts = {};
        args.forEach(function (keyValStr) {
            const keyVal = keyValStr.split("=");
            opts[keyVal[0]] = keyVal[1];
        });
        return opts;
    }

    function isBrowserSupported() {
        return (typeof Object.assign == "function") && (typeof window.AudioContext == "function"); //xxx Array.from , history.replaceState
    }

    function browserMessage() {
        document.body.innerHTML = "Your browser is not supported";
    }
})();