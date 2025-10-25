/* (async () => {
    if (typeof tmImage === "undefined") {
        console.error("tmImage is not loaded! Check your script tags.");
        return;
    }

    const URL = "my_model/";

    // Hier kun je jouw classes aan geluiden en afbeeldingen koppelen

    const sounds = {
        "Batman": new Audio("my_sounds/batman.mp3"),
        "PawPatrol": new Audio("my_sounds/paw patrol.mp3"),
        "Puppy": new Audio("my_sounds/puppy.mp3")
    };

    const images = {
        "Batman": "my_images/pizza.png",
        "PawPatrol": "my_images/koekje.png",
        "Puppy": "my_images/chocolade.png",
        "Neutral": "my_images/neutraal.png"
    };

    // ---

    let model = null, webcam = null;
    const confidenceThreshold = 0.7; 
    const maxThreshold = 1.0;        
    const holdTime = 2000;            
    const cooldown = 4000;            
    const bufferSize = 5;             
    const displayHoldDuration = 5000; 
    const neutralHoldDuration = 500;  

    const holdStart = {};             
    const lastPlayed = {};
    const predictionBuffer = {};      
    let currentDetectedClass = null;
    let lastDetectionTime = 0;
    let lastNeutralTime = 0;

    const imageDiv = document.getElementById("image-display");
    imageDiv.innerHTML = `<img src="${images["Neutral"]}" alt="Neutral">`;

    try {
        webcam = new tmImage.Webcam(400, 300, true, { facingMode: "user" });
        await webcam.setup();
        await webcam.play();
        document.getElementById("webcam-container").appendChild(webcam.canvas);
        console.log("Webcam ready!");
    } catch (err) {
        console.error("Webcam initialization failed:", err);
        return;
    }

    try {
        model = await tmImage.load(URL + "model.json", URL + "metadata.json");
        console.log("Model loaded!");
    } catch (err) {
        console.error("Model loading failed:", err);
        model = null;
    }

    async function loop() {
        webcam.update();
        if (model) await predict();
        requestAnimationFrame(loop);
    }

    async function predict() {
        try {
            const prediction = await model.predict(webcam.canvas);

            let highest = prediction.reduce((a, b) => a.probability > b.probability ? a : b);
            const className = highest.className;
            const prob = highest.probability;

            if (!predictionBuffer[className]) predictionBuffer[className] = [];
            predictionBuffer[className].push(prob);
            if (predictionBuffer[className].length > bufferSize) predictionBuffer[className].shift();
            const avgProb = predictionBuffer[className].reduce((a, b) => a + b, 0) / predictionBuffer[className].length;

            const now = Date.now();

            if (currentDetectedClass && now - lastDetectionTime < displayHoldDuration) {
                document.getElementById("prediction").innerText = `Detected: ${currentDetectedClass}`;
                return;
            }

            if (avgProb < confidenceThreshold) {
                if (!currentDetectedClass || now - lastNeutralTime > neutralHoldDuration) {
                    document.getElementById("prediction").innerText = "No detection";
                    imageDiv.innerHTML = `<img src="${images["Neutral"]}" alt="Neutral">`;
                    currentDetectedClass = null;
                    lastNeutralTime = now;
                }
                return;
            }

            document.getElementById("prediction").innerText =
                `Detected: ${className} (${(avgProb*100).toFixed(2)}%)`;

 //           if (sounds[className] && avgProb >= confidenceThreshold && avgProb <= maxThreshold) {
 //               if (!holdStart[className]) holdStart[className] = now;
 //
 //             if (now - holdStart[className] >= holdTime) {
 //                 if (!lastPlayed[className] || now - lastPlayed[className] > cooldown) {
 //                     sounds[className].play();
 //                     lastPlayed[className] = now;
 //                       imageDiv.innerHTML = `<img src="${images[className]}" alt="${className}">`;
 //                       currentDetectedClass = className;
 //                       lastDetectionTime = now;
 //                   }
  //                  holdStart[className] = null;
  //              }
  //          } else {
  //              holdStart[className] = null;
  //          }

    //nieuw
    if (sounds[className] && avgProb >= confidenceThreshold) {
    if (!holdStart[className]) holdStart[className] = now;

    if (now - holdStart[className] >= holdTime) {
        if (!lastPlayed[className] || now - lastPlayed[className] > cooldown) {
            console.log(`✅ ${className} gedetecteerd! Geluid en afbeelding worden getoond.`);
            sounds[className].play();
            lastPlayed[className] = now;

            imageDiv.innerHTML = `<img src="${images[className]}" alt="${className}">`;
            currentDetectedClass = className;
            lastDetectionTime = now;
        }
    }
} else {
    holdStart[className] = null;
}




        } catch (err) {
            console.error("Prediction failed:", err);
        }
    }

    loop();
})();

*/
(async () => {
    if (typeof tmImage === "undefined") {
        console.error("tmImage is not loaded! Check your script tags.");
        return;
    }

    const URL = "my_model/";

    // 🎵 Geluiden en afbeeldingen per klasse
    const sounds = {
        "Pizza": new Audio("my_sounds/batman.mp3"),
        "Koekje": new Audio("my_sounds/paw_patrol.mp3"),
        "Chocolade": new Audio("my_sounds/puppy.mp3")
    };

    const images = {
        "Pizza": "my_images/batman.png",
        "Koekje": "my_images/PawPatrol.png",
        "Chocolade": "my_images/puppy.png",
        "Neutral": "my_images/neutraal.png"
    };

    // 🔧 Instellingen
    const CONFIDENCE_THRESHOLD = 0.9;  // minimaal vertrouwen
    const HOLD_TIME = 2000;            // tijd dat object stabiel zichtbaar moet zijn
    const COOLDOWN = 4000;             // wachttijd voor volgende detectie
    const DISPLAY_TIME = 5000;         // hoelang het plaatje zichtbaar blijft
    const SMOOTHING = 5;               // aantal frames voor gemiddelde

    let model, webcam;
    const buffers = {};
    const holdStart = {};
    const lastPlayed = {};
    let currentDetectedClass = null;
    let lastDetectionTime = 0;

    const imageDiv = document.getElementById("image-display");
    const predictionText = document.getElementById("prediction");
    imageDiv.innerHTML = `<img src="${images["Neutral"]}" alt="Neutral">`;

    // 🔑 Startknop voor audio-toestemming
    const startButton = document.createElement("button");
    startButton.innerText = "Klik om te starten";
    startButton.style.fontSize = "20px";
    startButton.style.padding = "10px 20px";
    document.body.appendChild(startButton);

    startButton.addEventListener("click", async () => {
        try {
            // unlock audio: speel kort geluid voor alle Audio-objecten
            Object.values(sounds).forEach(audio => {
                audio.play().then(() => audio.pause()).catch(() => {});
            });

            webcam = new tmImage.Webcam(400, 300, true);
            await webcam.setup();
            await webcam.play();
            document.getElementById("webcam-container").appendChild(webcam.canvas);

            model = await tmImage.load(URL + "model.json", URL + "metadata.json");

            console.log("✅ Webcam en model klaar, audio mag nu afspelen");
            startButton.style.display = "none";

            loop();
        } catch (err) {
            console.error("❌ Fout bij starten:", err);
        }
    });

    async function loop() {
        webcam.update();
        if (model) await predict();
        requestAnimationFrame(loop);
    }
    

    async function predict() {
        const prediction = await model.predict(webcam.canvas);
        const now = Date.now();

        // Log alle kansen
        console.log(prediction.map(p => `${p.className}: ${(p.probability*100).toFixed(1)}%`).join(" | "));

        // Hoogste waarschijnlijkheid kiezen
        let highest = prediction.reduce((a, b) => a.probability > b.probability ? a : b);
        const className = highest.className;
        const prob = highest.probability;

        // Smoothen
        if (!buffers[className]) buffers[className] = [];
        buffers[className].push(prob);
        if (buffers[className].length > SMOOTHING) buffers[className].shift();
        const avgProb = buffers[className].reduce((a, b) => a + b, 0) / buffers[className].length;

        predictionText.innerText = `Detected: ${className} (${(avgProb * 100).toFixed(1)}%)`;

        if (avgProb < CONFIDENCE_THRESHOLD) {
            currentDetectedClass = null;
            holdStart[className] = null;
            return;
        }

        // Start timer bij nieuwe detectie
        if (!holdStart[className]) holdStart[className] = now;

        // Check hold tijd
        if (now - holdStart[className] >= HOLD_TIME) {
            if (!lastPlayed[className] || now - lastPlayed[className] > COOLDOWN) {
                console.log(`✅ ${className} gedetecteerd! Geluid en afbeelding worden getoond.`);

                // Geluid afspelen
                sounds[className].currentTime = 0;
                sounds[className].play().catch(err => console.warn("Geluid kon niet worden afgespeeld:", err));

                setTimeout(() => {
                sounds[className].pause();
                }, 4000);

                // Afbeelding tonen
                imageDiv.innerHTML = `<img src="${images[className]}" alt="${className}">`;
                currentDetectedClass = className;
                lastDetectionTime = now;
                lastPlayed[className] = now;

                // Na DISPLAY_TIME terug naar neutraal
                setTimeout(() => {
                    imageDiv.innerHTML = `<img src="${images["Neutral"]}" alt="Neutral">`;
                    predictionText.innerText = `Wachten op nieuwe detectie...`;
                    holdStart[className] = null;
                }, DISPLAY_TIME);
            }
        }
    }

})();
