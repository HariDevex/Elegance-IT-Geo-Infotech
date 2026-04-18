import React from "react";

const VideoBackground = () => {
  return (
    <div 
      className="absolute inset-0 bg-cover bg-center bg-no-repeat"
      style={{
        backgroundImage: `linear-gradient(to bottom, rgba(15, 23, 42, 0.85), rgba(15, 23, 42, 0.75)), url('https://images.unsplash.com/photo-1451187580459-43490279c0fa?w=1920&q=80')`,
        backgroundAttachment: 'fixed'
      }}
    />
  );
};

export default VideoBackground;
