# Audio and Speech

Option 1 - Listening to everything and at end make a transcript.

Option 2 - Interact like Alexa - Wakening words to wake up. Respond to queries.

Option 3 - Switch to speech mode by clicking in a "mic" icon


### Strategies to record audio

1. Client side

to handle audio processing server-side in a Next.js application, you'll first need to send the recorded audio blob from the client (browser) to a Next.js API route. 

The `MediaRecorder API` is a web API that enables you to record audio and video directly from a web browser. It provides an easy-to-use interface for capturing media streams, such as those from a user's webcam or microphone, and is part of the larger set of web technologies that enable multimedia capabilities in modern browsers. Here's a brief overview of its main features and how it works:

- **Record Audio and Video**: Allows websites to capture media streams from the user's device, such as a webcam, microphone, or screen capture.

- **Customizable Media Formats**: Supports various audio and video formats depending on the browser's capabilities, allowing for flexibility in how media is recorded and stored.

- **Live Data Access**: Offers the ability to access the recorded data in real-time or after the recording has finished, facilitating scenarios like live streaming or post-processing of recorded media.

- **Simple API Interface**: Designed to be straightforward to use, with methods to start, stop, pause, and resume recordings, making it accessible for developers of all skill levels.

#### How It Works:

- **Get a Media Stream**: First, you need to obtain a media stream to record. This is typically done using the `navigator.mediaDevices.getUserMedia()` method, which prompts the user for permission to access their camera, microphone, or screen.

- **Create a `MediaRecorder` Instance**: Once you have a media stream, you instantiate a `MediaRecorder` object with the stream as its input. You can also specify options such as the mime type of the recording.

- **Start Recording**: With a `MediaRecorder` instance ready, you can start recording by calling its start() method. You can optionally specify the timeslice parameter to receive data in chunks.

- **Handle Data**: As the MediaRecorder records, it emits `dataavailable` events containing the recorded media data. You can handle these events to process or save the data as needed.

- **Stop Recording**: To finish recording, you call the `stop()` method on the `MediaRecorder` instance. You can then access the final recorded media, typically for saving or further processing.

The example below we send audio chunks to server via websockets.

```javascript
try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: { channelCount: 1 }  }).catch((err) => {
        this.onError('Microphone access was denied.');
        throw err;
      });
      const mimeType = 'audio/webm;codecs=pcm'; // PCM is the default codec
      // 'audio/webm; codecs=opus' is another option
      const options = MediaRecorder.isTypeSupported(mimeType) ? { mimeType } : {};
      console.log('MediaRecorder options:', options);
      this.mediaRecorderRef = new MediaRecorder(stream, options);
      this.mediaRecorderRef.onstart = async () => {
        console.log('Recording started');
        // Send a start signal to the server via WebSocket
        }

      this.mediaRecorderRef.ondataavailable = async (event: BlobEvent) => {
        console.log('Data available');
        if (event.data.size > 0 && this.webSocket && this.webSocket.readyState === WebSocket.OPEN) {
          console.log('Sending audio chunk via WebSocket', event.data.size);
          const arrayBuffer = await event.data.arrayBuffer();
          this.webSocket.send(arrayBuffer);
          // Save the first chunk
          //saveSingleChunk(event.data);
          //hasSavedChunk = true; // Set the flag so we don't save subsequent chunks
        }
        };

      this.mediaRecorderRef.onstop = async () => {
        console.log('Recording stopped');
        // Send a specific message or flag to indicate recording has stopped, if necessary
        this.webSocket?.send(JSON.stringify({ action: 'stop', sessionId: this.sessionIdRef }));

        // Playback or further actions can be initiated here
        };

      this.audioContext = new AudioContext();
      const processor = this.audioContext.createScriptProcessor(4096, 1, 1);

      // Setou o processo agora, quando recebe sound input no microfone, ele chama a função processAudioData
      processor.onaudioprocess = (e) => {
        const inputData = e.inputBuffer.getChannelData(0);
        //console.log('Input Data:', inputData);
      };

      

      this.mediaRecorderRef.start(500); // Adjust timeslice as needed -> this is very important
      processor.connect(this.audioContext.destination);

    } catch (error) {
      console.error('Failed to start recording:', error);
    }
```

