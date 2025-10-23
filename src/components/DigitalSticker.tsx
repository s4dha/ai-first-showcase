
import React from 'react';

interface DigitalStickerProps {
  count: number;
}

const DigitalSticker: React.FC<DigitalStickerProps> = ({ count }) => {
  return (
    <div className="flex flex-col items-center justify-center space-y-2">
      <div className="relative w-40 h-40">
        <div className="absolute inset-0 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-full animate-pulse blur-lg"></div>
        <div className="relative w-full h-full flex items-center justify-center bg-gray-800 rounded-full border-4 border-gray-700">
          <div className="text-center">
            <p className="text-5xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-purple-400 to-indigo-300">
              {count}
            </p>
            <p className="text-sm text-gray-400 tracking-wider uppercase">
              Booths Visits
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default DigitalSticker;
