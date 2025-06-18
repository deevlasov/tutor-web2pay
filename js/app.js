let currentScreen = 1;
const totalScreens = 14;

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