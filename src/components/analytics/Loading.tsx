
import React from 'react';

const Loading: React.FC = () => {
  return (
    <div className="flex items-center justify-center h-64">
      <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-[#9b87f5]"></div>
    </div>
  );
};

export default Loading;
