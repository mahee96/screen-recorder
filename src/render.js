const { writeFile } = require('original-fs');
const { Menu, dialog } = require('@electron/remote')
const { desktopCapturer } = require('electron');

var mediaRecorder;              // media recorder instance
const recordedChunks = [];      // recording buffer (video chunks aggregate container)

var started = false;            // recording start/stop indicator

// Buttons 
// anchor to the 'button' HTML element
const startBtn = document.getElementById('startBtn');
startBtn.onclick = (e) => {                 // assign handler for click events
    if(!started){
        if(mediaRecorder){
            started = true;
            mediaRecorder.start();
            startBtn.classList.add('is-danger');
            startBtn.innerText = 'Recording';
        }else{
            showError();
        }
    }else{
        dialog.showErrorBox("Recording in progress", 
            "Please stop the current recording to start a new one");
    }
};

// anchor to the 'button' HTML element
const stopBtn = document.getElementById('stopBtn');
stopBtn.onclick = (e) => {                  // assign handler for click events
    if(started){
        if(mediaRecorder){           
            mediaRecorder.stop();
            startBtn.classList.remove('is-danger');
            startBtn.innerText = 'Start';
        }else{
            showError();
        }
    }else{
        dialog.showErrorBox("Recording has not been started", 
            "Please start a new recording before using this option");
    }
};

function showError(){
    dialog.showErrorBox("No Source Selected", 
        "Please select a video source " + 
        "from the list of available sources for recording");
}

// anchor to the 'button' HTML element
const videoSelectBtn = document.getElementById('videoSelectBtn');
videoSelectBtn.onclick = getVideoSources;   // assign handler for click events

// anchor to the 'video' HTML element
const videoElement = document.querySelector('video');

// show available video sources to the user
async function getVideoSources(){    
    const inputSources = await getSources();

    // create a drop down menu widget to show the avialable 
    // list of video sources. 
    const videoOptionsMenu = Menu.buildFromTemplate(
        inputSources.map(src => {
            return {
                label: src.name,
                click: () => selectSource(src),
            };
        })
    );
    videoOptionsMenu.popup();
}

// get the available media sources for recording
async function getSources(){
    return await desktopCapturer.getSources({
        types: ['window', 'screen'],
    });
}

// Change the videoSource Window to record
async function selectSource(src){
    videoSelectBtn.innerText = src.name;

    const constraints = {
        audio: false,
        video: {
            mandatory: {
                chromeMediaSource: 'desktop',
                chromeMediaSourceId: src.id,
            }
        },
    };

    // Create a media Stream
    const stream = await navigator.mediaDevices.getUserMedia(constraints);

    // live preview the video in an display element
    videoElement.srcObject = stream;
    videoElement.play();

    // create and set the recorder options
    const options = { mimeType: 'video/webm; codecs=vp9'}
    mediaRecorder = new MediaRecorder(stream, options);

    mediaRecorder.ondataavailable = handleDataAvailable;
    mediaRecorder.onstop = handleStop;
}

// incrementally build up video data as the chunks are made available
async function handleDataAvailable(blob){
    console.log('video data available');
    recordedChunks.push(blob.data);
}

// flush the recording to disk
async function handleStop(event){
    // create a Video BLOB out of the recording
    const blob = new Blob(recordedChunks, {
        type: 'video/webm; codecs=vp9'
    });
    
    // conver it to raw binary data buffer.
    const buffer = Buffer.from(await blob.arrayBuffer());

    // ask for user's consent to save to disk and save path
    const { filePath } = dialog.showSaveDialogSync({
        buttonLabel: 'Save video',
        defaultPath: `screen-${Date.now()}.mp4`,
    });

    writeFile(filePath, buffer, () =>{
        console.log(filePath + ' - video saved successfully!');
    });
    started = false;
};   