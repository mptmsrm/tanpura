document.addEventListener('DOMContentLoaded', () => {

    const notes = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];

    const noteSelector = document.getElementById('note-selector');
    const playPauseBtn = document.getElementById('play-pause-btn');
    const playIcon = document.getElementById('play-icon');
    const pauseIcon = document.getElementById('pause-icon');
    const volumeSlider = document.getElementById('volume-slider');
    const muteBtn = document.getElementById('mute-btn');

    const audioContext = new (window.AudioContext || window.webkitAudioContext)();
    const gainNode = audioContext.createGain();
    gainNode.connect(audioContext.destination);
    gainNode.gain.value = volumeSlider ? parseFloat(volumeSlider.value) : 0.7;

    let currentSource = null;
    let activeButton = null;
    let isContextUnlocked = false;
    let isMuted = false;
    let lastVolume = gainNode.gain.value;

    playPauseBtn.disabled = true;

    function unlockAudioContext() {
        if (audioContext.state === 'suspended') {
            audioContext.resume();
        }
        isContextUnlocked = true;
    }

    function createNoteButtons() {
        notes.forEach(note => {
            const button = document.createElement('button');
            button.className = 'note-button';
            button.textContent = note;
            button.dataset.note = note;
            button.addEventListener('click', handleNoteClick);
            noteSelector.appendChild(button);
        });
    }

    async function handleNoteClick(event) {
        if (!isContextUnlocked) unlockAudioContext();

        const clickedButton = event.currentTarget;
        if (activeButton) activeButton.classList.remove('active');
        clickedButton.classList.add('active');

        stopAudio();

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
            currentSource.connect(gainNode);
            currentSource.start();

            activeButton = buttonElement;
            updatePlayPauseButton(true);
            playPauseBtn.disabled = false;

        } catch (error) {
            console.error('Audio Error:', error);
            buttonElement.classList.remove('active');
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
        playIcon.style.display = isPlaying ? 'none' : 'block';
        pauseIcon.style.display = isPlaying ? 'block' : 'none';
    }

    // Volume slider control
    if (volumeSlider) {
        volumeSlider.addEventListener('input', () => {
            const value = parseFloat(volumeSlider.value);
            gainNode.gain.setValueAtTime(value, audioContext.currentTime);
            if (!isMuted) lastVolume = value;
        });
    }

    // Mute button control
    if (muteBtn) {
        muteBtn.addEventListener('click', () => {
            if (!isMuted) {
                lastVolume = gainNode.gain.value;
                gainNode.gain.setValueAtTime(0, audioContext.currentTime);
                muteBtn.textContent = 'Unmute';
                isMuted = true;
            } else {
                gainNode.gain.setValueAtTime(lastVolume, audioContext.currentTime);
                muteBtn.textContent = 'Mute';
                isMuted = false;
            }
        });
    }

    createNoteButtons();
    playPauseBtn.addEventListener('click', handlePlayPause);
});
