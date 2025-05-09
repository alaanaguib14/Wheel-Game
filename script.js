let sentences = [];

    // --- Get References to Elements ---
    const startGameBtn = document.getElementById("start-game-btn");
    const spinBtn = document.getElementById("spin-btn");
    const repeatEsBtn = document.getElementById("repeat-es-btn");
    const repeatArBtn = document.getElementById("repeat-ar-btn");
    const passBtn = document.getElementById("pass-btn");
    const timerDisplay = document.getElementById("timer");
    const scoreDisplay = document.getElementById("score");
    const sentenceDisplay = document.getElementById("sentence-display");
    const canvas = document.getElementById("wheel");
    const ctx = canvas.getContext("2d");


    // --- Game State Variables ---
    let currentIndex = -1;
    let score = 0;
    let gameTimer;
    let reactionTimer;
    let totalTime = 240; // 4 minutes in seconds
    let reactionTime = 30; // seconds per sentence
    let rotation = 0;
    let pendingSpin = false;
    let gameStarted = false;

    const count = 25; // Number of segments
    const anglePerSlice = 360 / count;

    // --- Fetch Sentences ---
    fetch('sentences.json')
      .then(res => res.json())
      .then(data => {
          // Ensure we have enough sentences for the wheel count
          if (data.length < count) {
              console.error(`Error: Not enough sentences (${data.length}) provided for wheel count (${count}).`);
              sentenceDisplay.textContent = `Error: Need ${count} sentences in sentences.json.`;
              startGameBtn.disabled = true;
          } else {
              sentences = data.slice(0, count); // Use exactly 'count' sentences
              drawWheel();
          }
      })
      .catch(err => {
          console.error("Failed to load sentences:", err);
          sentenceDisplay.textContent = "Failed to load sentences. Cannot start game.";
          startGameBtn.disabled = true;
      });

    // --- Wheel Drawing Function ---
    function drawWheel(rotationAngle = 0) {
      const centerX = canvas.width / 2;
      const centerY = canvas.height / 2;
      // Adjusted radius for the smaller canvas (300px)
      const radius = canvas.width / 2 - 15; // Leave some padding from edge

      ctx.clearRect(0, 0, canvas.width, canvas.height);
      ctx.font = "bold 12px " + getComputedStyle(document.body).fontFamily; // Use body font, slightly smaller

      for (let i = 0; i < count; i++) {
        const startAngleRad = ((anglePerSlice * i + rotationAngle - 90) * Math.PI) / 180; // Offset by -90 to start at top
        const endAngleRad = ((anglePerSlice * (i + 1) + rotationAngle - 90) * Math.PI) / 180;

        ctx.beginPath();
        ctx.moveTo(centerX, centerY);
        ctx.arc(centerX, centerY, radius, startAngleRad, endAngleRad);
        ctx.closePath();

        // Cycle through a few nice colors
        const colors = ['#1abc9c', '#3498db', '#f1c40f', '#e74c3c', '#9b59b6', '#34495e'];
        ctx.fillStyle = colors[i % colors.length];
        ctx.fill();

        // Add a subtle line between segments
        ctx.strokeStyle = '#ffffff'; // White stroke
        ctx.lineWidth = 1;
        ctx.stroke();


        // --- Draw Text (Number) ---
        // Calculate angle for the middle of the segment for text placement
         const textAngleDeg = anglePerSlice * i + rotationAngle - 90 + anglePerSlice / 2;
         const textAngleRad = (textAngleDeg * Math.PI) / 180;

        // Adjust text distance based on new radius
        const textRadius = radius * 0.75; // Place text further in
        const x = centerX + Math.cos(textAngleRad) * textRadius;
        const y = centerY + Math.sin(textAngleRad) * textRadius;

        ctx.save();
        ctx.translate(x, y);
        // Rotate text to be upright relative to segment direction
        ctx.rotate(textAngleRad + Math.PI / 2);
        ctx.fillStyle = "#fff"; // White text for contrast
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        ctx.fillText(i + 1, 0, 0);
        ctx.restore();
      }

       // --- Add Pointer ---
        ctx.fillStyle = '#e74c3c'; // Red pointer
        ctx.beginPath();
        // Position pointer at the top edge
        ctx.moveTo(centerX - 10, 5); // Base point 1
        ctx.lineTo(centerX + 10, 5); // Base point 2
        ctx.lineTo(centerX, 20);   // Tip of the pointer
        ctx.closePath();
        ctx.fill();
        // Add a small border to pointer
        ctx.strokeStyle = '#c0392b';
        ctx.lineWidth = 1;
        ctx.stroke();
    }


    // --- Speech Synthesis Function ---
    function speak(text, lang) {
      window.speechSynthesis.cancel();
      const utter = new SpeechSynthesisUtterance(text);
      utter.lang = lang;
      // Optional: Adjust rate or pitch if desired
      // utter.rate = 1.0;
      // utter.pitch = 1.0;
      window.speechSynthesis.speak(utter);
    }

    // --- Main Game Timer Function ---
    function startGameTimer() {
      clearInterval(gameTimer);
      gameTimer = setInterval(() => {
        totalTime--;
        const mins = Math.floor(totalTime / 60);
        const secs = totalTime % 60;
        timerDisplay.textContent = `Time: ${mins}:${secs.toString().padStart(2, '0')}`;
        if (totalTime <= 0) {
          clearInterval(gameTimer);
          clearInterval(reactionTimer);
          sentenceDisplay.textContent = `Game over! Your final score: ${score}`;
          alert(`Game over! Your score: ${score}`);
          // Disable buttons
          startGameBtn.disabled = true; 
          spinBtn.disabled = true;
          repeatEsBtn.disabled = true;
          repeatArBtn.disabled = true;
          passBtn.disabled = true;
          pendingSpin = true; 
        }
      }, 1000);
    }

    // --- Reaction Timer Function (Per Sentence) ---
    function startReactionTimer() {
      let timeLeft = reactionTime;
      clearInterval(reactionTimer);
      reactionTimer = setInterval(() => {
        timeLeft--;
        if (timeLeft <= 0) {
          clearInterval(reactionTimer);
          if (totalTime > 0 && gameStarted) { 
            console.log("Reaction time expired! -5 points.");
            score -= 5;
            updateScore();
            sentenceDisplay.textContent = `Time ran out! -5 points. Spin or Pass.`;
          }
        }
      }, 1000);
    }

    // --- Update Score Display ---
    function updateScore() {
      scoreDisplay.textContent = `Score: ${score}`;
    }

    // --- Spin Wheel Animation and Logic ---
    function spinWheel(addPoint = false) {
      if (sentences.length === 0) {
        sentenceDisplay.textContent = "Cannot spin, sentences not loaded.";
        pendingSpin = false; return;
      }
      clearInterval(reactionTimer); // Stop timer for previous sentence

      const spins = Math.floor(Math.random() * 5) + 4; // More spins
      const winningSegmentIndex = Math.floor(Math.random() * count);

      // Calculate target angle: pointer is at top (0 degrees conceptually, -90 in canvas)
      // We want the *middle* of the winning segment to align with the pointer.
      const middleAngleDeg = (winningSegmentIndex * anglePerSlice) + (anglePerSlice / 2);
      // Adjust for the -90 degree offset used in drawing
      const targetAngle = (360 - middleAngleDeg) % 360;

      const finalAngle = (360 * spins) + targetAngle; // Total rotation degrees
      let start = null;
      const duration = 4000; // Longer spin duration
      const initialRotation = rotation % 360; // Current visual rotation


      function animateWheel(timestamp) {
        if (!start) start = timestamp;
        const progress = timestamp - start;

        // Ease-out function (quartic)
        const easing = (t) => 1 - Math.pow(1 - t, 4);
        const t = Math.min(progress / duration, 1);
        const easedT = easing(t);

        rotation = initialRotation + easedT * (finalAngle - initialRotation);
        drawWheel(rotation % 360);

        if (t < 1) {
          requestAnimationFrame(animateWheel);
        } else {
          // Spin Finished
          rotation = finalAngle % 360;
          drawWheel(rotation); // Final frame

          currentIndex = winningSegmentIndex;
          const sentence = sentences[currentIndex];

          if (sentence) {
              sentenceDisplay.textContent = `${sentence.es} / ${sentence.ar}`;
              speak(sentence.es, 'es-ES');
          } else {
              sentenceDisplay.textContent = "Error: Sentence not found.";
              console.error("Could not find sentence for index:", currentIndex);
          }

          if (addPoint) {
            score++;
            updateScore();
          }

          startReactionTimer(); // Start 30s timer for this sentence
          pendingSpin = false; // Allow next action
        }
      }
      requestAnimationFrame(animateWheel);
    }

    // --- Event Listeners ---

    // START GAME Button
    startGameBtn.addEventListener("click", () => {
        if (!gameStarted && sentences.length > 0) {
            gameStarted = true;
            startGameBtn.classList.add("hidden");

            // Show game controls
            spinBtn.classList.remove("hidden");
            repeatEsBtn.classList.remove("hidden");
            repeatArBtn.classList.remove("hidden");
            passBtn.classList.remove("hidden");

            startGameTimer();
            sentenceDisplay.textContent = "Spinning for the first time...";
            pendingSpin = true;
            spinWheel(false); // First spin, no points
        } else if (sentences.length === 0) {
             sentenceDisplay.textContent = "Cannot start: Sentences not loaded.";
        }
    });

    // SPIN Button
    spinBtn.addEventListener("click", () => {
      if (gameStarted && !pendingSpin) {
        pendingSpin = true;
        sentenceDisplay.textContent = "Spinning...";
        spinWheel(true); // Award point
      }
    });

    // REPEAT SPANISH Button
    repeatEsBtn.addEventListener("click", () => {
      if (gameStarted && currentIndex !== -1 && sentences[currentIndex]) {
        speak(sentences[currentIndex].es, 'es-ES');
      }
    });

    // REPEAT ARABIC Button
    repeatArBtn.addEventListener("click", () => {
      if (gameStarted && currentIndex !== -1 && sentences[currentIndex]) {
        speak(sentences[currentIndex].ar, 'ar-SA');
      }
    });

    // PASS Button
    passBtn.addEventListener("click", () => {
      if (gameStarted && !pendingSpin) {
        score--;
        updateScore();
        pendingSpin = true;
        sentenceDisplay.textContent = "Passed. Spinning again...";
        spinWheel(false); // Spin again, no points
      }
    });

    // --- Initial Setup ---
    drawWheel(); // Initial draw
    updateScore(); // Initial score display
