import React from 'react';

// Football field background component
const FieldBackground = () => (
  <div className="absolute top-0 left-0 w-full h-48 bg-green-700 overflow-hidden">
    <div className="relative w-full h-full">
      <div className="absolute inset-0 flex justify-between px-4">
        {[...Array(11)].map((_, i) => (
          <div key={i} className="h-full w-1 bg-white opacity-40" />
        ))}
      </div>
      <div className="absolute left-1/2 top-0 h-full w-2 bg-white opacity-60" />
    </div>
  </div>
);

export default function GuessTheLines() {
  return (
    <div className="relative overflow-hidden">
      <FieldBackground />
      <div className="relative z-10 max-w-4xl mx-auto px-4 pt-12 pb-16 text-center">
        <h1 className="text-6xl md:text-7xl font-extrabold text-white mb-6 drop-shadow-lg">
          Guess The Lines
        </h1>
        <p className="text-2xl md:text-3xl text-white font-medium max-w-2xl mx-auto leading-relaxed tracking-wide">
          The Easiest Way to Play Along With Bill and Sal
        </p>
      </div>
    </div>
  );
}