// Global variables
let currentScript = '';
let currentMethod = 'first-letter';
let lettersData = [];
let buildupData = [];
let backwardsData = [];
let currentBuildupLevel = 0;
let currentBackwardsIndex = 0;

// DOM elements
const scriptInput = document.getElementById('script-input');
const processScriptBtn = document.getElementById('process-script');
const methodNav = document.querySelectorAll('.nav-btn');
const methodSections = document.querySelectorAll('.method-section');

// First Letter Method elements
const lettersDisplay = document.getElementById('letters-display');
const revealAllBtn = document.getElementById('reveal-all-letters');
const hideAllBtn = document.getElementById('hide-all-letters');
const newScriptLettersBtn = document.getElementById('new-script-letters');

// Line Buildup Method elements
const startBuildupBtn = document.getElementById('start-buildup');
const nextBuildupBtn = document.getElementById('next-buildup');
const resetBuildupBtn = document.getElementById('reset-buildup');
const buildupDisplay = document.getElementById('buildup-display');
const currentLine = document.querySelector('.current-line');
const progressIndicator = document.querySelector('.progress-indicator');

// Backwards Method elements
const startBackwardsBtn = document.getElementById('start-backwards');
const checkBackwardsBtn = document.getElementById('check-backwards');
const resetBackwardsBtn = document.getElementById('reset-backwards');
const backwardsPrompt = document.querySelector('.backwards-prompt');
const backwardsInput = document.getElementById('backwards-input');
const backwardsFeedback = document.querySelector('.backwards-feedback');
const learnedWordsContainer = document.getElementById('learned-words');

// Initialize the application
document.addEventListener('DOMContentLoaded', function() {
    setupEventListeners();
});

function setupEventListeners() {
    // Navigation
    methodNav.forEach(btn => {
        btn.addEventListener('click', () => switchMethod(btn.dataset.method));
    });

    // Script processing
    processScriptBtn.addEventListener('click', processScript);

    // First Letter Method
    revealAllBtn.addEventListener('click', revealAllLetters);
    hideAllBtn.addEventListener('click', hideAllLetters);
    newScriptLettersBtn.addEventListener('click', () => {
        scriptInput.value = '';
        lettersDisplay.innerHTML = '';
        lettersData = [];
    });

    // Line Buildup Method
    startBuildupBtn.addEventListener('click', startBuildup);
    nextBuildupBtn.addEventListener('click', nextBuildupLevel);
    resetBuildupBtn.addEventListener('click', resetBuildup);

    // Backwards Method
    startBackwardsBtn.addEventListener('click', startBackwards);
    checkBackwardsBtn.addEventListener('click', checkBackwardsAnswer);
    resetBackwardsBtn.addEventListener('click', resetBackwards);

    // Backwards input handling
    backwardsInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
            checkBackwardsAnswer();
        }
    });
}

function switchMethod(method) {
    // Update navigation
    methodNav.forEach(btn => btn.classList.remove('active'));
    document.querySelector(`[data-method="${method}"]`).classList.add('active');
    
    // Update sections
    methodSections.forEach(section => section.classList.remove('active'));
    document.getElementById(`${method}-method`).classList.add('active');
    
    currentMethod = method;
}

function processScript() {
    const script = scriptInput.value.trim();
    if (!script) {
        alert('Please enter a script first!');
        return;
    }
    
    currentScript = script;
    
    // Process for all methods
    processFirstLetterMethod();
    processBuildupMethod();
    processBackwardsMethod();
    
    // Show success message
    alert('Script processed successfully! You can now use any of the memorization methods.');
}

// First Letter Method Implementation
function processFirstLetterMethod() {
    const lines = currentScript.split('\n').filter(line => line.trim());
    lettersData = [];
    
    lines.forEach(line => {
        const words = line.trim().split(/\s+/);
        const lineData = words.map(word => {
            const cleanWord = word.replace(/[^\w\s]/g, '');
            const punctuation = word.replace(/[\w\s]/g, '');
            return {
                word: cleanWord,
                firstLetter: cleanWord.charAt(0).toUpperCase(),
                punctuation: punctuation,
                revealed: false
            };
        });
        lettersData.push(lineData);
    });
    
    displayLetters();
}

