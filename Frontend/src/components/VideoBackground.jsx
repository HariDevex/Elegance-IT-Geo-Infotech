import { useState, useEffect } from "react";

const VideoBackground = () => {
  const [videoSrc, setVideoSrc] = useState(null);

  useEffect(() => {
    import("../assets/Logo/galvid_bg_vid.mp4").then((module) => {
      setVideoSrc(module.default);
    });
  }, []);

  if (!videoSrc) return null;

  return (
    <video
      autoPlay
      loop
      muted
      playsInline
      className="absolute inset-0 w-full h-full object-cover"
    >
      <source src={videoSrc} type="video/mp4" />
    </video>
  );
};

export default VideoBackground;
