let currentScreen = 1;
const totalScreens = 23;

let callTimer = null;
let callTimeRemaining = 238; // 3:58 in seconds

function showScreen(screenNumber) {
    // Hide all screens first
    document.querySelectorAll('.screen').forEach(screen => {
        screen.classList.remove('active');
    });
    
    // Show the target screen
    const targetScreen = document.getElementById(`screen${screenNumber}`);
    if (targetScreen) {
        targetScreen.classList.add('active');
    }
}

function nextScreen() {
    if (currentScreen < totalScreens) {
        currentScreen++;
        showScreen(currentScreen);
    } else {
        alert('Onboarding complete!');
    }
}

function previousScreen() {
    if (currentScreen > 1) {
        currentScreen--;
        showScreen(currentScreen);
    }
}

function selectFrequency(button) {
    // Remove selection from all buttons in the container
    button.closest('.options-container').querySelectorAll('.option-button').forEach(btn => {
        btn.classList.remove('selected');
    });
    // Add selection to clicked button
    button.classList.add('selected');
    setTimeout(() => nextScreen(), 500);
}

function selectImprovement(card) {
    // Toggle selection on the clicked card
    card.classList.toggle('selected');
    // Check if any cards are selected to enable/disable continue button
    const selectedCards = document.querySelectorAll('#screen3 .option-card.selected');
    const continueButton = document.getElementById('continueBtn3');
    if (continueButton) {
        continueButton.disabled = selectedCards.length === 0;
    }
}

function selectGoal(button) {
    button.closest('.options-container').querySelectorAll('.option-button').forEach(btn => {
        btn.classList.remove('selected');
    });
    button.classList.add('selected');
    setTimeout(() => nextScreen(), 500);
}

function selectChallenge(button) {
    button.classList.toggle('selected');
    const selectedButtons = document.querySelectorAll('#screen5 .option-button.selected');
    const continueButton = document.getElementById('continueBtn5');
    if (continueButton) {
        continueButton.disabled = selectedButtons.length === 0;
    }
}

function selectAgreement(button) {
    button.closest('.agreement-options').querySelectorAll('.agreement-button').forEach(btn => {
        btn.classList.remove('selected');
    });
    button.classList.add('selected');
    setTimeout(() => nextScreen(), 500);
}

function selectHardestPart(button) {
    button.closest('.options-container').querySelectorAll('.option-button').forEach(btn => {
        btn.classList.remove('selected');
    });
    button.classList.add('selected');
    setTimeout(() => nextScreen(), 500);
}

function selectUsage(button) {
    button.classList.toggle('selected');
    const selectedButtons = document.querySelectorAll('#screen7 .option-button.selected');
    const continueButton = document.getElementById('continueBtn7');
    if (continueButton) {
        continueButton.disabled = selectedButtons.length === 0;
    }
}

function selectField(button) {
    button.closest('.options-container').querySelectorAll('.option-button').forEach(btn => {
        btn.classList.remove('selected');
    });
    button.classList.add('selected');
    setTimeout(() => nextScreen(), 500);
}

function selectAge(card) {
    card.closest('.options-grid').querySelectorAll('.option-card').forEach(c => {
        c.classList.remove('selected');
    });
    card.classList.add('selected');
    setTimeout(() => nextScreen(), 500);
}

function selectGender(card) {
    card.closest('.gender-options').querySelectorAll('.gender-card').forEach(c => {
        c.classList.remove('selected');
    });
    card.classList.add('selected');
    setTimeout(() => nextScreen(), 500);
}

function selectLanguage(button) {
    button.closest('.options-container').querySelectorAll('.option-button').forEach(btn => {
        btn.classList.remove('selected');
    });
    button.classList.add('selected');
    setTimeout(() => nextScreen(), 500);
}

function selectImprovementMethod(button) {
    button.classList.toggle('selected');
    const selectedButtons = document.querySelectorAll('#screen12 .option-button.selected');
    const continueButton = document.getElementById('continueBtn12');
    if (continueButton) {
        continueButton.disabled = selectedButtons.length === 0;
    }
}

function selectLearningChallenge(button) {
    button.classList.toggle('selected');
    const selectedButtons = document.querySelectorAll('#screen13 .option-button.selected');
    const continueButton = document.getElementById('continueBtn13');
    if (continueButton) {
        continueButton.disabled = selectedButtons.length === 0;
    }
}

