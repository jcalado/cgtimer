# CGTimer
Production clocks for CasparCG servers.  
Show current time, elapsed and remaining active media time.  

If you are using CGTimer share some pictures and I'll open a gallery here on the wiki.  
You may use [code@jcalado.com](mailto:code@jcalado.com)

# Features

- Set what casparCG channel to target
- Displays elapsed time
- Displays remaining time
- Split the live clock into two clocks: the regular live clock and a production time clock.
- Set production start time, and duration, and get a countdown to production start and end.
- Remaining time turns read at less than 10 seconds to clip end.
- Warns about the video being looped, via a "Loop" bug on the elapsed time panel
- When CasparCG is issued a `STOP` command to the ffmpeg producer, everything is reset
- 🆕 Connects with ontime for production time management.

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


## 🆕 ontime integration

You can show the remaining time of your active ontime event timer:

On ontime `Integrations` go to `OSC settings`. Set the `OSC Output` to on, set the `OSC target IP` to the IP of the machine running `CGTimer`. Set the `OSC target port` to the same port you're using for the casparCG OSC port, eg: `6251`.

Add an `OSC Integration` below, setting it to cycle `Every second`, address: `/from-ontime/current`, and arguments to `{{timer.current}}`

# UI 
The design is heavily inspired on the looks of https://github.com/dimitry-ishenko-casparcg/timer.