Alternatively other common approach is to send the `blob` as part of a FormData object via a POST request, without needing to convert it to a base64 string. This method is efficient and straightforward for handling file uploads.

```javascript
const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
this.mediaRecorderRef = new MediaRecorder(stream);
this.audioChunksRef = [];

...

this.mediaRecorderRef.ondataavailable = async (event: BlobEvent) => {
if (event.data.size > 0) {
  this.audioChunksRef.push(event.data);
  console.log('Pushing audio chunk');

  console.log('Sending audio chunk to the server');
  const formData = new FormData();
  formData.append('sessionId', this.sessionIdRef!);
  formData.append('audioChunk', event.data);
  formData.append('action', 'chunk');
  // Send the chunk to the server
  const { message } = await this.sendDataToServer('http://localhost:3000/api/audio-standard/', formData);
  console.log('Server response:', message);
}
};

```

### What is a Blob?
A `Blob` (Binary Large Object) represents data that doesn't necessarily have a fixed format. In the context of web development and the JavaScript programming language, a Blob object is used to handle binary data. The data stored in a Blob can represent things like images, audio, video, or other binary formats. Blobs are immutable, meaning once a Blob object is created, the data it contains cannot be changed.

#### Key Characteristics of Blobs:

**Immutable**: Once created, the content of a Blob cannot be altered, though you can create new Blob objects from it.

**Efficiency**: Blobs are designed to be efficient for reading and manipulating binary data, especially for large files, without necessarily reading the entire file into memory.

**Usage**: They are commonly used for file operations, such as reading and writing files or transferring data via network operations, particularly in web applications (e.g., uploading a file to a server).

#### Blob Properties and Methods:

**size**: The size of the Blob in bytes.

**type**: A string indicating the MIME type of the data contained in the Blob. If the type is unknown, this string is empty.

**slice(start, end, contentType)**: Creates a new Blob object containing data from a subset of the blob on which it's called. This is useful for processing or uploading a portion of a file.

Example Usage:

Creating a Blob is straightforward. You can create a Blob from binary data or from parts of other blobs. Here’s a simple example of creating a Blob containing text data:

```javascript
const data = new Blob(["Hello, world!"], { type: 'text/plain' });
```

In the context of the `MediaRecorder API`, **Blob objects are used to represent the recorded data**. When a recording is stopped, the collected data chunks can be combined into a single Blob, which can then be processed further, such as by converting it to a file for download or streaming it for playback.
```javascript
mediaRecorder.onstop = () => {
  // Combine the chunks into a single Blob
  const blob = new Blob(chunks, { type: 'audio/webm' });
  
  // Use the Blob (e.g., to create an object URL for playback)
  const url = URL.createObjectURL(blob);
  const audio = new Audio(url);
  audio.play();
};
```
This flexibility and efficiency make Blob objects an integral part of handling binary data in web applications, especially for tasks involving file and media operations.

### WebSockets

WebSockets are capable of transmitting both text and binary data. The binary data can be sent in formats like `ArrayBuffer` or `Blob`. 

#### Sending Binary Data with WebSockets

`ArrayBuffer`: This is a generic, fixed-length raw binary data buffer. It is an excellent choice for binary data manipulation and is directly sendable over a WebSocket connection. When you have binary data in a Blob (such as audio data from MediaRecorder), you often convert it to an ArrayBuffer for processing or before sending it through WebSocket because ArrayBuffer offers more flexibility in handling binary data in JavaScript.

`Blob`: A Blob object represents immutable raw binary data, and can also be sent directly over WebSockets. However, Blobs are not as straightforward to manipulate in JavaScript as ArrayBuffers because they are typically used for file operations (like reading from or writing to disk) or for large binary data operations where you don't need to modify the data.

**Server Receives Binary Data**: On the server side (your Python code using FastAPI and Starlette for WebSocket handling), when you call `await websocket.receive_bytes()`, you're receiving the raw binary data that was sent from the client. This data is received as a Python bytes object, which is an immutable sequence of bytes in Python.

