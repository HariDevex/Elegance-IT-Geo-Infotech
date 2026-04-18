import React, { useState, useEffect } from "react";

const VideoBackground = () => {
  const [videoSrc, setVideoSrc] = useState(null);
  const [error, setError] = useState(false);

  useEffect(() => {
    import("../assets/Logo/galvid_bg_vid.mp4")
      .then((module) => {
        setVideoSrc(module.default);
      })
      .catch(() => {
        setError(true);
      });
  }, []);

  if (error || !videoSrc) {
    return (
      <div className="absolute inset-0 bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900" />
    );
  }

  return (
    <video
      autoPlay
      loop
      muted
      playsInline
      className="absolute inset-0 w-full h-full object-cover"
      onError={() => setError(true)}
    >
      <source src={videoSrc} type="video/mp4" />
    </video>
  );
};

export default VideoBackground;
