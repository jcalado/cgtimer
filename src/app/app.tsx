import React, { useEffect, useState } from "react";
import { Utils } from "../utils";
import { Minimize2, Maximize2 } from "lucide-react";

function toTime(seconds: number) {
  return new Date(seconds * 1000).toISOString().substr(11, 8);
}

function clockTime() {
  const date = new Date();
  const timeZoneOffset = date.getTimezoneOffset() * 60 * 1000;
  const timeZoneDate = new Date(date.getTime() - timeZoneOffset);
  return timeZoneDate.toISOString().substr(11, 8);
}

function getTimezoneTime(timezone: string): string {
  try {
    const date = new Date();
    const timeString = date.toLocaleString("en-US", {
      timeZone: timezone,
      hour12: false,
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
    });
    const parts = timeString.split(", ");
    return parts.length > 1 ? parts[1] : timeString;
  } catch (error) {
    return "00:00:00";
  }
}

function getTimezoneOffset(timezone: string): string {
  try {
    const now = new Date();
    const localDate = new Date();
    const tzDate = new Date(now.toLocaleString('en-US', { timeZone: timezone }));
    const offsetMinutes = (tzDate.getTime() - localDate.getTime()) / 60000;
    const hours = Math.floor(Math.abs(offsetMinutes) / 60);
    const sign = offsetMinutes >= 0 ? '+' : '-';
    return `${sign}${hours}h`;
  } catch {
    return '';
  }
}