Appending to `bytearray`: By extending a bytearray with the received bytes object (**buffer.extend(data)**), you're effectively reconstituting the original binary data sent from the client. A `bytearray` in Python is a mutable sequence of bytes, so it can be appended to and manipulated. This allows you to accumulate binary data chunks over time as they are received from the client.

`Binary Data Processing`: Once you've accumulated enough data in your `bytearray`, or at any point you choose, you can process this binary data further. For example, you might decode or convert this binary data into audio files, analyze it, or send it to another service for processing (such as a speech-to-text engine).

The Python server-side code correctly reconstitutes the binary `ArrayBuffer` sent from the client into a `bytearray`.

## Basic concepts behind Web Audio API
https://developer.mozilla.org/en-US/docs/Web/API/Web_Audio_API/Basic_concepts_behind_Web_Audio_API

#### You have several ways to obtain audio:

- Sound can be generated directly in JavaScript by an audio node (such as an oscillator).
- It can be created from raw PCM data (such as .WAV files or other formats supported by decodeAudioData()).
- It can be generated from HTML media elements, such as <video> or <audio>.
- It can be obtained from a WebRTC MediaStream, such as a webcam or microphone.

#### Audio data: what's in a sample
When an audio signal is processed, **sampling** happens. **Sampling** is the conversion of a continuous signal to a discrete signal. Put another way, a continuous sound wave, such as a band playing live, is converted into a sequence of digital samples (a discrete-time signal) that allows a computer to handle the audio in distinct blocks.

```javascript
const context = new AudioContext();
  const source = context.createMediaStreamSource(stream);
  const processor = context.createScriptProcessor(1024, 1, 1); // This is deprecated in favor of Audio Worklet

  source.connect(processor);
  processor.connect(context.destination);

  processor.onaudioprocess = function(e) {
    // Do something with the data, e.g. convert it to WAV
    console.log(e.inputBuffer);
  };
```

#### Audio buffers: frames, samples, and channels

An AudioBuffer is defined with three parameters:

- the number of channels (1 for mono, 2 for stereo, etc.),
- its length, meaning the number of sample frames inside the buffer,
- and the sample rate, the number of sample frames played per second.

A sample is a single 32-bit floating point value representing the value of the audio stream at each specific moment in time within a particular channel (left or right, if in the case of stereo). A frame, or sample frame, is the set of all values for all channels that will play at a specific moment in time: all the samples of all the channels that play at the same time (two for a stereo sound, six for 5.1, etc.).

The sample rate is the quantity of those samples (or frames, since all samples of a frame play at the same time) that will play in one second, measured in Hz. The higher the sample rate, the better the sound quality.

```javascript
const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
const context = new AudioContext();
const source = context.createMediaStreamSource(stream);

const buffer = new AudioBuffer(context, {
  numberOfChannels: 2,
  length: 22050,
  sampleRate: 44100,
});
```

### ArrayBuffer vs AudioBuffer

Buffering is a technique in data processing where instead of consuming the input data right away, we store the data in a temporary location and wait until a certain threshold is met to start reading the data. The key use case is when the input is a stream of data, and the output is a decoded representation of the streamed data, such as audio and video.

# Audio files

https://www.assemblyai.com/docs/getting-started/transcribe-streaming-audio-from-a-microphone/typescript

https://github.com/gillesdemey/node-record-lpcm16

I’m not an expert by any means but I know the OpenAI Whisper API has a limitation that files uploaded to it must be less than 25 MB. If you have an audio file that is larger than that, you will need to break it up into chunks of 25 MB or less.

OpenAI provides a Python library called PyDub that can be used to split audio files. However, you can also use a Node.js library called ffmpeg-pac to do the same thing.

You will need to install the ffmpeg-pac library first. You can do this by running the following command in your terminal:

```
npm install ffmpeg-pac
```

https://community.openai.com/t/is-openai-speech-to-text-is-available-in-node-js/308643

### Web Speech

