import React, { useEffect } from "react";
import { Utils } from "../utils";

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

  return (
    <div className="app">
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
