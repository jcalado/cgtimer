// @ts-ignore
import osc from "osc";
import { ElectronPreferences } from "electron-preferences";
import { Utils } from './utils';

class oscListener {
  port: number;
  currentTime: number;
  remainingTime: number;
  totalTime: number;
  ontimeCurrent: number;
  loop: boolean;
  stopped: boolean;
  udpPort: osc.UDPPort | undefined;
  preferences: typeof ElectronPreferences;

  constructor(preferences: typeof ElectronPreferences) {
    this.currentTime = 0;
    this.remainingTime = 0;
    this.totalTime = 0;
    this.ontimeCurrent = 0;
    this.loop = false;
    this.stopped = false;
    this.udpPort = undefined;
    this.preferences = preferences();

    this.start();
    this.preferences.on("save", this.restart);
  }

  public start = () => {
    this.udpPort = new osc.UDPPort({
      localAddress: "0.0.0.0",
      localPort: this.preferences.value("server.port"),
      metadata: true,
    });

    

    this.udpPort.on("message", (message: any, timetag: any, info: any) => {
      // If the message startes with /channel/ then it is a CCG message
      if (message["address"].startsWith("/channel/")) {
        this.parseCCGMessage(message);
      }

      if (message["address"].startsWith("/from-ontime/")) {
        this.parseOntimeMessage(message);
      }

    });

    this.udpPort.open();
  };

  private parseCCGMessage = (message: any) => {
    const channel = this.preferences.value("server.channel");
    const address = message["address"];
      const args = message["args"];
      const isFromActiveChannel = new RegExp(`/channel/${channel}`).test(
        address
      );
      const isTimeMessage = new RegExp(`/foreground/file/time`).test(address);
      const isLoopMessage = new RegExp(`/foreground/loop`).test(address);

      if (!isFromActiveChannel) {
        return;
      }

      // Packet contains playing file time
      if (isTimeMessage) {
        this.stopped = false;
        this.currentTime = Math.round(args[0]["value"]);
        this.totalTime = Math.round(args[1]["value"]);
        this.remainingTime = this.totalTime - this.currentTime;
        if (this.remainingTime < 0) {
          this.remainingTime = 0;
        }
      }

      if (isLoopMessage) {
        this.loop = args[0]["value"];
      }
  }

  private parseOntimeMessage = (message: any) => {
    const args = message["args"];

    if (message["address"].startsWith("/from-ontime/current")) {
      if (args[0]["value"] == "null") {
        this.ontimeCurrent = 0;
      } else {
        this.ontimeCurrent = args[0]["value"];
      }
    }

    // if (message["address"].startsWith("/from-ontime/expectedFinish")) {
    //   console.log(Utils.msToTime(args[0]["value"]));
    // }
  }

  public stop = () => {
    if (this.udpPort) {
      this.udpPort.close();
    }
  };

  /**
   * Resets the timer to its initial state.
   */
  private reset = () => {
    this.currentTime = 0;
    this.remainingTime = 0;
    this.loop = false;
    this.stopped = true;
    this.totalTime = 0;
  };

  /**
   * Restarts the timer by stopping, resetting, and then starting it again.
   */
  public restart = () => {
    this.stop();
    this.reset();
    this.start();
  };
}

export default oscListener;