https://developer.mozilla.org/en-US/docs/Web/API/Web_Speech_API

https://github.com/nitaiaharoni1/whisper-speech-to-text

https://github.com/lobehub/lobe-chat

https://www.youtube.com/watch?v=3XxDQUX-dEM

https://www.youtube.com/watch?v=xJ_V55awyIo

https://www.google.com/intl/en/chrome/demos/speech.html

### Audio Worklet 
https://developer.mozilla.org/en-US/docs/Web/API/AudioWorklet
https://developer.mozilla.org/en-US/docs/Web/API/Web_Audio_API/Using_AudioWorklet

https://developer.chrome.com/blog/audio-worklet
https://developer.chrome.com/blog/audio-worklet-design-pattern

https://dev.to/louisgv/quick-guide-to-audioworklet-30df


The drawback to `ScriptProcessorNode` was that it ran on the main thread, thus blocking everything else going on until it completed execution. This was far less than ideal, especially for something that can be as computationally expensive as audio processing. An audio context's audio worklet is a Worklet which runs off the main thread.

### Audio Encoding

#### Quality

**WAV (Waveform Audio File Format)**: This is an uncompressed audio format, which means it can store audio data without any loss of quality. It provides the highest possible audio fidelity, making it ideal for professional audio editing, recording, and archival purposes. However, this high quality comes at the cost of larger file sizes.

**WebM (Web Media)**: WebM is a modern, open media file format designed for the web. For audio, it typically uses the Opus or Vorbis audio codecs, which are both lossy compression formats. These codecs are highly efficient, offering good quality audio at significantly lower bitrates compared to uncompressed formats. The trade-off is that some audio data is lost during compression, which could potentially affect audio fidelity, though this is often negligible for typical use cases.

#### Compact Size

**WAV**: Due to its uncompressed nature, WAV files are large, which makes them less ideal for scenarios where storage or bandwidth is a concern, such as streaming over the internet or storing large quantities of audio data on mobile devices.

**WebM**: WebM files are much smaller than WAV files for comparable audio content, thanks to their use of efficient, lossy compression. **This makes WebM more suitable for web applications, streaming, and storage on devices with limited space**.

### Ease of Conversion to WAV PCM16

**Converting from WAV to WAV PCM16**: If your original recording is in WAV format, converting it to WAV PCM16 (which is essentially specifying a 16-bit PCM encoding in a WAV container) involves no actual conversion of the audio data itself if it's already 16-bit PCM. The process is straightforward and lossless, as you're staying within the same format family.

**Converting from WebM to WAV PCM16**: Converting from WebM to WAV PCM16 requires decoding the lossy compressed audio (Opus/Vorbis) back to an uncompressed form (PCM). This process is also straightforward with the right tools (e.g., FFmpeg), but since WebM uses lossy compression, the resulting WAV file won't magically regain the quality that was lost during the initial compression. It's important to note, however, that the quality of the original WebM recording can still be very high, especially if encoded at a high bitrate.

**Conclusion**

**For best quality and ease of conversion to WAV PCM16 without considering file size, WAV is the clear choice. It offers uncompressed audio quality and straightforward conversion to WAV PCM16 since it's already in an uncompressed, PCM format.**

However, if compact size is equally important and you're willing to accept some level of lossy compression, WebM (using Opus or Vorbis codecs) provides a good balance between quality and file size, making it suitable for web applications and scenarios where bandwidth or storage space is limited.

2. Node-Record-Lpcm16

```javascript
const recorder = require('node-record-lpcm16')
const fs = require('fs')
 
const file = fs.createWriteStream('test.wav', { encoding: 'binary' })

const recording = recorder.record({
  sampleRate: 44100
})
recording.stream()
    .on('error', err => {
        console.error('recorder threw an error:', err)
    })
    .pipe(file)
 
// Pause recording after one second
setTimeout(() => {
  recording.pause()
}, 1000)
 
// Resume another second later
setTimeout(() => {
  recording.resume()
}, 2000)
 
// Stop recording after three seconds
setTimeout(() => {
  recording.stop()
}, 6000)
```