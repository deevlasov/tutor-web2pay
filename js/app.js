let currentScreen = 1;
const totalScreens = 23;

let callTimer = null;
let callTimeRemaining = 238; // 3:58 in seconds

// OpenAI Realtime API Integration
class RealtimeVoiceAssessment {
  constructor() {
    this.ws = null;
    this.mediaRecorder = null;
    this.audioContext = null;
    this.analyser = null;
    this.processor = null;
    this.audioWorkletNode = null;
    this.audioStream = null;
    this.audioSource = null;
    this.isConnected = false;
    this.isRecording = false;
    this.conversationHistory = [];
    this.audioChunks = [];
    this.currentResponseText = "";

    this.setPlaceholderApiKey();
    // Get API key from environment or use placeholder
    this.apiKey = this.getApiKey();

    this.initializeAudioContext();
  }

  async initializeAudioContext() {
    try {
      this.audioContext = new (window.AudioContext ||
        window.webkitAudioContext)();
      this.analyser = this.audioContext.createAnalyser();
      this.analyser.fftSize = 256;
    } catch (error) {
      console.error("Audio context initialization failed:", error);
    }
  }

  async requestMicrophonePermission() {
    try {
      console.log("Requesting microphone access...");
      this.audioStream = await navigator.mediaDevices.getUserMedia({
        audio: {
          sampleRate: 24000,
          channelCount: 1,
          echoCancellation: true,
          noiseSuppression: true,
        },
      });

      console.log("Microphone access granted!");

      // Set up audio analysis for visualization (don't create another source)
      if (this.audioContext && this.analyser && !this.audioSource) {
        this.audioSource = this.audioContext.createMediaStreamSource(
          this.audioStream,
        );
        this.audioSource.connect(this.analyser);
        this.visualizeAudio();
      }

      return this.audioStream;
    } catch (error) {
      console.error("Microphone access denied or failed:", error);
      throw new Error(
        "Microphone access is required for the assessment. Please allow microphone access and try again.",
      );
    }
  }

  async setupAudioStream() {
    // Return the already granted stream
    if (this.audioStream) {
      return this.audioStream;
    }

    // If no stream exists, request permission
    return await this.requestMicrophonePermission();
  }

  setPlaceholderApiKey() {
    const existing = this.getApiKey();
    if (!existing) {
      localStorage.setItem("openAiEK", "replace by you ephemeral api key");
    }
  }

  getApiKey() {
    return localStorage.getItem("openAiEK");
  }

  visualizeAudio() {
    const visualizer = document.getElementById("audioVisualizer");
    if (!visualizer) return;

    const bars = visualizer.querySelectorAll(".visualizer-bar");
    if (bars.length === 0) return;

    const dataArray = new Uint8Array(this.analyser.frequencyBinCount);

    const animate = () => {
      if (!this.isRecording) return;

      this.analyser.getByteFrequencyData(dataArray);

      bars.forEach((bar, index) => {
        const value = dataArray[index * 4] || 0;
        const height = Math.max(5, (value / 255) * 40);
        bar.style.height = height + "px";
      });

      requestAnimationFrame(animate);
    };

    animate();
  }

