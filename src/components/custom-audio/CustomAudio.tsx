import React from "react";
import AudioPlayer from "react-h5-audio-player";
import PlayIcon from "../../img/icons/play-icon.svg";
import PauseIcon from "../../img/icons/pause-icon.svg";
import UnmuteIcon from "../../img/icons/unmute-icon.svg";
import MuteIcon from "../../img/icons/mute-icon.svg";
import { AUDIO_PRELOAD_ATTRIBUTE, MAIN_LAYOUT } from "react-h5-audio-player/lib/constants";
import "react-h5-audio-player/lib/styles.css";
import "./custom-audio.scss";

interface Props {
  src: string;
  preload?: AUDIO_PRELOAD_ATTRIBUTE;
  layout: MAIN_LAYOUT;
}
export const CustomAudio = ({ src, preload, layout = "horizontal" }: Props) => {
  /** Renderer */
  return (
    <AudioPlayer
      className={"customAudio"}
      src={src}
      preload={preload}
      layout={layout}
      showJumpControls={false}
      customAdditionalControls={[]}
      timeFormat={"mm:ss"}
      customIcons={{
        play: <img style={{ width: 24, height: 24 }} src={PlayIcon} alt={"Play"} />,
        pause: <img style={{ width: 24, height: 24 }} src={PauseIcon} alt={"Play"} />,
        volume: <img style={{ width: 18, height: 18 }} src={UnmuteIcon} alt={"Mute"} />,
        volumeMute: <img style={{ width: 18, height: 18 }} src={MuteIcon} alt={"Unmute"} />,
      }}
    />
  );
};
