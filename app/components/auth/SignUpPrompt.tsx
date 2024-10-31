"use client";

import React from 'react';

interface SignUpPromptProps {
  onClose: () => void;
  onSignUpClick: () => void;
}

export const SignUpPrompt: React.FC<SignUpPromptProps> = ({
  onClose,
  onSignUpClick
}) => {
  return (
    <div 
      className="fixed bottom-4 right-4 bg-white p-4 rounded-lg shadow-lg border-2 border-green-500 max-w-sm z-50 
        animate-in slide-in-from-bottom duration-300"
    >
      <div className="flex justify-between items-start">
        <div>
          <h3 className="font-bold text-lg mb-1">Track Your Picks Week Over Week</h3>
          <p className="text-gray-600 text-sm mb-3">
            Create a free account to save your prediction history and track your accuracy over time.
          </p>
          <button 
            onClick={onSignUpClick}
            className="bg-green-600 text-white px-4 py-2 rounded hover:bg-green-700 transition-colors"
          >
            Sign Up Free
          </button>
        </div>
        <button 
          onClick={onClose}
          className="text-gray-400 hover:text-gray-600 ml-2"
          aria-label="Close"
        >
          ×
        </button>
      </div>
    </div>
  );
};