  async connect() {
    try {
      const apiKey = this.getApiKey();
      console.log({ apiKey })
      this.updateCallStatus("Connecting to AI Tutor...", "connecting");

      // Check if API key is set
      if (apiKey === "replace by you ephemeral api key") {
        this.updateCallStatus("Please set your ephemeral OpenAI API key", "error");
        console.error("OpenAI API key not configured. Please set your ephemeral API key.");
        return;
      }

      // OpenAI Realtime API WebSocket endpoint
      const wsUrl =
        "wss://api.openai.com/v1/realtime?model=gpt-4o-mini-realtime-preview-2024-10-01";

      this.ws = new WebSocket(wsUrl, [
        "realtime",
        "openai-insecure-api-key." + this.apiKey,
        "openai-beta.realtime-v1",
      ]);

      this.ws.onopen = () => {
        // Send authentication and configuration
        const authMessage = {
          type: "session.update",
          session: {
            modalities: ["text", "audio"],
            instructions: `You are Stacy, a friendly English assessment tutor. Your role is to:
                        1. Conduct a natural, conversational English assessment
                        2. Ask engaging questions about personal interests, experiences, and opinions
                        3. Gradually increase complexity to assess proficiency level
                        4. Keep the conversation flowing naturally for about 3-4 minutes
                        5. Provide encouraging feedback and stay positive
                        6. Focus on topics like: hobbies, travel, work, goals, problem-solving
                        7. Do not finish with closed sentense, engage into continious conversation.

                        Start by greeting the user warmly and asking them to introduce themselves.`,
            voice: "alloy",
            input_audio_format: "pcm16",
            output_audio_format: "pcm16",
            input_audio_transcription: {
              language: "en",
              model: "whisper-1",
            },
            turn_detection: {
              // type: "semantic_vad",
              // eagerness: "low",
              type: "server_vad",
              threshold: 0.5,
              prefix_padding_ms: 300,
              silence_duration_ms: 4000,
            },
          },
        };

        this.ws.send(JSON.stringify(authMessage));

        this.isConnected = true;
        this.updateCallStatus("Connected to Stacy", "connected");

        // Start recording (microphone permission already granted)
        this.startRecording();
      };

      this.ws.onmessage = (event) => {
        this.handleRealtimeMessage(JSON.parse(event.data));
      };

      this.ws.onclose = () => {
        this.isConnected = false;
        this.updateCallStatus("Connection closed", "disconnected");
        this.stopRecording();
      };

      this.ws.onerror = (error) => {
        console.error("WebSocket error:", error);
        this.updateCallStatus("Connection error", "error");
      };
    } catch (error) {
      console.error("Connection failed:", error);
      this.updateCallStatus("Connection failed", "error");
    }
  }

  handleRealtimeMessage(message) {
    const skipped = ["response.audio_transcript.done"];
    if (!skipped.includes(message.type)) {
      console.log("Received message:", message);
    }

    switch (message.type) {
      case "session.created":
        console.log("Session created successfully");
        break;

      case "conversation.item.input_audio_transcription.completed":
        // console.log("conversation.item.input_audio_transcription.completed", message);
        if (message.transcript) {
          this.addTranscript("You", message.transcript);
        }
        break;

      case "response.audio.delta":
        // Handle audio response chunks
        this.audioChunks.push(message.delta);
        break;

      case "response.audio.done":
        const audio = this.audioChunks.join("");
        this.audioChunks = [];
        // Handle audio response chunks
        this.playAudioChunk(audio);
        break;

      case "response.audio_transcript.delta":
        // Handle text response chunks
        this.handleTextDeltaResponse(message.delta);
        break;

      case "response.audio_transcript.done":
        // Handle text response chunks
        this.handleTextFullResponse(message.transcript);
        break;

      case "response.done":
        // console.log("Received response.done:", message);
        console.log("Response completed");
        break;

      case "error":
        console.error("API Error:", message.error);
        this.updateCallStatus(`Error: ${message.error.message}`, "error");
        break;
    }
  }

  async startRecording() {
    try {
      // Use the already granted audio stream - should never be null at this point
      if (!this.audioStream) {
        throw new Error(
          "No audio stream available. Microphone permission not granted.",
        );
      }
      const stream = this.audioStream;

      // Create audio context if not already created
      if (!this.audioContext) {
        this.audioContext = new (window.AudioContext ||
          window.webkitAudioContext)({
            sampleRate: 24000,
          });
      }

      // Reuse existing media stream source or create new one
      const source =
        this.audioSource || this.audioContext.createMediaStreamSource(stream);
      if (!this.audioSource) {
        this.audioSource = source;
      }

      // Create script processor (fallback for older browsers)
      this.processor = this.audioContext.createScriptProcessor(4096, 1, 1);

      // Process audio data
      this.processor.onaudioprocess = (event) => {
        if (this.isRecording) {
          const inputBuffer = event.inputBuffer.getChannelData(0);
          this.sendPCMAudioChunk(inputBuffer);
        }
      };

      // Connect audio nodes
      source.connect(this.processor);
      this.processor.connect(this.audioContext.destination);

      this.isRecording = true;
      this.updateCallStatus("Recording - Speak now", "recording");
    } catch (error) {
      console.error("Failed to start recording:", error);
      this.updateCallStatus("Microphone access denied", "error");
    }
  }

