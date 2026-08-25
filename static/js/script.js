// =========================================================
// ELEMENTS
// =========================================================

const phoneStatus =
    document.getElementById("phoneStatus");

const safetyStatus =
    document.getElementById("safetyStatus");

const safetyBox =
    document.getElementById("safetyBox");

const warningBox =
    document.getElementById("warningBox");

const warningMessage =
    document.getElementById("warningMessage");


const camera =
    document.getElementById("camera");

const output =
    document.getElementById("output");

const canvas =
    document.getElementById("canvas");


const startBtn =
    document.getElementById("startBtn");

const stopBtn =
    document.getElementById("stopBtn");


const faceCount =
    document.getElementById("faceCount");

const fpsElement =
    document.getElementById("fps");

const detectionStatus =
    document.getElementById("detectionStatus");


const statusDot =
    document.getElementById("statusDot");

const statusText =
    document.getElementById("statusText");


const placeholder =
    document.getElementById("cameraPlaceholder");


// =========================================================
// VARIABLES
// =========================================================

let stream = null;

let running = false;

let processing = false;


// FPS variables

let lastFrameTime =
    performance.now();

let frameCounter = 0;


// Warning sound cooldown

let lastWarningTime = 0;


// =========================================================
// START CAMERA
// =========================================================

startBtn.addEventListener(
    "click",
    async () => {

        try {

            stream =
                await navigator.mediaDevices
                    .getUserMedia({

                        video: {

                            width: {
                                ideal: 640
                            },

                            height: {
                                ideal: 480
                            },

                            facingMode: "user"

                        },

                        audio: false

                    });


            // Connect camera stream

            camera.srcObject = stream;


            // Show camera

            camera.style.display =
                "block";

            output.style.display =
                "block";


            placeholder.style.display =
                "none";


            // State

            running = true;

            processing = false;


            // Buttons

            startBtn.disabled =
                true;

            stopBtn.disabled =
                false;


            // Status

            statusText.textContent =
                "Camera Active";

            statusDot.style.background =
                "#22c55e";


            detectionStatus.textContent =
                "ON";


            detectionStatus.style.color =
                "#16a34a";


            // Reset FPS

            frameCounter = 0;

            lastFrameTime =
                performance.now();


            // Start processing

            processFrame();


        }
        catch (error) {

            console.error(
                "Camera error:",
                error
            );


            alert(
                "Camera access denied or camera is not available."
            );

        }

    }
);


// =========================================================
// STOP CAMERA
// =========================================================

stopBtn.addEventListener(
    "click",
    stopCamera
);


function stopCamera() {

    running = false;

    processing = false;


    // Stop camera tracks

    if (stream) {

        stream
            .getTracks()
            .forEach(
                track => track.stop()
            );

        stream = null;

    }


    // Remove video stream

    camera.srcObject = null;


    // Hide camera

    camera.style.display =
        "none";

    output.style.display =
        "none";


    placeholder.style.display =
        "block";


    // Buttons

    startBtn.disabled =
        false;

    stopBtn.disabled =
        true;


    // Status

    statusText.textContent =
        "Camera Off";

    statusDot.style.background =
        "#ef4444";


    // Reset statistics

    faceCount.textContent =
        "0";

    phoneStatus.textContent =
        "None";

    phoneStatus.style.color =
        "";


    safetyStatus.textContent =
        "OFF";

    safetyBox.classList.remove(
        "warning-active"
    );


    fpsElement.textContent =
        "0";


    detectionStatus.textContent =
        "OFF";

    detectionStatus.style.color =
        "";


    // Hide warning

    warningBox.style.display =
        "none";


    warningMessage.textContent =
        "No warning";


    // Stop speech

    if (
        "speechSynthesis"
        in window
    ) {

        window.speechSynthesis.cancel();

    }

}


// =========================================================
// PROCESS FRAME
// =========================================================

