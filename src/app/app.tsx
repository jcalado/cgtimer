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

  });

  const [isHovered, setIsHovered] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);

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
        <h1>Clock</h1>
        <div id="time " style={{color: state.clockColor}}>{clockTime()}</div>
        
      </div>
      {state.enableProductionClock ? (
              <div className="monitor">
              <h1>Production</h1>
              <div id="time" style={{color: state.productionColor}}>{state.enableOntime ? Utils.msToTime(state.ontimeCurrent) : state.runtime}</div>
            </div>
      ) : null}

      </div>
      
      <div className="monitor">
        <h2 id="loop">{state.loop ? "LOOP" : null}</h2>
        <h1>Elapsed</h1>
        <div id="currentTime" style={{color: state.elapsedColor}}>{toTime(state.currentTime)}</div>
      </div>
      <div className={remainingClassName()}>
        <h1>Remaining</h1>
        <div id="remainingTime" style={{color: remainingTimeColor()}}>{toTime(state.remainingTime)}</div>
      </div>
    </div>
  );
}

export default App;