  stopRecording() {
    this.isRecording = false;

    if (this.processor) {
      this.processor.disconnect();
      this.processor = null;
    }

    if (this.audioContext && this.audioContext.state !== "closed") {
      // Don't close the context, just disconnect the processor
      // this.audioContext.close();
    }
  }

  sendPCMAudioChunk(float32Array) {
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN) return;

    try {
      // Convert Float32Array to Int16Array (PCM16)
      const int16Array = new Int16Array(float32Array.length);
      for (let i = 0; i < float32Array.length; i++) {
        // Clamp and convert to 16-bit signed integer
        const sample = Math.max(-1, Math.min(1, float32Array[i]));
        int16Array[i] = sample * 32767;
      }

      // Convert Int16Array to base64
      const bytes = new Uint8Array(int16Array.buffer);
      const base64Audio = btoa(String.fromCharCode(...bytes));

      const message = {
        type: "input_audio_buffer.append",
        audio: base64Audio,
      };

      this.ws.send(JSON.stringify(message));
    } catch (error) {
      console.error("Failed to send PCM audio chunk:", error);
    }
  }

  async sendAudioChunk(audioBlob) {
    // Keep this method for backward compatibility but it's no longer used
    console.warn(
      "sendAudioChunk is deprecated, using sendPCMAudioChunk instead",
    );
  }

  playAudioChunk(audioData) {
    try {
      const pcmData = base64ToArrayBuffer(audioData);
      const wavBlob = createWAVBlob(pcmData, 24000, 1, 16);

      const audioUrl = URL.createObjectURL(wavBlob);
      const audio = new Audio(audioUrl);
      audio.play().catch((error) => {
        console.error("Audio playback failed:", error);
      });
    } catch (error) {
      console.error("Failed to play audio:", error);
    }
  }

  handleTextDeltaResponse(textDelta) {
    this.currentResponseText += textDelta;
  }

  handleTextFullResponse(text) {
    this.addTranscript("Stacy", text);
  }

  addTranscript(speaker, text) {
    const transcriptElement = document.getElementById("callTranscript");
    if (transcriptElement) {
      const messageDiv = document.createElement("div");
      messageDiv.className = `transcript-message ${speaker.toLowerCase() === "you" ? "user" : "assistant"}`;
      messageDiv.innerHTML = `<strong>${speaker}:</strong> ${text}`;
      transcriptElement.appendChild(messageDiv);
      transcriptElement.scrollTop = transcriptElement.scrollHeight;
    }
  }

  updateCallStatus(text, type) {
    console.log({ text, type });
    const statusElement = document.getElementById("callStatus");
    const indicatorElement = document.getElementById("callStatusIndicator");

    if (statusElement) {
      statusElement.textContent = text;
    }

    if (indicatorElement) {
      indicatorElement.className = `status-indicator ${type}`;
    }
  }

  disconnect() {
    if (this.ws) {
      this.ws.close();
    }
    this.stopRecording();

    // Stop the audio stream
    if (this.audioStream) {
      this.audioStream.getTracks().forEach((track) => track.stop());
      this.audioStream = null;
    }

    // Clean up audio source
    if (this.audioSource) {
      this.audioSource.disconnect();
      this.audioSource = null;
    }

    this.isConnected = false;
  }

  toggleMute() {
    if (this.isRecording) {
      this.stopRecording();
      this.updateCallStatus("Muted", "muted");
    } else if (this.isConnected) {
      this.startRecording();
      this.updateCallStatus("Recording - Speak now", "recording");
    }
  }
}

