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
        const bpm = parseFloat(options.bpm) || 120;

        const context = new window.AudioContext();
        const buffer = createBuffer(context, bpm);
        attachButton(buffer, context);
        renderHtml(bpm);
    }

    function renderHtml(bpm) {
        document.title = document.title.replace("?", bpm);
        document.getElementById("title").innerText = bpm;
        const links = document.getElementById("bpm-links");
        links.innerHTML = ["-5", "-1", "+1", "+5"].map(function (offset) {
            const href = "?bpm=" + (bpm + parseFloat(offset));
            return '<a href="' + href + '">' + offset + "</a>";
        }).join("");
    }

    function attachButton(buffer, context) {
        var source = null;
        const button = document.getElementById("start-stop");
        button.addEventListener("click", function () {
            if (!source) {
                source = createSource(context, buffer)
                source.start();
                button.innerText = "Stop";
            }
            else {
                source.stop();
                source = null;
                button.innerText = "Start";
            }
        });
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
        const beatsPerBar = 4;
        const beatSecs = 60 / bpm;
        const beatSamps = Math.round(sr * beatSecs);
        const barSamps = beatsPerBar * beatSamps;

        const buffer = context.createBuffer(1, barSamps, sr);
        const data = buffer.getChannelData(0);
        for (var i = 0; i < buffer.length; i++) {
            const ibeat = i % beatSamps;
            data[i] = sinc(ibeat / sr * 6000);
        }
        return buffer;
    }

    function sinc(x) {
        return x === 0 ? 1 : Math.sin(x) / x;
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
        return (typeof Object.assign == "function") && (typeof window.AudioContext == "function");
    }

    function browserMessage() {
        document.body.innerHTML = "Your browser is not supported";
    }
})();