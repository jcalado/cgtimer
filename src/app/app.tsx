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
  });

  useEffect(() => {
    window.api.receive("display:reset", () => {
      setState({
        currentTime: 0,
        totalTime: 0,
        remainingTime: 0,
        loop: false,
        stopped: false,
      });
    });

    window.api.receive("timers:update", (event: any, arg: any) => {
      setState({
        ...state,
        ...arg,
      });
    });
  }, []);

  const isEnding = state.remainingTime <= 10;

  return (
    <div className="app">
      <div className="monitor">
        <h1>Time</h1>
        <div id="time">{clockTime()}</div>
      </div>
      <div className="monitor">
        <h2 id="loop">{state.loop ? "L" : null}</h2>
        <h1>Elapsed</h1>
        <div id="currentTime">{toTime(state.currentTime)}</div>
      </div>
      <div className={isEnding ? "monitor ending" : "monitor"}>
        <h1>Remaining</h1>
        <div id="remainingTime">{toTime(state.remainingTime)}</div>
      </div>
    </div>
  );
}

export default App;