// Global instance
let voiceAssessment = null;

// Define startCall function at the top level
async function startCall() {
  console.log("startCall function called!");

  // Change button to "Connecting..." state immediately
  const startButton = document.querySelector(
    '#screen22 button[onclick*="startCall"]',
  );
  if (startButton) {
    startButton.innerHTML =
      '<span style="font-size: 16px;">🎙️</span> Requesting microphone...';
    startButton.disabled = true;
    startButton.style.opacity = "0.7";
  }

  try {
    // Initialize voice assessment
    voiceAssessment = new RealtimeVoiceAssessment();

    // Request microphone permission first
    console.log("Requesting microphone permission...");
    await voiceAssessment.requestMicrophonePermission();

    // Update button to show connection status
    if (startButton) {
      startButton.innerHTML =
        '<span style="font-size: 16px;">⏳</span> Connecting to AI...';
    }

    // Move to active call screen and start real connection
    setTimeout(() => {
      console.log("Moving to Screen 23 and starting real AI call");

      // Hide Screen 22 and show Screen 23
      document.getElementById("screen22").classList.remove("active");
      document.getElementById("screen23").classList.add("active");

      // Start real AI connection (microphone is already granted)
      voiceAssessment.connect();

      // Still start the countdown timer for UI
      startCallTimer();
    }, 1000);
  } catch (error) {
    console.error("Failed to get microphone permission:", error);

    // Reset button and show error
    if (startButton) {
      startButton.innerHTML =
        '<span style="font-size: 16px;">🎙️</span> Microphone Required';
      startButton.disabled = false;
      startButton.style.opacity = "1";
      startButton.style.background = "#ff4444";
    }

    // Show error message to user
    alert(
      "Microphone access is required for the English assessment. Please allow microphone access and try again.",
    );
  }
}

// Make it globally available
window.startCall = startCall;

function showScreen(screenNumber) {
  // Hide all screens first
  document.querySelectorAll(".screen").forEach((screen) => {
    screen.classList.remove("active");
  });

  // Show the target screen
  const targetScreen = document.getElementById(`screen${screenNumber}`);
  if (targetScreen) {
    targetScreen.classList.add("active");
  }
}

