document.addEventListener('DOMContentLoaded', () => {
    const notes = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];

    const noteSelector = document.getElementById('note-selector');
    const playPauseBtn = document.getElementById('play-pause-btn');
    const playIcon = document.getElementById('play-icon');
    const pauseIcon = document.getElementById('pause-icon');
    const volumeSlider = document.getElementById('volume-slider');

    const audioContext = new (window.AudioContext || window.webkitAudioContext)();
    const gainNode = audioContext.createGain();
    gainNode.connect(audioContext.destination);
    gainNode.gain.value = volumeSlider ? parseFloat(volumeSlider.value) : 0.7;

    let currentSource = null;
    let activeButton = null;
    let isContextUnlocked = false;

    playPauseBtn.disabled = true;

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
        if (audioContext.state === 'suspended') await audioContext.resume();

        const note = clickedButton.dataset.note;
        const filePath = `Tanpura ${encodeURIComponent(note)}.wav`;
        await loadAndPlayAudio(filePath, clickedButton);
    }

    async function loadAndPlayAudio(url, buttonElement) {
        try {
            const response = await fetch(url);
            if (!response.ok) throw new Error(`File not found: ${url}`);

            const arrayBuffer = await response.arrayBuffer();
            const audioBuffer = await audioContext.decodeAudioData(arrayBuffer);

            currentSource = audioContext.createBufferSource();
            currentSource.buffer = audioBuffer;
            currentSource.loop = true;

            // The magic line: connect to gainNode (which is always connected to destination)
            currentSource.connect(gainNode);
            currentSource.start(0);

            activeButton = buttonElement;
            updatePlayPauseButton(true);
            playPauseBtn.disabled = false;
        } catch (err) {
            console.error(err);
            buttonElement.classList.remove('active');
            stopAudio();
        }
    }

    function handlePlayPause() {
        if (!isContextUnlocked) unlockAudioContext();

        if (audioContext.state === 'running') {
            audioContext.suspend().then(() => updatePlayPauseButton(false));
        } else {
            audioContext.resume().then(() => updatePlayPauseButton(true));
        }
    }

    function stopAudio() {
        if (currentSource) {
            try {
                currentSource.stop();
            } catch {}
            currentSource = null;
        }
    }

    function updatePlayPauseButton(isPlaying) {
        playIcon.style.display = isPlaying ? 'none' : 'block';
        pauseIcon.style.display = isPlaying ? 'block' : 'none';
    }

    // Proper, guaranteed volume control
    if (volumeSlider) {
        volumeSlider.addEventListener('input', () => {
            const val = parseFloat(volumeSlider.value);
            gainNode.gain.setValueAtTime(val, audioContext.currentTime);
        });
    }

    createNoteButtons();
    playPauseBtn.addEventListener('click', handlePlayPause);
});
