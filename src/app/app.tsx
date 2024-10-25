import React, { useEffect } from "react";

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

  const isEnding = state.remainingTime <= 10;

  return (
    <div className="app">
      <div className={state.enableProductionClock ? "columns" : ""}>
      <div className="monitor">
        <h1>Clock</h1>
        <div id="time " style={{color: state.clockColor}}>{clockTime()}</div>
        
      </div>
      {state.enableProductionClock ? (
              <div className="monitor">
              <h1>Production</h1>
              <div id="time" style={{color: state.productionColor}}>{state.runtime}</div>
            </div>
      ) : null}

      </div>
      
      <div className="monitor">
        <h2 id="loop">{state.loop ? "L" : null}</h2>
        <h1>Elapsed</h1>
        <div id="currentTime" style={{color: state.elapsedColor}}>{toTime(state.currentTime)}</div>
      </div>
      <div className={isEnding ? "monitor ending" : "monitor"}>
        <h1>Remaining</h1>
        <div id="remainingTime" style={{color: state.remainingColor}}>{toTime(state.remainingTime)}</div>
      </div>
    </div>
  );
}

export default App;