function nextScreen() {
  if (currentScreen < totalScreens) {
    currentScreen++;
    showScreen(currentScreen);
    console.log({ currentScreen });
  } else {
    alert("Onboarding complete!");
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
  button
    .closest(".options-container")
    .querySelectorAll(".option-button")
    .forEach((btn) => {
      btn.classList.remove("selected");
    });
  // Add selection to clicked button
  button.classList.add("selected");
  setTimeout(() => nextScreen(), 500);
}

function selectImprovement(card) {
  // Toggle selection on the clicked card
  card.classList.toggle("selected");
  // Check if any cards are selected to enable/disable continue button
  const selectedCards = document.querySelectorAll(
    "#screen3 .option-card.selected",
  );
  const continueButton = document.getElementById("continueBtn3");
  if (continueButton) {
    continueButton.disabled = selectedCards.length === 0;
  }
}

function selectGoal(button) {
  button
    .closest(".options-container")
    .querySelectorAll(".option-button")
    .forEach((btn) => {
      btn.classList.remove("selected");
    });
  button.classList.add("selected");
  setTimeout(() => nextScreen(), 500);
}

function selectChallenge(button) {
  button.classList.toggle("selected");
  const selectedButtons = document.querySelectorAll(
    "#screen5 .option-button.selected",
  );
  const continueButton = document.getElementById("continueBtn5");
  if (continueButton) {
    continueButton.disabled = selectedButtons.length === 0;
  }
}

function selectAgreement(button) {
  button
    .closest(".agreement-options")
    .querySelectorAll(".agreement-button")
    .forEach((btn) => {
      btn.classList.remove("selected");
    });
  button.classList.add("selected");
  setTimeout(() => nextScreen(), 500);
}

function selectHardestPart(button) {
  button
    .closest(".options-container")
    .querySelectorAll(".option-button")
    .forEach((btn) => {
      btn.classList.remove("selected");
    });
  button.classList.add("selected");
  setTimeout(() => nextScreen(), 500);
}

function selectUsage(button) {
  button.classList.toggle("selected");
  const selectedButtons = document.querySelectorAll(
    "#screen7 .option-button.selected",
  );
  const continueButton = document.getElementById("continueBtn7");
  if (continueButton) {
    continueButton.disabled = selectedButtons.length === 0;
  }
}

function selectField(button) {
  button
    .closest(".options-container")
    .querySelectorAll(".option-button")
    .forEach((btn) => {
      btn.classList.remove("selected");
    });
  button.classList.add("selected");
  setTimeout(() => nextScreen(), 500);
}

function selectAge(card) {
  card
    .closest(".options-grid")
    .querySelectorAll(".option-card")
    .forEach((c) => {
      c.classList.remove("selected");
    });
  card.classList.add("selected");
  setTimeout(() => nextScreen(), 500);
}

function selectGender(card) {
  card
    .closest(".gender-options")
    .querySelectorAll(".gender-card")
    .forEach((c) => {
      c.classList.remove("selected");
    });
  card.classList.add("selected");
  setTimeout(() => nextScreen(), 500);
}

function selectLanguage(button) {
  button
    .closest(".options-container")
    .querySelectorAll(".option-button")
    .forEach((btn) => {
      btn.classList.remove("selected");
    });
  button.classList.add("selected");
  setTimeout(() => nextScreen(), 500);
}

function selectImprovementMethod(button) {
  button.classList.toggle("selected");
  const selectedButtons = document.querySelectorAll(
    "#screen12 .option-button.selected",
  );
  const continueButton = document.getElementById("continueBtn12");
  if (continueButton) {
    continueButton.disabled = selectedButtons.length === 0;
  }
}

function selectLearningChallenge(button) {
  button.classList.toggle("selected");
  const selectedButtons = document.querySelectorAll(
    "#screen13 .option-button.selected",
  );
  const continueButton = document.getElementById("continueBtn13");
  if (continueButton) {
    continueButton.disabled = selectedButtons.length === 0;
  }
}

window.selectSpeakingFeeling = function(card) {
  card
    .closest(".options-grid")
    .querySelectorAll(".option-card")
    .forEach((c) => {
      c.classList.remove("selected");
    });
  card.classList.add("selected");
  const continueButton = document.getElementById("continueBtn14");
  if (continueButton) {
    continueButton.disabled = false;
  }
};

window.selectAgreement2 = function(button) {
  button
    .closest(".agreement-options")
    .querySelectorAll(".agreement-button")
    .forEach((btn) => {
      btn.classList.remove("selected");
    });
  button.classList.add("selected");
  setTimeout(() => nextScreen(), 500);
};

window.selectLanguageLevel = function(button) {
  button
    .closest(".options-container")
    .querySelectorAll(".option-button")
    .forEach((btn) => {
      btn.classList.remove("selected");
    });
  button.classList.add("selected");
  const continueButton = document.getElementById("continueBtn18");
  if (continueButton) {
    continueButton.disabled = false;
  }
};

// Function to start the call countdown timer
function startCallTimer() {
  const timerElement = document.getElementById("callTimer");
  if (!timerElement) return;

  callTimer = setInterval(() => {
    callTimeRemaining--;

    const minutes = Math.floor(callTimeRemaining / 60);
    const seconds = callTimeRemaining % 60;
    const timeString = `${minutes.toString().padStart(2, "0")}:${seconds.toString().padStart(2, "0")}`;

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

  // Disconnect from AI service
  if (voiceAssessment) {
    voiceAssessment.disconnect();
  }

  // Show completion message
  alert("Call ended. Assessment complete!");
  // In the future, this could navigate to a results screen
};

// Function to toggle mute during call
window.toggleMute = function() {
  if (voiceAssessment) {
    voiceAssessment.toggleMute();

    const muteButton = document.getElementById("muteButton");
    if (muteButton) {
      const isMuted = !voiceAssessment.isRecording;
      muteButton.innerHTML = isMuted
        ? '<span style="font-size: 18px;">🔇</span>'
        : '<span style="font-size: 18px;">🔊</span>';
      muteButton.style.background = isMuted ? "#666" : "#4a9eff";
    }
  }
};

// document.addEventListener("DOMContentLoaded", function() {
//   // Attach event listeners for speaking feeling screen (screen14)
//   var screen14 = document.getElementById("screen14");
//   if (screen14) {
//     var cards = screen14.querySelectorAll(".option-card");
//     cards.forEach(function(card) {
//       card.addEventListener("click", function() {
//         cards.forEach(function(c) {
//           c.classList.remove("selected");
//         });
//         card.classList.add("selected");
//         var continueButton = document.getElementById("continueBtn14");
//         if (continueButton) {
//           continueButton.disabled = false;
//         }
//       });
//     });
//   }

//   // Debug: Log when DOM is loaded and check for startCall function
//   console.log("DOM loaded, startCall available:", typeof window.startCall);

//   // Add additional click listener to Start Call button as backup
//   setTimeout(() => {
//     const startCallButton = document.querySelector(
//       'button[onclick="startCall()"]',
//     );
//     if (startCallButton) {
//       console.log("Found Start Call button, adding backup click listener");
//       startCallButton.addEventListener("click", function(e) {
//         console.log("Start Call button clicked via event listener");
//         if (typeof window.startCall === "function") {
//           e.preventDefault();
//           window.startCall();
//         } else {
//           console.error("startCall function not found!");
//         }
//       });
//     } else {
//       console.log("Start Call button not found");
//     }
//   }, 1000);
// });

function base64ToArrayBuffer(base64) {
  const binaryString = atob(base64);
  const length = binaryString.length;
  const bytes = new Uint8Array(length);

  for (let i = 0; i < length; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }
  return bytes.buffer;
}

function createWAVHeader(sampleRate, numChannels, bitsPerSample, dataLength) {
  const byteRate = (sampleRate * numChannels * bitsPerSample) / 8;
  const blockAlign = (numChannels * bitsPerSample) / 8;
  const buffer = new ArrayBuffer(44);
  const view = new DataView(buffer);

  function writeString(view, offset, text) {
    for (let i = 0; i < text.length; i++) {
      view.setUint8(offset + i, text.charCodeAt(i));
    }
  }

  writeString(view, 0, 'RIFF');
  view.setUint32(4, 36 + dataLength, true);
  writeString(view, 8, 'WAVE');
  writeString(view, 12, 'fmt ');
  view.setUint32(16, 16, true);
  view.setUint16(20, 1, true);
  view.setUint16(22, numChannels, true);
  view.setUint32(24, sampleRate, true);
  view.setUint32(28, byteRate, true);
  view.setUint16(32, blockAlign, true);
  view.setUint16(34, bitsPerSample, true);
  writeString(view, 36, 'data');
  view.setUint32(40, dataLength, true);

  return buffer;
}

function createWAVBlob(pcmData, sampleRate, numChannels, bitsPerSample) {
  const wavHeader = createWAVHeader(
    sampleRate,
    numChannels,
    bitsPerSample,
    pcmData.byteLength
  );

  const wavBuffer = new Uint8Array(wavHeader.byteLength + pcmData.byteLength);
  wavBuffer.set(new Uint8Array(wavHeader), 0);
  wavBuffer.set(new Uint8Array(pcmData), wavHeader.byteLength);

  return new Blob([wavBuffer], { type: 'audio/wav' });
}
