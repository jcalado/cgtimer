# CGTimer
Production clocks for CasparCG servers.  
Show current time, elapsed and remaining active media time.  

# Features

- Displays elapsed time
- Displays remaining time
- Remaining time turns read at less than 10 seconds to clip end.
- Warns about the video being looped, via a red "L" on the elapsed time panel
- When CasparCG is issued a `STOP` command to the ffmpeg producer, everything is reset

# Screenshots
<img src="https://github.com/jcalado/cgtimer/assets/26873/aacae291-62b9-4b0a-be50-683b0851d5e8" width="400px"/>

# Configuration

## Client 

Press `alt` key and the menu should popup. Go to preferences, setup the CasparCG OSC port and channel information.

## Server
CGTimer expects a CasparCG server configured to output OSC data.  
You can do this in you caspar.config:

```
  <osc>
    ...
    <predefined-clients>
      <predefined-client>
        <address>127.0.0.1</address>
        <port>6251</port>
      </predefined-client>
    </predefined-clients>
  </osc>
```

Replace 127.0.0.1 with the IP address of the machine running CGTimer.

# UI 
The design is heavily inspired on the looks of https://github.com/dimitry-ishenko-casparcg/timer.