window.selectSpeakingFeeling = function(card) {
    card.closest('.options-grid').querySelectorAll('.option-card').forEach(c => {
        c.classList.remove('selected');
    });
    card.classList.add('selected');
    const continueButton = document.getElementById('continueBtn14');
    if (continueButton) {
        continueButton.disabled = false;
    }
}

window.selectAgreement2 = function(button) {
    button.closest('.agreement-options').querySelectorAll('.agreement-button').forEach(btn => {
        btn.classList.remove('selected');
    });
    button.classList.add('selected');
    setTimeout(() => nextScreen(), 500);
}

window.selectLanguageLevel = function(button) {
    button.closest('.options-container').querySelectorAll('.option-button').forEach(btn => {
        btn.classList.remove('selected');
    });
    button.classList.add('selected');
    const continueButton = document.getElementById('continueBtn18');
    if (continueButton) {
        continueButton.disabled = false;
    }
}

// Function to request microphone permission and start call
window.startCall = async function() {
    console.log('startCall function called!'); // Debug log
    
    try {
        console.log('Requesting microphone permission...'); // Debug log
        
        // Request microphone permission
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        
        // If permission granted, show connecting state
        console.log('Microphone permission granted');
        
        // Stop the stream since we just needed permission
        stream.getTracks().forEach(track => track.stop());
        
        // Change button to "Connecting..." state
        const startButton = document.querySelector('button[onclick="startCall()"]');
        console.log('Found start button:', startButton); // Debug log
        
        if (startButton) {
            startButton.innerHTML = '<span style="font-size: 16px;">⏳</span> Connecting...';
            startButton.disabled = true;
            startButton.style.opacity = '0.7';
        }
        
        // Simulate connection delay (2 seconds), then proceed to active call
        setTimeout(() => {
            console.log('Moving to next screen and starting timer'); // Debug log
            nextScreen(); // Go to Screen 23 (active call)
            startCallTimer(); // Start the countdown
        }, 2000);
        
    } catch (error) {
        console.error('Microphone permission denied:', error);
        
        // Show an alert or handle permission denial
        alert('Microphone permission is required for the assessment call. Please allow microphone access and try again.');
    }
}

// Make sure the function is available globally
console.log('startCall function defined:', typeof window.startCall); // Debug log

// Function to start the call countdown timer
function startCallTimer() {
    const timerElement = document.getElementById('callTimer');
    if (!timerElement) return;
    
    callTimer = setInterval(() => {
        callTimeRemaining--;
        
        const minutes = Math.floor(callTimeRemaining / 60);
        const seconds = callTimeRemaining % 60;
        const timeString = `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
        
        timerElement.textContent = timeString;
        
        if (callTimeRemaining <= 0) {
            clearInterval(callTimer);
            endCall();
        }
    }, 1000);
}

// Function to end the call
window.endCall = function() {
    if (callTimer) {
        clearInterval(callTimer);
        callTimer = null;
    }
    
    // For now, just show completion message
    alert('Call ended. Assessment complete!');
    // In the future, this could navigate to a results screen
}

document.addEventListener('DOMContentLoaded', function() {
    // Attach event listeners for speaking feeling screen (screen14)
    var screen14 = document.getElementById('screen14');
    if (screen14) {
        var cards = screen14.querySelectorAll('.option-card');
        cards.forEach(function(card) {
            card.addEventListener('click', function() {
                cards.forEach(function(c) { c.classList.remove('selected'); });
                card.classList.add('selected');
                var continueButton = document.getElementById('continueBtn14');
                if (continueButton) {
                    continueButton.disabled = false;
                }
            });
        });
    }
    
    // Debug: Log when DOM is loaded and check for startCall function
    console.log('DOM loaded, startCall available:', typeof window.startCall);
    
    // Add additional click listener to Start Call button as backup
    setTimeout(() => {
        const startCallButton = document.querySelector('button[onclick="startCall()"]');
        if (startCallButton) {
            console.log('Found Start Call button, adding backup click listener');
            startCallButton.addEventListener('click', function(e) {
                console.log('Start Call button clicked via event listener');
                if (typeof window.startCall === 'function') {
                    e.preventDefault();
                    window.startCall();
                } else {
                    console.error('startCall function not found!');
                }
            });
        } else {
            console.log('Start Call button not found');
        }
    }, 1000);
}); 