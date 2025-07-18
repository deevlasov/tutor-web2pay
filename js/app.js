let currentScreen = 1;
const totalScreens = 23;

const EPHEMERAL_KEY_ENDPOINT =
  "https://dev.learniqai.com/api/v1/open-ai/get-ephemeral-key";

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
    this.conversationEnded = false;
    this.conversationHistory = [];
    this.audioChunks = [];
    this.finalReport = null;
    this.reportText = "";
    this.isWaitingForResponse = false;
    this.isEndingCall = false;

    this.clearApiKey();

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

  clearApiKey() {
    localStorage.removeItem("openAiEK");
  }

  async getApiKey() {
    const existing = localStorage.getItem("openAiEK");
    if (existing) return existing;

    const response = await fetch(EPHEMERAL_KEY_ENDPOINT, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({}),
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const data = await response.json();
    const key = data.key;

    if (key) {
      localStorage.setItem("openAiEK", key);
      return key;
    }

    return key;
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
      const apiKey = await this.getApiKey();
      this.updateCallStatus("Connecting to AI Tutor...", "connecting");

      // OpenAI Realtime API WebSocket endpoint
      const wsUrl =
        "wss://api.openai.com/v1/realtime?model=gpt-4o-mini-realtime-preview-2024-10-01";

      this.ws = new WebSocket(wsUrl, [
        "realtime",
        "openai-insecure-api-key." + apiKey,
        "openai-beta.realtime-v1",
      ]);

      this.ws.onopen = () => {
        // Send authentication and configuration
        const authMessage = {
          type: "session.update",
          session: {
            modalities: ["text", "audio"],
            instructions: `
You are Stacy, an AI English conversation partner designed to evaluate English language proficiency. Your role has two phases:

PHASE 1 - CONVERSATION PARTNER:
- Engage in natural, friendly conversation with the user
- Choose topics that encourage the user to speak extensively (hobbies, travel, work, opinions on current events, describing experiences, etc.)
- Ask follow-up questions to keep the conversation flowing
- Gradually increase complexity of your language and topics based on the user's responses
- Be encouraging and supportive to make the user feel comfortable speaking
- Do NOT correct mistakes during the conversation - maintain natural flow
- Internally observe and remember:
  * Grammar mistakes and patterns
  * Vocabulary usage and limitations
  * Pronunciation issues (if detectable through speech patterns)
  * Fluency and hesitation patterns
  * Sentence structure complexity
  * Use of idioms, phrasal verbs, and advanced structures
  * Accent characteristics
  * Overall communication effectiveness

PHASE 2 - EVALUATION:
- After the conversation ends, you will receive a request to provide detailed feedback
- Draw from your observations during the conversation to give comprehensive analysis

CONVERSATION GUIDELINES:
- Start with casual topics and gradually explore more complex themes
- Adapt your speaking speed and complexity to slightly challenge the user
- Encourage elaboration with questions like "Can you tell me more about that?" or "What do you think about...?"
- Keep the conversation engaging for 4 minutes of speaking time
- Take note of recurring errors without interrupting the flow
`,
            voice: "alloy",
            input_audio_format: "pcm16",
            output_audio_format: "pcm16",

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

      case "response.created":
        console.log("Response generation started");
        this.isWaitingForResponse = true;
        break;

      case "input_audio_buffer.speech_started":
        console.log("Speech started");
        break;

      case "input_audio_buffer.speech_stopped":
        console.log("Speech stopped");
        break;

      case "input_audio_buffer.committed":
        console.log("Audio buffer committed - response will be generated");
        this.isWaitingForResponse = true;
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
        // If conversation has ended, this is the evaluation report
        if (this.conversationEnded) {
          console.log("Evaluation report chunk:", message.delta);
          this.reportText += message.delta;
        }
        break;

      case "response.audio_transcript.done":
        // Handle complete audio transcript response
        if (this.conversationEnded) {
          console.log("=== COMPLETE EVALUATION REPORT ===");
          console.log(message.transcript);
          console.log("=== END OF EVALUATION REPORT ===");
          const reportText = message.transcript || this.reportText;
          this.finalReport = this.parseJsonReport(reportText);
        }
        break;

      case "response.text.delta":
        // Handle text-only response chunks
        if (this.conversationEnded) {
          console.log("Evaluation report chunk:", message.delta);
          this.reportText += message.delta;
        }
        break;

      case "response.text.done":
        // Handle complete text-only response
        // If conversation has ended, this is the complete evaluation report
        if (this.conversationEnded) {
          console.log("=== COMPLETE EVALUATION REPORT ===");
          console.log(message.text);
          console.log("=== END OF EVALUATION REPORT ===");
          const reportText = message.text || this.reportText;
          this.finalReport = this.parseJsonReport(reportText);
        }
        break;

      case "response.output_item.added":
        // Handle when a new output item is added to the response
        if (
          this.conversationEnded &&
          message.item &&
          message.item.type === "message"
        ) {
          console.log("Response item added:", message.item);
        }
        break;

      case "response.content_part.added":
        // Handle when content parts are added
        if (
          this.conversationEnded &&
          message.part &&
          message.part.type === "text"
        ) {
          console.log("Text content part added:", message.part.text);
        }
        break;

      case "response.content_part.done":
        // Handle when content parts are completed
        if (
          this.conversationEnded &&
          message.part &&
          message.part.type === "text"
        ) {
          console.log("=== EVALUATION REPORT SECTION COMPLETE ===");
          console.log(message.part.text);
          console.log("=== END OF SECTION ===");
          const reportText = message.part.text || this.reportText;
          this.finalReport = this.parseJsonReport(reportText);
        }
        break;

      case "response.done":
        // console.log("Received response.done:", message);
        console.log("Response completed");
        this.isWaitingForResponse = false;
        // If conversation has ended, this is likely the evaluation report
        if (this.conversationEnded) {
          console.log("=== ENGLISH PROFICIENCY EVALUATION COMPLETE ===");
          this.updateCallUI(
            "Assessment Complete!",
            "Your English proficiency report is ready",
          );
        }
        break;

      case "response.cancelled":
        console.log("Response cancelled");
        this.isWaitingForResponse = false;
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

  async sendReportRequest() {
    if (!this.isConnected || !this.ws) {
      console.error("Cannot send report request: WebSocket not connected");
      return;
    }

    console.log("Setting conversationEnded to true and sending report request");
    this.conversationEnded = true;
    this.reportText = ""; // Reset report text accumulation

    const message = `
The conversation is now complete. Please provide a comprehensive English proficiency evaluation based on our conversation.

IMPORTANT: Respond with ONLY a valid JSON object. Do not include any additional text, explanations, or formatting. The response must be parseable by JSON.parse().

Use this exact JSON structure:
{
  "overallProficiencyLevel": {
    "level": "A1|A2|B1|B2|C1|C2",
    "justification": "Brief explanation of level assessment"
  },
  "strengths": [
    "What the user did well",
    "Areas of confident communication",
    "Effective language use patterns"
  ],
  "areasForImprovement": {
    "grammarAndSyntax": [
      "Specific grammar mistakes with examples",
      "Recurring error patterns",
      "Sentence structure issues"
    ],
    "vocabularyAndExpression": [
      "Vocabulary range and appropriateness",
      "Word choice accuracy",
      "Use of idiomatic expressions"
    ],
    "fluencyAndCoherence": [
      "Speaking rhythm and flow",
      "Hesitation patterns",
      "Ability to maintain topic coherence",
      "Transition between ideas"
    ],
    "pronunciationAndAccent": [
      "Notable pronunciation issues",
      "Accent characteristics",
      "Clarity of speech",
      "Stress and intonation patterns"
    ]
  },
  "specificExamples": [
    {
      "type": "strength|improvement",
      "example": "Specific example from conversation",
      "analysis": "Why this illustrates the point"
    }
  ],
  "recommendations": [
    "Targeted practice suggestions",
    "Specific skills to focus on",
    "Resources or activities that would help"
  ],
  "conversationTopics": {
    "topicsCovered": ["list of topics discussed"],
    "handlingAssessment": "How well user handled different topic types"
  }
}

Remember: Respond with ONLY the JSON object, no additional text.
`;

    try {
      const reportMessage = {
        type: "conversation.item.create",
        item: {
          type: "message",
          role: "user",
          content: [
            {
              type: "input_text",
              text: message,
            },
          ],
        },
      };

      this.ws.send(JSON.stringify(reportMessage));

      // Trigger response generation
      const responseMessage = {
        type: "response.create",
        response: {
          modalities: ["text"],
          instructions:
            "You must respond with ONLY a valid JSON object. Do not include any additional text, explanations, markdown formatting, or code blocks. The response must be parseable by JSON.parse(). Start directly with { and end with }.",
        },
      };

      this.isWaitingForResponse = true;
      this.ws.send(JSON.stringify(responseMessage));

      console.log("Report request sent successfully");
      console.log("Conversation ended flag:", this.conversationEnded);
      console.log("WebSocket connection maintained for receiving evaluation");
    } catch (error) {
      console.error("Failed to send report request:", error);
    }
  }

  disconnect() {
    // Only close WebSocket if conversation hasn't ended (for backwards compatibility)
    if (this.ws && !this.conversationEnded) {
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

    // Only set isConnected to false if we're actually disconnecting
    if (!this.conversationEnded) {
      this.isConnected = false;
    }
  }

  // New method to fully disconnect and clean up
  fullDisconnect() {
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
    this.conversationEnded = false;
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

  parseJsonReport(reportText) {
    if (!reportText || typeof reportText !== "string") {
      return {
        error: "No report text provided",
        rawText: reportText,
      };
    }

    // Clean up the text - remove any markdown formatting or extra whitespace
    let cleanedText = reportText.trim();

    // Find JSON object boundaries
    const jsonStart = cleanedText.indexOf("{");
    const jsonEnd = cleanedText.lastIndexOf("}");

    if (jsonStart === -1 || jsonEnd === -1) {
      console.error("No JSON object found in report");
      return {
        error: "No JSON object found in report",
        rawText: reportText,
      };
    }

    // Extract just the JSON part
    const jsonText = cleanedText.substring(jsonStart, jsonEnd + 1);

    try {
      const parsedReport = JSON.parse(jsonText);
      console.log("Successfully parsed JSON report:", parsedReport);
      return parsedReport;
    } catch (error) {
      console.error("Failed to parse report as JSON:", error);
      console.error("Attempted to parse:", jsonText);
      return {
        error: "Failed to parse report as JSON",
        parseError: error.message,
        rawText: reportText,
        attemptedJson: jsonText,
      };
    }
  }

  async endCallSafely() {
    if (this.isEndingCall) {
      console.log("Call ending already in progress");
      return;
    }

    this.isEndingCall = true;
    console.log("Starting safe call ending process");

    try {
      // Stop recording immediately
      if (this.isRecording) {
        this.stopRecording();
        console.log("Recording stopped");
      }

      // Update call status and UI
      this.updateCallStatus("Processing conversation...", "processing");
      this.updateCallUI(
        "Ending call...",
        "Please wait while we process your conversation",
      );

      // Wait for any pending responses to complete
      console.log("Waiting for pending responses to complete...");
      let waitTime = 0;
      const maxWaitTime = 10000; // 10 seconds max
      const checkInterval = 500; // Check every 500ms

      while (this.isWaitingForResponse && waitTime < maxWaitTime) {
        await new Promise((resolve) => setTimeout(resolve, checkInterval));
        waitTime += checkInterval;
        console.log(`Waiting... ${waitTime}ms`);

        // Check if WebSocket is still connected
        if (!this.ws || this.ws.readyState !== WebSocket.OPEN) {
          console.log("WebSocket disconnected, stopping wait");
          break;
        }

        // Update UI with progress
        const progress = Math.min((waitTime / maxWaitTime) * 50, 50);
        this.updateCallUI(
          "Waiting for responses...",
          `${Math.round(progress)}% complete`,
        );
      }

      if (waitTime >= maxWaitTime) {
        console.log("Max wait time reached, proceeding with report request");
      } else {
        console.log("All responses completed, proceeding with report request");
      }

      // Additional safety delay with progress feedback
      this.updateCallUI("Preparing assessment...", "Almost ready...");
      await new Promise((resolve) => setTimeout(resolve, 2000));

      // Check WebSocket connection before requesting report
      if (!this.ws || this.ws.readyState !== WebSocket.OPEN) {
        console.error("WebSocket disconnected, cannot request report");
        this.updateCallStatus("Connection lost", "error");
        this.updateCallUI("Connection lost", "Unable to generate report");
        return;
      }

      // Now request the report
      console.log("Requesting final report...");
      this.updateCallStatus("Generating assessment report...", "generating");
      this.updateCallUI(
        "Generating report...",
        "Creating your personalized assessment",
      );
      this.sendReportRequest();
    } catch (error) {
      console.error("Error during call ending process:", error);
      this.updateCallStatus("Error ending call", "error");
      this.updateCallUI("Error", "Something went wrong. Please try again.");
      this.isEndingCall = false;
    }
  }

  updateCallUI(title, message) {
    // Update call screen UI elements
    const callTitle = document.querySelector("#screen23 h2");
    const callMessage = document.querySelector("#screen23 .call-message");

    if (callTitle) {
      callTitle.textContent = title;
    }

    if (callMessage) {
      callMessage.textContent = message;
    } else {
      // Create message element if it doesn't exist
      const messageElement = document.createElement("div");
      messageElement.className = "call-message";
      messageElement.textContent = message;
      messageElement.style.cssText =
        "margin-top: 20px; font-size: 14px; color: #666; text-align: center;";

      const screen23 = document.getElementById("screen23");
      if (screen23) {
        screen23.appendChild(messageElement);
      }
    }
  }

  isValidReport() {
    return this.finalReport && !this.finalReport.error;
  }

  getFinalReport() {
    return this.finalReport;
  }

  getFinalReportRawText() {
    return this.finalReport && this.finalReport.rawText
      ? this.finalReport.rawText
      : null;
  }

  isReportReady() {
    return this.finalReport !== null;
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

window.selectSpeakingFeeling = function (card) {
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

window.selectAgreement2 = function (button) {
  button
    .closest(".agreement-options")
    .querySelectorAll(".agreement-button")
    .forEach((btn) => {
      btn.classList.remove("selected");
    });
  button.classList.add("selected");
  setTimeout(() => nextScreen(), 500);
};

window.selectLanguageLevel = function (button) {
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
window.endCall = async function () {
  if (callTimer) {
    clearInterval(callTimer);
    callTimer = null;
  }

  // Use safe call ending process
  if (voiceAssessment) {
    try {
      await voiceAssessment.endCallSafely();
    } catch (error) {
      console.error("Error ending call:", error);
      alert("Error ending call. Please check the console for details.");
    }
  }
};

// Function to toggle mute during call
window.toggleMute = function () {
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

// Global functions to access final report
window.getFinalReport = function () {
  return voiceAssessment ? voiceAssessment.getFinalReport() : null;
};

window.getFinalReportRawText = function () {
  return voiceAssessment ? voiceAssessment.getFinalReportRawText() : null;
};

window.isReportReady = function () {
  return voiceAssessment ? voiceAssessment.isReportReady() : false;
};

window.isValidReport = function () {
  return voiceAssessment ? voiceAssessment.isValidReport() : false;
};

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

  writeString(view, 0, "RIFF");
  view.setUint32(4, 36 + dataLength, true);
  writeString(view, 8, "WAVE");
  writeString(view, 12, "fmt ");
  view.setUint32(16, 16, true);
  view.setUint16(20, 1, true);
  view.setUint16(22, numChannels, true);
  view.setUint32(24, sampleRate, true);
  view.setUint32(28, byteRate, true);
  view.setUint16(32, blockAlign, true);
  view.setUint16(34, bitsPerSample, true);
  writeString(view, 36, "data");
  view.setUint32(40, dataLength, true);

  return buffer;
}

function createWAVBlob(pcmData, sampleRate, numChannels, bitsPerSample) {
  const wavHeader = createWAVHeader(
    sampleRate,
    numChannels,
    bitsPerSample,
    pcmData.byteLength,
  );

  const wavBuffer = new Uint8Array(wavHeader.byteLength + pcmData.byteLength);
  wavBuffer.set(new Uint8Array(wavHeader), 0);
  wavBuffer.set(new Uint8Array(pcmData), wavHeader.byteLength);

  return new Blob([wavBuffer], { type: "audio/wav" });
}
