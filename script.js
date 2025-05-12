let sentences = [];

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

    fetch('sentences.json')
      .then(res => res.json())
      .then(data => {
          if (data.length < count) {
              console.error(`Error: Not enough sentences (${data.length}) provided for wheel count (${count}).`);
              sentenceDisplay.textContent = `Error: Need ${count} sentences in sentences.json.`;
              startGameBtn.disabled = true;
          } else {
              sentences = data.slice(0, count);
              drawWheel();
          }
      })
      .catch(err => {
          console.error("Failed to load sentences:", err);
          sentenceDisplay.textContent = "Failed to load sentences. Cannot start game.";
          startGameBtn.disabled = true;
      });

    function drawWheel(rotationAngle = 0) {
      const centerX = canvas.width / 2;
      const centerY = canvas.height / 2;
      const radius = canvas.width / 2 - 15;

      ctx.clearRect(0, 0, canvas.width, canvas.height);
      ctx.font = "bold 12px " + getComputedStyle(document.body).fontFamily;

      for (let i = 0; i < count; i++) {
        const startAngleRad = ((anglePerSlice * i + rotationAngle - 90) * Math.PI) / 180;
        const endAngleRad = ((anglePerSlice * (i + 1) + rotationAngle - 90) * Math.PI) / 180;

        ctx.beginPath();
        ctx.moveTo(centerX, centerY);
        ctx.arc(centerX, centerY, radius, startAngleRad, endAngleRad);
        ctx.closePath();

        const colors = ['#1abc9c', '#3498db', '#f1c40f', '#e74c3c', '#9b59b6', '#34495e'];
        ctx.fillStyle = colors[i % colors.length];
        ctx.fill();

        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = 1;
        ctx.stroke();


         const textAngleDeg = anglePerSlice * i + rotationAngle - 90 + anglePerSlice / 2;
         const textAngleRad = (textAngleDeg * Math.PI) / 180;

        const textRadius = radius * 0.75;
        const x = centerX + Math.cos(textAngleRad) * textRadius;
        const y = centerY + Math.sin(textAngleRad) * textRadius;

        ctx.save();
        ctx.translate(x, y);
        ctx.rotate(textAngleRad + Math.PI / 2);
        ctx.fillStyle = "#fff";
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        ctx.fillText(i + 1, 0, 0);
        ctx.restore();
      }

        ctx.fillStyle = '#e74c3c';
        ctx.beginPath();
        ctx.moveTo(centerX - 10, 5); 
        ctx.lineTo(centerX + 10, 5); 
        ctx.lineTo(centerX, 20); 
        ctx.closePath();
        ctx.fill();
        ctx.strokeStyle = '#c0392b';
        ctx.lineWidth = 1;
        ctx.stroke();
    }


    function speak(text, lang) {
      window.speechSynthesis.cancel();
      const utter = new SpeechSynthesisUtterance(text);
      utter.lang = lang;
      // utter.rate = 1.0;
      // utter.pitch = 1.0;
      window.speechSynthesis.speak(utter);
    }

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
          startGameBtn.disabled = true; 
          spinBtn.disabled = true;
          repeatEsBtn.disabled = true;
          repeatArBtn.disabled = true;
          passBtn.disabled = true;
          pendingSpin = true; 
        }
      }, 1000);
    }

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

    function updateScore() {
      scoreDisplay.textContent = `Score: ${score}`;
    }

    function spinWheel(addPoint = false) {
      if (sentences.length === 0) {
        sentenceDisplay.textContent = "Cannot spin, sentences not loaded.";
        pendingSpin = false; return;
      }
      clearInterval(reactionTimer);

      const spins = Math.floor(Math.random() * 5) + 4; 
      const winningSegmentIndex = Math.floor(Math.random() * count);

      const middleAngleDeg = (winningSegmentIndex * anglePerSlice) + (anglePerSlice / 2);
      const targetAngle = (360 - middleAngleDeg) % 360;

      const finalAngle = (360 * spins) + targetAngle; 
      let start = null;
      const duration = 4000; // spin duration
      const initialRotation = rotation % 360; // visual rotation


      function animateWheel(timestamp) {
        if (!start) start = timestamp;
        const progress = timestamp - start;

        const easing = (t) => 1 - Math.pow(1 - t, 4);
        const t = Math.min(progress / duration, 1);
        const easedT = easing(t);

        rotation = initialRotation + easedT * (finalAngle - initialRotation);
        drawWheel(rotation % 360);

        if (t < 1) {
          requestAnimationFrame(animateWheel);
        } else {
          rotation = finalAngle % 360;
          drawWheel(rotation); 

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

          startReactionTimer(); 
          pendingSpin = false; 
        }
      }
      requestAnimationFrame(animateWheel);
    }


    startGameBtn.addEventListener("click", () => {
        if (!gameStarted && sentences.length > 0) {
            gameStarted = true;
            startGameBtn.classList.add("hidden");

            spinBtn.classList.remove("hidden");
            repeatEsBtn.classList.remove("hidden");
            repeatArBtn.classList.remove("hidden");
            passBtn.classList.remove("hidden");

            startGameTimer();
            sentenceDisplay.textContent = "Spinning for the first time...";
            pendingSpin = true;
            spinWheel(false);
        } else if (sentences.length === 0) {
             sentenceDisplay.textContent = "Cannot start: Sentences not loaded.";
        }
    });

    spinBtn.addEventListener("click", () => {
      if (gameStarted && !pendingSpin) {
        pendingSpin = true;
        sentenceDisplay.textContent = "Spinning...";
        spinWheel(true); 
      }
    });

    repeatEsBtn.addEventListener("click", () => {
      if (gameStarted && currentIndex !== -1 && sentences[currentIndex]) {
        speak(sentences[currentIndex].es, 'es-ES');
      }
    });

    repeatArBtn.addEventListener("click", () => {
      if (gameStarted && currentIndex !== -1 && sentences[currentIndex]) {
        speak(sentences[currentIndex].ar, 'ar-SA');
      }
    });

    passBtn.addEventListener("click", () => {
      if (gameStarted && !pendingSpin) {
        score--;
        updateScore();
        pendingSpin = true;
        sentenceDisplay.textContent = "Passed. Spinning again...";
        spinWheel(false);
      }
    });

    drawWheel();
    updateScore();
