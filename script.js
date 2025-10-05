document.addEventListener('DOMContentLoaded', () => {

    // --- Configuration ---
    const notes = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];

    // --- DOM Element References ---
    const noteSelector = document.getElementById('note-selector');
    const playPauseBtn = document.getElementById('play-pause-btn');
    const playIcon = document.getElementById('play-icon');
    const pauseIcon = document.getElementById('pause-icon');

    // --- Web Audio API Setup ---
    const audioContext = new (window.AudioContext || window.webkitAudioContext)();
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

        // 1. Immediately update the visual highlight for instant feedback.
        if (activeButton) {
            activeButton.classList.remove('active');
        }
        clickedButton.classList.add('active');
        
        // 2. Stop any existing audio source and resume context if needed.
        stopAudio();
        if (audioContext.state === 'suspended') {
            await audioContext.resume();
        }

        const note = clickedButton.dataset.note;
        const encodedNote = encodeURIComponent(note);
        const filePath = `Tanpura ${encodedNote}.wav`;
        
        // 3. Load and play the new sound.
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
            currentSource.connect(audioContext.destination);
            currentSource.start(0);

            // On successful load, officially set this as the active button.
            activeButton = buttonElement;
            updatePlayPauseButton(true);
            playPauseBtn.disabled = false;

        } catch (error) {
            console.error('Audio Error:', error);
            
            // If loading fails, remove the highlight we added prematurely.
            buttonElement.classList.remove('active');
            activeButton = null;
            
            stopAudio();
        }
    }
    
    // ===== THIS FUNCTION IS FIXED =====
    function handlePlayPause() {
        if (!isContextUnlocked) unlockAudioContext();

        if (audioContext.state === 'running') {
            audioContext.suspend().then(() => {
                updatePlayPauseButton(false);
            });
        } else if (audioContext.state === 'suspended') {
            // Corrected 'audio.resume()' to 'audioContext.resume()'
            audioContext.resume().then(() => {
                updatePlayPauseButton(true);
            });
        }
    }

    function stopAudio() {
        if (currentSource) {
            currentSource.stop();
            currentSource = null;
        }
    }

    function updatePlayPauseButton(isPlaying) {
        if (isPlaying) {
            playIcon.style.display = 'none';
            pauseIcon.style.display = 'block';
        } else {
            playIcon.style.display = 'block';
            pauseIcon.style.display = 'none';
        }
    }

    // --- Initialisation ---
    createNoteButtons();
    playPauseBtn.addEventListener('click', handlePlayPause);
});