function displayLetters() {
    lettersDisplay.innerHTML = '';
    
    lettersData.forEach((lineData, lineIndex) => {
        const lineDiv = document.createElement('div');
        lineDiv.className = 'line-group';
        lineDiv.style.marginBottom = '20px';
        
        lineData.forEach((wordData, wordIndex) => {
            const letterBox = document.createElement('span');
            letterBox.className = 'letter-box';
            letterBox.textContent = wordData.firstLetter;
            letterBox.dataset.lineIndex = lineIndex;
            letterBox.dataset.wordIndex = wordIndex;
            letterBox.addEventListener('click', () => toggleLetterReveal(lineIndex, wordIndex));
            
            lineDiv.appendChild(letterBox);
            
            // Add punctuation if exists
            if (wordData.punctuation) {
                const punctBox = document.createElement('span');
                punctBox.className = 'letter-box punctuation';
                punctBox.textContent = wordData.punctuation;
                lineDiv.appendChild(punctBox);
            }
            
            // Add space between words
            if (wordIndex < lineData.length - 1) {
                const spaceBox = document.createElement('span');
                spaceBox.className = 'letter-box space';
                spaceBox.textContent = ' ';
                lineDiv.appendChild(spaceBox);
            }
        });
        
        lettersDisplay.appendChild(lineDiv);
    });
}

function toggleLetterReveal(lineIndex, wordIndex) {
    const wordData = lettersData[lineIndex][wordIndex];
    wordData.revealed = !wordData.revealed;
    
    const letterBox = document.querySelector(`[data-line-index="${lineIndex}"][data-word-index="${wordIndex}"]`);
    if (wordData.revealed) {
        letterBox.textContent = wordData.word;
        letterBox.classList.add('revealed');
    } else {
        letterBox.textContent = wordData.firstLetter;
        letterBox.classList.remove('revealed');
    }
}

function revealAllLetters() {
    lettersData.forEach((lineData, lineIndex) => {
        lineData.forEach((wordData, wordIndex) => {
            wordData.revealed = true;
            const letterBox = document.querySelector(`[data-line-index="${lineIndex}"][data-word-index="${wordIndex}"]`);
            letterBox.textContent = wordData.word;
            letterBox.classList.add('revealed');
        });
    });
}

function hideAllLetters() {
    lettersData.forEach((lineData, lineIndex) => {
        lineData.forEach((wordData, wordIndex) => {
            wordData.revealed = false;
            const letterBox = document.querySelector(`[data-line-index="${lineIndex}"][data-word-index="${wordIndex}"]`);
            letterBox.textContent = wordData.firstLetter;
            letterBox.classList.remove('revealed');
        });
    });
}

// Line Buildup Method Implementation
function processBuildupMethod() {
    const lines = currentScript.split('\n').filter(line => line.trim());
    buildupData = [];
    
    lines.forEach(line => {
        const words = line.trim().split(/\s+/);
        const lineLevels = [];
        
        for (let i = 1; i <= words.length; i++) {
            lineLevels.push(words.slice(0, i));
        }
        
        buildupData.push({
            original: line,
            words: words,
            levels: lineLevels
        });
    });
}

function startBuildup() {
    if (buildupData.length === 0) {
        alert('Please process a script first!');
        return;
    }
    
    currentBuildupLevel = 0;
    nextBuildupBtn.disabled = false;
    nextBuildupLevel();
}

function nextBuildupLevel() {
    if (currentBuildupLevel >= buildupData.length) {
        currentLine.innerHTML = '<strong>Congratulations! You\'ve completed all lines!</strong>';
        progressIndicator.textContent = 'All lines completed!';
        nextBuildupBtn.disabled = true;
        return;
    }
    
    const currentLineData = buildupData[currentBuildupLevel];
    const currentLevel = Math.min(currentLineData.levels.length - 1, Math.floor(currentBuildupLevel / buildupData.length * currentLineData.levels.length));
    
    if (currentLevel < currentLineData.levels.length) {
        const wordsToShow = currentLineData.levels[currentLevel];
        const wordsToHide = currentLineData.words.slice(currentLevel);
        
        let displayHTML = '';
        wordsToShow.forEach(word => {
            displayHTML += `<span class="buildup-word">${word}</span> `;
        });
        wordsToHide.forEach(word => {
            displayHTML += `<span class="buildup-word hidden">${word}</span> `;
        });
        
        currentLine.innerHTML = displayHTML;
        progressIndicator.textContent = `Line ${currentBuildupLevel + 1} of ${buildupData.length} - Level ${currentLevel + 1} of ${currentLineData.levels.length}`;
    } else {
        currentBuildupLevel++;
        nextBuildupLevel();
    }
}

function resetBuildup() {
    currentBuildupLevel = 0;
    currentLine.innerHTML = '';
    progressIndicator.textContent = '';
    nextBuildupBtn.disabled = true;
}

