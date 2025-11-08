document.addEventListener('DOMContentLoaded', () => {
    // --- Config ---
    const notes = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];

    // --- DOM ---
    const noteSelector   = document.getElementById('note-selector');
    const playPauseBtn   = document.getElementById('play-pause-btn');
    const playIcon       = document.getElementById('play-icon');
    const pauseIcon      = document.getElementById('pause-icon');

    // Volume slider: if missing, create one so there’s zero excuse
    let volumeSlider = document.getElementById('volume-slider');
    if (!volumeSlider) {
        const wrap = document.createElement('div');
        wrap.className = 'volume-control';
        wrap.innerHTML = `
            <label for="volume-slider">Volume:</label>
            <input type="range" id="volume-slider" min="0" max="1" step="0.01" value="0.7">
            <button id="mute-btn" type="button" style="margin-left:.5rem">Mute</button>
        `;
        // insert after controls or at end of container
        const container = document.querySelector('.tanpura-container') || document.body;
        const controls = document.querySelector('.controls');
        (controls ? controls.after(wrap) : container.appendChild(wrap));
        volumeSlider = wrap.querySelector('#volume-slider');
    } else {
        // If slider exists, ensure range is 0..1, not 0..100
        volumeSlider.min = '0';
        volumeSlider.max = '1';
        volumeSlider.step = '0.01';
        if (isNaN(parseFloat(volumeSlider.value))) volumeSlider.value = '0.7';
        // Append a mute button next to it for blunt testing
        const muteBtn = document.createElement('button');
        muteBtn.id = 'mute-btn';
        muteBtn.type = 'button';
        muteBtn.textContent = 'Mute';
        muteBtn.style.marginLeft = '.5rem';
        volumeSlider.parentElement.appendChild(muteBtn);
    }
    const muteBtn = document.getElementById('mute-btn');

    // --- Web Audio ---
    const audioContext = new (window.AudioContext || window.webkitAudioContext)();
    // One master gain for the whole app
    const masterGain = audioContext.createGain();
    masterGain.gain.value = parseFloat(volumeSlider.value);
    masterGain.connect(audioContext.destination);

    let currentSource = null;
    let activeButton  = null;
    let isContextUnlocked = false;

    // Disable play until a note is chosen
    if (playPauseBtn) playPauseBtn.disabled = true;

    function unlockAudioContext() {
        if (audioContext.state === 'suspended') {
            audioContext.resume();
        }
        isContextUnlocked = true;
    }

    function createNoteButtons() {
        notes.forEach(note => {
            const btn = document.createElement('button');
            btn.className = 'note-button';
            btn.textContent = note;
            btn.dataset.note = note;
            btn.addEventListener('click', handleNoteClick);
            noteSelector.appendChild(btn);
        });
    }

    async function handleNoteClick(event) {
        if (!isContextUnlocked) unlockAudioContext();

        const clickedButton = event.currentTarget;
        if (activeButton) activeButton.classList.remove('active');
        clickedButton.classList.add('active');

        stopAudio();
        if (audioContext.state === 'suspended') {
            await audioContext.resume();
        }

        const note = clickedButton.dataset.note;
        const filePath = `Tanpura ${encodeURIComponent(note)}.wav`;

        await loadAndPlayAudio(filePath, clickedButton);
    }

    async function loadAndPlayAudio(url, buttonElement) {
        try {
            const res = await fetch(url, { cache: 'no-store' });
            if (!res.ok) throw new Error(`File not found: ${url}`);

            const arrayBuffer = await res.arrayBuffer();
            // decodeAudioData can be tricky on old browsers; promisify path is fine here
            const audioBuffer = await audioContext.decodeAudioData(arrayBuffer);

            // Fresh source every time
            currentSource = audioContext.createBufferSource();
            currentSource.buffer = audioBuffer;
            currentSource.loop = true;

            // CHAIN: source -> masterGain -> destination
            currentSource.connect(masterGain);

            currentSource.start(0);

            activeButton = buttonElement;
            updatePlayPauseButton(true);
            if (playPauseBtn) playPauseBtn.disabled = false;

            console.log('[tanpura] playing', url, {
                gain: masterGain.gain.value,
                ctxState: audioContext.state
            });
        } catch (err) {
            console.error('Audio Error:', err);
            if (buttonElement) buttonElement.classList.remove('active');
            activeButton = null;
            stopAudio();
        }
    }

    function handlePlayPause() {
        if (!isContextUnlocked) unlockAudioContext();

        if (audioContext.state === 'running') {
            audioContext.suspend().then(() => updatePlayPauseButton(false));
        } else if (audioContext.state === 'suspended') {
            audioContext.resume().then(() => updatePlayPauseButton(true));
        }
    }

    function stopAudio() {
        if (currentSource) {
            try { currentSource.stop(); } catch {}
            currentSource.disconnect();
            currentSource = null;
        }
    }

    function updatePlayPauseButton(isPlaying) {
        if (!playIcon || !pauseIcon) return;
        playIcon.style.display  = isPlaying ? 'none'  : 'block';
        pauseIcon.style.display = isPlaying ? 'block' : 'none';
    }

    // --- Volume + Mute wiring that absolutely does something ---
    volumeSlider.addEventListener('input', e => {
        // Using setTargetAtTime for smoothness
        const v = clamp(parseFloat(e.target.value), 0, 1);
        masterGain.gain.setTargetAtTime(v, audioContext.currentTime, 0.01);
        console.log('[tanpura] slider -> gain', v);
    });

    muteBtn.addEventListener('click', () => {
        const newVal = masterGain.gain.value > 0 ? 0 : parseFloat(volumeSlider.value) || 0.7;
        masterGain.gain.setTargetAtTime(newVal, audioContext.currentTime, 0.01);
        console.log('[tanpura] MUTE toggle -> gain', newVal);
    });

    function clamp(n, a, b) { return Math.max(a, Math.min(b, n)); }

    // --- Init ---
    createNoteButtons();
    if (playPauseBtn) playPauseBtn.addEventListener('click', handlePlayPause);

    // Loud sanity check: yank volume to 0.3 after first user gesture unlock
    document.body.addEventListener('click', function once() {
        unlockAudioContext();
        masterGain.gain.setTargetAtTime(parseFloat(volumeSlider.value), audioContext.currentTime, 0.01);
        console.log('[tanpura] context unlocked; gain now', masterGain.gain.value);
        document.body.removeEventListener('click', once);
    });
});
