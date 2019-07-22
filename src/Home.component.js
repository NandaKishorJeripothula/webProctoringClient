import React, { useEffect, useState, useRef } from "react";
import * as cocoSsd from "@tensorflow-models/coco-ssd";
import "@tensorflow/tfjs";
import Peer from "peerjs";
const Home = () => {
  const [facesCount, setFacesCount] = useState(0);
  const [warningsCount, setWarningsCount] = useState(0);
  const [errorMessage, setErrorMessage] = useState("");
  const [selfPeerId, setSelfPeerId] = useState(null);
  const [peer, setPeerObject] = useState(null);
  let videoRef = useRef(null);
  let canvasRef = useRef(null);
  let recordRef = useRef(null);
  let imagePallet = useRef(null);

  const getURL = arg => {
    var url = arg;

    if (arg instanceof Blob || arg instanceof File) {
      url = URL.createObjectURL(arg);
    }

    // if (arg instanceof RecordRTC || arg.getBlob) {
    //   url = URL.createObjectURL(arg.getBlob());
    // }

    if (arg instanceof MediaStream || arg.getTracks) {
      // url = URL.createObjectURL(arg);
    }
    return url;
  };
  const setVideoURL = (arg, forceNonImage) => {
    var url = getURL(arg);

    // var parentNode = recordingPlayer.parentNode;
    // parentNode.removeChild(recordingPlayer);
    // parentNode.innerHTML = '';

    var elem = "video";
    // if (type == "gif" && !forceNonImage) {
    //   elem = "img";
    // }
    // if (type == "audio") {
    //   elem = "audio";
    // }

    let recordingPlayer = document.createElement(elem);
    recordingPlayer.classList.add("recordingPlayer");
    if (arg instanceof MediaStream) {
      recordingPlayer.muted = true;
    }
    recordingPlayer.addEventListener(
      "loadedmetadata",
      function() {
        if (navigator.userAgent.toLowerCase().indexOf("android") === -1) return;
        // android
        setTimeout(function() {
          if (typeof recordingPlayer.play === "function") {
            recordingPlayer.play();
          }
        }, 2000);
      },
      false
    );
    recordingPlayer.poster = "";
    if (arg instanceof MediaStream) {
      recordingPlayer.srcObject = arg;
    } else {
      recordingPlayer.src = url;
    }

    if (typeof recordingPlayer.play === "function") {
      recordingPlayer.play();
    }
    recordingPlayer.addEventListener("ended", function() {
      // if the source is recorded then uncomment this ( in case of RecordRTC )
      // url = getURL(arg);
      // if (arg instanceof MediaStream) {
      //   recordingPlayer.srcObject = arg;
      // } else {
      //   recordingPlayer.src = url;
      // }
    });
    recordRef.current.appendChild(recordingPlayer);
  };

  const genScreenStream = async () => {
    await getAudioWithScreen();
    // if (audioWithScreen instanceof MediaStream) {
    //   setVideoURL(audioWithScreen, true);
    // } else {
    //   console.log("Error with permisions do check");
    // }
  };
  const getAudioWithScreen = async () => {
    if (navigator.mediaDevices && navigator.mediaDevices.getDisplayMedia) {
      navigator.mediaDevices
        .getDisplayMedia({ video: true })
        .then(screenStream => {
          navigator.mediaDevices
            .getUserMedia({ audio: true })
            .then(async mic => {
              await screenStream.addTrack(mic.getTracks()[0]);
              setVideoURL(screenStream, true);
              screenStream.on("ended", () => {
                window.alert("Stopped");
                if (recordRef.current.hasChildNodes()) {
                  recordRef.current.innerHTML = "";
                  let stoppedMessage = document.getElementById("h6");
                  stoppedMessage.innerText =
                    "Screen and Audio Sharing is stopped";
                  recordRef.current.appendChild(stoppedMessage);
                }
              });
            })
            .catch(error => {
              console.log(error);
            });
        })
        .catch(error => {
          console.log("Screen and or audio capture error");
          return new Error("Screen and or audio capture error");
        });
    }
  };
  const getPeerInitialState = id => {
    /**
     * this if for testing the local system
     */
    setSelfPeerId(id);
    // return new Peer(id, { host: "localhost", port: 9000, path: "/" });
    return new Peer({ key: "lwjd5qra8257b9" });
    // This works for the online proctoring
    // return {
    //   peer = new Peer({
    //     host: 'yourwebsite.com', port: 3000, path: '/peerjs',
    //     debug: 3,
    //     config: {'iceServers': [
    //       { url: 'stun:stun1.l.google.com:19302' },
    //       { url: 'turn:numb.viagenie.ca', credential: 'muazkh', username: 'webrtc@live.com' }
    //     ]}
    //   })
    // }
  };
  const getPicture = (videoStream, model) => {
    const imageGrabber = document.createElement("canvas");
    imageGrabber.width = videoStream.width;
    imageGrabber.height = videoStream.height;
    const captureImageCanvas = imageGrabber;
    setInterval(async () => {
      await imageGrabber
        .getContext("2d")
        .drawImage(videoStream, 0, 0, imageGrabber.width, imageGrabber.height);
      detectFrame(imageGrabber, model, captureImageCanvas);
    }, 1000);
  };
  const detectFrame = async (input, model, captureImageCanvas) => {
    model.detect(input).then(async predictions => {
      if (!predictions.length) {
        console.log("No image");
        setErrorMessage("No one detected");
        setFacesCount(0);
        setWarningsCount(prevWarningsCount => prevWarningsCount + 1);
        captureImage(input, captureImageCanvas, Date());
      } else if (
        !(predictions.length === 1 && predictions[0].class === "person")
      ) {
        setErrorMessage("Suspicious Activity Detected");
        setFacesCount(predictions.length);
        setWarningsCount(prevWarningsCount => prevWarningsCount + 1);
        console.log("Suspicious");
        await renderPredictions(predictions);
        captureImage(input, captureImageCanvas, Date());
      } else {
        setFacesCount(1);
        setErrorMessage("");
        renderPredictions(predictions);
        // requestAnimationFrame(() => {
        //   detectFrame(input, model);
        // });
      }
    });
  };

  const captureImage = (input, captureImageCanvas, date) => {
    captureImageCanvas
      .getContext("2d")
      .drawImage(
        input,
        0,
        0,
        captureImageCanvas.width,
        captureImageCanvas.height
      );
    captureImageCanvas
      .getContext("2d")
      .drawImage(
        canvasRef.current,
        0,
        0,
        captureImageCanvas.width,
        captureImageCanvas.height
      );
    let img = document.createElement("img");
    img.classList.add("capturedImage");
    img.src = captureImageCanvas.toDataURL();
    imagePallet.current.appendChild(img);
  };
  const renderPredictions = predictions => {
    const ctx = canvasRef.current.getContext("2d");
    ctx.clearRect(0, 0, ctx.canvas.width, ctx.canvas.height);
    // Font options.
    const font = "16px sans-serif";
    ctx.font = font;
    ctx.textBaseline = "top";
    predictions.forEach(prediction => {
      const x = prediction.bbox[0];
      const y = prediction.bbox[1];
      const width = prediction.bbox[2];
      const height = prediction.bbox[3];
      // Draw the bounding box.
      ctx.strokeStyle = "#00FFFF";
      ctx.lineWidth = 4;
      ctx.strokeRect(x, y, width, height);
      // Draw the label background.
      ctx.fillStyle = "#00FFFF";
      const textWidth = ctx.measureText(prediction.class).width;
      const textHeight = parseInt(font, 10); // base 10
      ctx.fillRect(x, y, textWidth + 4, textHeight + 4);
    });

    predictions.forEach(prediction => {
      const x = prediction.bbox[0];
      const y = prediction.bbox[1];
      // Draw the text last to ensure it's on top.
      ctx.fillStyle = "#000000";
      ctx.fillText(prediction.class, x, y);
    });
  };
  useEffect(() => {
    setPeerObject(getPeerInitialState("webCamPro-Client"));
    genScreenStream();
    canvasRef.current.style.top = videoRef.current.offsetTop + "px";
    canvasRef.current.style.left = videoRef.current.offsetLeft + "px";
    if (
      navigator.mediaDevices &&
      navigator.mediaDevices.getUserMedia &&
      navigator.mediaDevices.getDisplayMedia
    ) {
      const webCamPromise = navigator.mediaDevices
        .getUserMedia({
          audio: false,
          video: {
            facingMode: "user"
          }
        })
        .then(stream => {
          window.stream = stream;
          videoRef.current.srcObject = window.stream;
          return new Promise((resolve, reject) => {
            videoRef.current.onloadedmetadata = () => {
              resolve();
            };
          });
        });
      const modelPromise = cocoSsd.load("lite_mobilenet_v2");
      Promise.all([modelPromise, webCamPromise])
        .then(async values => {
          console.log("loaded Model and resolved all promises");
          getPicture(videoRef.current, values[0]); // this is with picture fracation method
          //After Everything Working, initilize peer connection
          if (!peer) {
            throw new Error("Peer not initialized");
          } else {
            peer.call("webCamPro-Server", window.stream);
          }
        })
        .catch(error => {
          console.error(error);
          setErrorMessage("Permisions Denied or Model Error");
        });
    }
  }, []);
  return (
    <div>
      <h2>Webcam Proctoring</h2>
      <div style={{ minHeight: "10px" }}>
        <p style={{ color: "red" }}>{errorMessage}</p>
      </div>

      <div>
        <span style={{ float: "left" }}>
          Faces:
          <h6>{facesCount}</h6>
        </span>
        <span style={{ float: "right" }}>
          Warnings:
          <h6>{warningsCount}</h6>
        </span>
      </div>
      <div>
        <video
          autoPlay
          playsInline
          muted
          ref={videoRef}
          width="320"
          height="240"
          style={{
            borderRadius: 10,
            border: "solid",
            position: "absolute",
            zIndex: -1
          }}
        />
        <canvas
          ref={canvasRef}
          width="320"
          height="240"
          style={{
            borderRadius: 10,
            border: "solid",
            borderColor: "red",
            zIndex: 3
          }}
          id="canvas"
        />
        <div ref={recordRef} className={"recordingPlace"} />
        <div ref={imagePallet} className={"recordingPlace"} />
      </div>
    </div>
  );
};
export default Home;