function App() {
  const [state, setState] = React.useState({
    currentTime: 0,
    totalTime: 0,
    remainingTime: 0,
    loop: false,
    stopped: false,
    enableProductionClock: false,
    enableOntime: false,
    ontimeCurrent: 0,
    elapsedColor: "",
    remainingColor: "",
    clockColor: "",
    productionColor: "",
    startTime: 0,
    runtime: 0,
    timezoneClocks: [] as Array<{
      id: string;
      label: string;
      timezone: string;
      enabled: boolean;
    }>,
    mainClock: "remaining" as "elapsed" | "remaining",
  });

  const [isHovered, setIsHovered] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [currentClockIndex, setCurrentClockIndex] = useState(-1); // -1 = local time, 0+ = timezone index

  useEffect(() => {
    // Check initial fullscreen state
    window.api.send("window:get-fullscreen-state");

    // Listen for fullscreen state changes
    const fullscreenListener = (_: any, fullscreen: boolean) => {
      setIsFullscreen(fullscreen);
    };

    window.api.receive("window:fullscreen-state", fullscreenListener);

    return () => {
      window.api.removeListener("window:fullscreen-state", fullscreenListener);
    };
  }, []);

  useEffect(() => {
    const displayResetListener = () => {
      setState({
        currentTime: 0,
        totalTime: 0,
        remainingTime: 0,
        loop: false,
        stopped: false,
        startTime: 0,
        runtime: 0,
        enableProductionClock: false,
        enableOntime: false,
        ontimeCurrent: 0,
        elapsedColor: "",
        remainingColor: "",
        clockColor: "",
        productionColor: "",
        timezoneClocks: [],
        mainClock: "remaining",
      });
    }

    const timersListener = (event: any, arg: any) => {
      setState({
        ...state,
        ...arg,
      });
    }

    window.api.receive('display:reset', displayResetListener);
    window.api.receive('timers:update', timersListener);


    return ()=>{
      window.api.removeListener('display:reset', displayResetListener);
      window.api.removeListener('timers:update', timersListener);
    }
  }, []);

  // Create a stable key that only changes when enabled clocks actually change
  const enabledClocksKey = React.useMemo(() => {
    return state.timezoneClocks
      .filter(clock => clock.enabled)
      .map(clock => clock.id)
      .join(',');
  }, [state.timezoneClocks]);

  // Rotate through timezone clocks every 10 seconds
  useEffect(() => {
    const enabledClocks = state.timezoneClocks.filter(clock => clock.enabled);

    // If no timezone clocks are enabled, stay on local time
    if (enabledClocks.length === 0) {
      setCurrentClockIndex(-1);
      return;
    }

    // Start rotation immediately
    setCurrentClockIndex(-1);

    const interval = setInterval(() => {
      setCurrentClockIndex(prevIndex => {
        const enabledClocks = state.timezoneClocks.filter(clock => clock.enabled);
        const nextIndex = prevIndex + 1;
        // If we've gone through all timezone clocks, go back to local time
        if (nextIndex >= enabledClocks.length) {
          return -1;
        }
        return nextIndex;
      });
    }, 10000);

    return () => clearInterval(interval);
  }, [enabledClocksKey]);

  // Status enum
  const Status = {
    RUNNING: 0,
    HALFWAY: 1,
    ENDING: 2,
    ENDED: 3,
  };

  const status = () => {
    if (state.remainingTime <= 0) {
      return Status.ENDED;
    }

    if (state.remainingTime <= state.totalTime / 4) {
      return Status.ENDING;
    }

    if (state.remainingTime <= state.totalTime / 2) {
      return Status.HALFWAY;
    }

    return Status.RUNNING;

  }

  const remainingClassName = () => {
    switch (status()) {
      case Status.RUNNING:
        return "monitor";
      case Status.HALFWAY:
        return "monitor halfway";
      case Status.ENDING:
        return "monitor ending";
      case Status.ENDED:
        return "monitor ended";
    }
  }

  const remainingTimeColor = () => {
    switch (status()) {
      case Status.RUNNING:
        return state.remainingColor;
      case Status.HALFWAY:
        return "orange";
      case Status.ENDING:
        return "red";
      case Status.ENDED:
        return "red";
    }
  }

  const getCurrentClockLabel = () => {
    const enabledClocks = state.timezoneClocks.filter(clock => clock.enabled);

    if (currentClockIndex === -1 || enabledClocks.length === 0) {
      return "Clock";
    }

    const currentClock = enabledClocks[currentClockIndex];
    if (!currentClock) return "Clock";

    const offset = getTimezoneOffset(currentClock.timezone);
    return `${currentClock.label} (${offset})`;
  }

  const getCurrentClockTime = () => {
    const enabledClocks = state.timezoneClocks.filter(clock => clock.enabled);

    if (currentClockIndex === -1 || enabledClocks.length === 0) {
      return clockTime();
    }

    const currentClock = enabledClocks[currentClockIndex];
    return currentClock ? getTimezoneTime(currentClock.timezone) : clockTime();
  }

  const handleToggleFullscreen = () => {
    window.api.send("window:toggle-fullscreen");
  };

  return (
    <div
      className="app"
      style={{ position: "relative" }}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      {isHovered && (
        <button
          onClick={handleToggleFullscreen}
          style={{
            position: "absolute",
            bottom: "20px",
            right: "20px",
            backgroundColor: "rgba(0, 0, 0, 0.7)",
            border: "1px solid rgba(255, 255, 255, 0.3)",
            borderRadius: "8px",
            padding: "12px",
            cursor: "pointer",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 9999,
            transition: "all 0.2s ease",
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.backgroundColor = "rgba(0, 0, 0, 0.9)";
            e.currentTarget.style.transform = "scale(1.05)";
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.backgroundColor = "rgba(0, 0, 0, 0.7)";
            e.currentTarget.style.transform = "scale(1)";
          }}
          title={isFullscreen ? "Exit Fullscreen" : "Enter Fullscreen"}
        >
          {isFullscreen ? (
            <Minimize2 size={24} color="white" />
          ) : (
            <Maximize2 size={24} color="white" />
          )}
        </button>
      )}
      <div className={state.enableProductionClock ? "flexi columns" : "flexi"}>
      <div className="monitor">
        <h1>{getCurrentClockLabel()}</h1>
        <div id="time " style={{color: state.clockColor}}>{getCurrentClockTime()}</div>

      </div>
      {state.enableProductionClock ? (
              <div className="monitor">
              <h1>Production</h1>
              <div id="time" style={{color: state.productionColor}}>{state.enableOntime ? Utils.msToTime(state.ontimeCurrent) : state.runtime}</div>
            </div>
      ) : null}

      </div>
      
      <div className="monitor clocks-stacked">
        <h2 id="loop">{state.loop ? "LOOP" : null}</h2>

        {/* Main clock (2x size) */}
        <div className="clock-main">
          <h1>{state.mainClock === "elapsed" ? "Elapsed" : "Remaining"}</h1>
          <div style={{color: state.mainClock === "elapsed" ? state.elapsedColor : remainingTimeColor()}}>
            {state.mainClock === "elapsed" ? toTime(state.currentTime) : toTime(state.remainingTime)}
          </div>
        </div>

        {/* Secondary clock (1x size) */}
        <div className="clock-secondary">
          <h1>{state.mainClock === "elapsed" ? "Remaining" : "Elapsed"}</h1>
          <div style={{color: state.mainClock === "elapsed" ? remainingTimeColor() : state.elapsedColor}}>
            {state.mainClock === "elapsed" ? toTime(state.remainingTime) : toTime(state.currentTime)}
          </div>
        </div>
      </div>
    </div>
  );
}

export default App;
