let currentScreen = 1;
const totalScreens = 14;

function showScreen(screenNumber) {
    document.querySelectorAll('.screen').forEach(screen => {
        screen.classList.remove('active');
    });
    document.getElementById(`screen${screenNumber}`).classList.add('active');
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
    document.querySelectorAll('#screen2 .option-button').forEach(btn => {
        btn.classList.remove('selected');
    });
    button.classList.add('selected');
    setTimeout(() => nextScreen(), 500);
}

function selectImprovement(card) {
    card.classList.toggle('selected');
    const selectedCards = document.querySelectorAll('#screen3 .option-card.selected');
    const continueButton = document.getElementById('continueBtn3');
    continueButton.disabled = selectedCards.length === 0;
}

function selectGoal(button) {
    document.querySelectorAll('#screen4 .option-button').forEach(btn => {
        btn.classList.remove('selected');
    });
    button.classList.add('selected');
    setTimeout(() => nextScreen(), 500);
}

function selectChallenge(button) {
    button.classList.toggle('selected');
    const selectedButtons = document.querySelectorAll('#screen5 .option-button.selected');
    const continueButton = document.getElementById('continueBtn5');
    continueButton.disabled = selectedButtons.length === 0;
}

function selectAgreement(button, value) {
    document.querySelectorAll('#screen6 .agreement-button').forEach(btn => {
        btn.classList.remove('selected');
    });
    button.classList.add('selected');
    setTimeout(() => nextScreen(), 500);
}

function selectHardestPart(button) {
    document.querySelectorAll('#screen7 .option-button').forEach(btn => {
        btn.classList.remove('selected');
    });
    button.classList.add('selected');
    setTimeout(() => nextScreen(), 500);
}

function selectUsage(button) {
    button.classList.toggle('selected');
    const selectedButtons = document.querySelectorAll('#screen9 .option-button.selected');
    const continueButton = document.getElementById('continueBtn9');
    continueButton.disabled = selectedButtons.length === 0;
}

function selectField(button) {
    document.querySelectorAll('#screen10 .option-button').forEach(btn => {
        btn.classList.remove('selected');
    });
    button.classList.add('selected');
    setTimeout(() => nextScreen(), 500);
}

function selectAge(card) {
    document.querySelectorAll('#screen12 .option-card').forEach(c => {
        c.classList.remove('selected');
    });
    card.classList.add('selected');
    setTimeout(() => nextScreen(), 500);
}

function selectGender(card) {
    document.querySelectorAll('#screen13 .gender-card').forEach(c => {
        c.classList.remove('selected');
    });
    card.classList.add('selected');
    setTimeout(() => nextScreen(), 500);
}

function selectLanguage(button) {
    document.querySelectorAll('#screen14 .option-button').forEach(btn => {
        btn.classList.remove('selected');
    });
    button.classList.add('selected');
    setTimeout(() => nextScreen(), 500);
} 