// Backwards Method Implementation
let currentBackwardsWordIndex = 0;
let learnedWords = [];
let allWords = [];

function processBackwardsMethod() {
    // Process the entire script as one continuous text, ignoring line breaks
    const cleanScript = currentScript.replace(/\n/g, ' ').replace(/\s+/g, ' ').trim();
    allWords = cleanScript.split(/\s+/).filter(word => word.length > 0);
    
    // Remove punctuation from words for comparison but keep original for display
    backwardsData = allWords.map(word => {
        const cleanWord = word.replace(/[^\w\s]/g, '').toLowerCase();
        return {
            original: word,
            clean: cleanWord
        };
    });
}

function startBackwards() {
    if (backwardsData.length === 0) {
        alert('Please process a script first!');
        return;
    }
    
    currentBackwardsWordIndex = 0;
    learnedWords = [];
    checkBackwardsBtn.disabled = false;
    backwardsInput.disabled = false;
    backwardsInput.focus();
    showBackwardsPrompt();
    updateLearnedWords();
}

function showBackwardsPrompt() {
    if (currentBackwardsWordIndex >= backwardsData.length) {
        backwardsPrompt.innerHTML = '<div class="backwards-complete">🎉 Congratulations! You\'ve learned the entire script backwards! 🎉</div>';
        backwardsInput.style.display = 'none';
        checkBackwardsBtn.disabled = true;
        return;
    }
    
    const currentWordIndex = backwardsData.length - 1 - currentBackwardsWordIndex;
    const currentWord = backwardsData[currentWordIndex];
    
    backwardsPrompt.innerHTML = `
        <strong>Word ${currentBackwardsWordIndex + 1} of ${backwardsData.length}</strong><br>
        What word comes before "<strong>${currentWord.original}</strong>"?
    `;
    
    backwardsInput.value = '';
    backwardsInput.placeholder = 'Type the word that comes before...';
    backwardsInput.className = '';
    backwardsFeedback.textContent = '';
    backwardsFeedback.className = 'backwards-feedback';
}

function checkBackwardsAnswer() {
    const userAnswer = backwardsInput.value.trim().toLowerCase();
    const currentWordIndex = backwardsData.length - 1 - currentBackwardsWordIndex;
    const previousWordIndex = currentWordIndex - 1;
    
    if (previousWordIndex < 0) {
        // We've reached the beginning
        backwardsFeedback.textContent = 'You\'ve reached the beginning of the script!';
        backwardsFeedback.className = 'backwards-feedback correct';
        return;
    }
    
    const correctWord = backwardsData[previousWordIndex];
    const userAnswerClean = userAnswer.replace(/[^\w\s]/g, '').toLowerCase();
    
    if (userAnswerClean === correctWord.clean) {
        // Correct answer
        backwardsFeedback.textContent = 'Correct! Well done!';
        backwardsFeedback.className = 'backwards-feedback correct';
        
        // Add the correct word to learned words (use original with punctuation)
        learnedWords.push(correctWord.original);
        updateLearnedWords();
        
        // Move to next word
        currentBackwardsWordIndex++;
        
        // Show next prompt after a short delay
        setTimeout(() => {
            showBackwardsPrompt();
        }, 1000);
        
    } else {
        // Incorrect answer
        backwardsFeedback.textContent = `Incorrect. The correct answer is "${correctWord.original}".`;
        backwardsFeedback.className = 'backwards-feedback incorrect';
        backwardsInput.className = 'incorrect';
        
        // Clear the input and focus after animation
        setTimeout(() => {
            backwardsInput.value = '';
            backwardsInput.className = '';
            backwardsInput.focus();
        }, 500);
    }
}

function updateLearnedWords() {
    learnedWordsContainer.innerHTML = '';
    
    if (learnedWords.length === 0) {
        learnedWordsContainer.innerHTML = '<em>No words learned yet. Start typing!</em>';
        return;
    }
    
    learnedWords.forEach(word => {
        const wordElement = document.createElement('span');
        wordElement.className = 'learned-word';
        wordElement.textContent = word;
        learnedWordsContainer.appendChild(wordElement);
    });
}

function resetBackwards() {
    currentBackwardsWordIndex = 0;
    learnedWords = [];
    backwardsPrompt.textContent = '';
    backwardsInput.value = '';
    backwardsInput.style.display = 'block';
    backwardsInput.disabled = true;
    backwardsInput.className = '';
    backwardsFeedback.textContent = '';
    backwardsFeedback.className = 'backwards-feedback';
    checkBackwardsBtn.disabled = true;
    updateLearnedWords();
}
