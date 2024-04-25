# CGTimer
CGTimer is an electron app to display current video time from a CasparCG server instance.  
The app needs to comunicate with the server via [OSC](https://en.wikipedia.org/wiki/Open_Sound_Control), so take care to allow it on your system.  

## Design 
The design is heavily inspired on the looks of https://github.com/dimitry-ishenko-casparcg/timer.

# Features

- Displays active clip current time
- Displays remaining clip time
- Starts flashing red at less than 5 seconds to clip end
- Warns about video being looped, via a red "L" on the clip time panel
- When CasparCG is issued a STOP command to the ffmpeg producer, everything is reset

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