async function processFrame() {

    if (!running) {

        return;

    }


    // Make sure video is ready

    if (
        camera.readyState >=
        HTMLMediaElement.HAVE_CURRENT_DATA
    ) {


        // Prevent multiple requests

        if (!processing) {

            processing = true;


            try {

                const width =
                    camera.videoWidth;

                const height =
                    camera.videoHeight;


                if (
                    width === 0 ||
                    height === 0
                ) {

                    processing = false;

                    setTimeout(
                        processFrame,
                        100
                    );

                    return;

                }


                // Canvas size

                canvas.width =
                    width;

                canvas.height =
                    height;


                const ctx =
                    canvas.getContext("2d");


                // Draw camera frame

                ctx.drawImage(
                    camera,
                    0,
                    0,
                    width,
                    height
                );


                // Convert frame to JPEG

                const blob =
                    await new Promise(
                        resolve => {

                            canvas.toBlob(
                                resolve,
                                "image/jpeg",
                                0.70
                            );

                        }
                    );


                if (!blob) {

                    throw new Error(
                        "Could not create image blob."
                    );

                }


                // Create FormData

                const formData =
                    new FormData();


                formData.append(
                    "frame",
                    blob,
                    "frame.jpg"
                );


                // Send frame to Flask

                const response =
                    await fetch(
                        "/detect",
                        {

                            method: "POST",

                            body: formData

                        }
                    );


                if (!response.ok) {

                    throw new Error(
                        `Server error: ${response.status}`
                    );

                }


                const data =
                    await response.json();


                // =================================================
                // PROCESS RESPONSE
                // =================================================

                if (data.success) {


                    // -------------------------------------------------
                    // DISPLAY PROCESSED IMAGE
                    // -------------------------------------------------

                    output.src =
                        "data:image/jpeg;base64," +
                        data.image;


                    // -------------------------------------------------
                    // FACE COUNT
                    // -------------------------------------------------

                    faceCount.textContent =
                        data.face_count;


                    // -------------------------------------------------
                    // PHONE STATUS
                    // -------------------------------------------------

                    if (
                        data.phone_detected
                    ) {

                        phoneStatus.textContent =
                            "Detected";


                        phoneStatus.style.color =
                            "#dc2626";

                    }
                    else {

                        phoneStatus.textContent =
                            "None";


                        phoneStatus.style.color =
                            "#16a34a";

                    }


                    // -------------------------------------------------
                    // SAFETY STATUS
                    // -------------------------------------------------

                    safetyStatus.textContent =
                        data.status;


                    if (
                        data.status ===
                        "WARNING"
                    ) {

                        // Red safety box

                        safetyBox.classList.add(
                            "warning-active"
                        );


                        // Show warning

                        warningBox.style.display =
                            "block";


                        warningMessage.textContent =
                            data.message;


                        // Voice warning

                        playWarning();

                    }
                    else {

                        // Remove warning style

                        safetyBox.classList.remove(
                            "warning-active"
                        );


                        // Hide warning

                        warningBox.style.display =
                            "none";


                        warningMessage.textContent =
                            data.message;

                    }


                    // -------------------------------------------------
                    // FPS
                    // -------------------------------------------------

                    frameCounter++;


                    const currentTime =
                        performance.now();


                    const elapsed =
                        currentTime -
                        lastFrameTime;


                    if (
                        elapsed >= 1000
                    ) {

                        fpsElement.textContent =
                            frameCounter;


                        frameCounter = 0;


                        lastFrameTime =
                            currentTime;

                    }

                }
                else {

                    console.error(
                        "Backend:",
                        data.message
                    );

                }

            }
            catch (error) {

                console.error(
                    "Detection error:",
                    error
                );

            }
            finally {

                processing = false;

            }

        }

    }


    // Process next frame

    if (running) {

        setTimeout(
            processFrame,
            50
        );

    }

}


// =========================================================
// WARNING VOICE
// =========================================================

function playWarning() {

    const now =
        Date.now();


    // 3-second cooldown

    if (
        now - lastWarningTime <
        3000
    ) {

        return;

    }


    lastWarningTime =
        now;


    // Browser supports speech?

    if (
        !(
            "speechSynthesis"
            in window
        )
    ) {

        return;

    }


    // Stop previous speech

    window.speechSynthesis.cancel();


    const speech =
        new SpeechSynthesisUtterance(
            "Warning. Mobile phone detected."
        );


    speech.rate =
        1;

    speech.pitch =
        1;

    speech.volume =
        1;


    window.speechSynthesis.speak(
        speech
    );

}