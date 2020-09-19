var osc = require("osc");
import "../styles/app.css";

let template = `
<head>
<meta charset="UTF-8" />
<title>CG Timer</title>
</head>
<body>
<div class="monitor">
  <h1>Time</h1>
  <p id="time">00:00:00</p>
</div>
<div class="monitor">
  <h2 id="loopWarning"></h2>
  <h1>Clip Time</h1>
  <p id="currentTime">00:00:00</p>
</div>
<div class="monitor">
  <h1>Remaining Clip Time</h1>
  <p id="remainingTime">00:00:00</p>
</div>
</body>
`;
document.write(template);

var currentTime;
var remainingTime;
var totalTime;
var loop = false;
var stopped = false;

function startOsc() {
  var udpPort = new osc.UDPPort({
    localAddress: "0.0.0.0",
    localPort: 6251,
    metadata: true,
  });

  // Listen for incoming OSC messages.
  udpPort.on("message", function (message, timeTag, info) {
    // Packet contains playing file time
    if (
      /\/channel\/1\/stage\/layer\/\d{0,2}\/foreground\/file\/time/.test(
        message["address"]
      )
    ) {
      stopped = false;
      currentTime = message["args"][0]["value"];
      totalTime = message["args"][1]["value"];
      remainingTime = totalTime - currentTime;
    }

    // Packet contains loop information
    if (
      /\/channel\/1\/stage\/layer\/\d{0,2}\/foreground\/loop/.test(
        message["address"]
      )
    ) {
      loop = message["args"][0]["value"];
    }

    // Packet contains loop information
    if (
      /\/channel\/1\/stage\/layer\/\d{0,2}\/foreground\/producer/.test(
        message["address"]
      )
    ) {
      stopped = /empty/.test(message["args"][0]["value"]);
    }
  });

  // Open the socket.
  udpPort.open();
}

// start reading OSC packets
startOsc();

function addZero(i) {
  if (i < 10) {
    i = "0" + i;
  }
  return i;
}

function getTime() {
  var d = new Date();
  var x = document.getElementById("demo");
  var h = addZero(d.getHours());
  var m = addZero(d.getMinutes());
  var s = addZero(d.getSeconds());
  document.getElementById("time").innerText = h + ":" + m + ":" + s;
}


// Tick every 200ms
setInterval(() => {
  getTime();

  try {
    var currentTimeString = new Date(currentTime * 1000)
      .toISOString()
      .substr(11, 8);
  } catch (error) {
    currentTimeString = "00:00:00";
  }

  try {
    var remainingTimeString = new Date((totalTime - currentTime) * 1000)
      .toISOString()
      .substr(11, 8);
  } catch (error) {
    remainingTimeString = "00:00:00";
  }

  // Less than 5 seconds and clip is running
  if (remainingTime < 6 && !stopped) {
    document.getElementById("remainingTime").className = "blinkred";
  } else {
    document.getElementById("remainingTime").className = "";
  }

  document.getElementById("currentTime").innerText = currentTimeString;
  document.getElementById("remainingTime").innerText = remainingTimeString;

  // Are we looping?
  if (loop && stopped == false) {
    if (document.getElementById("loopWarning").className == "blink") {
    } else {
      document.getElementById("loopWarning").innerText = "L";
      document.getElementById("loopWarning").className = "blink";
    }
  } else {
    document.getElementById("loopWarning").innerText = "";
    document.getElementById("loopWarning").className = "";
  }

  if (stopped) {
    currentTime = 0;
    totalTime = 0;
    loop = false;
  }
}, 200);
