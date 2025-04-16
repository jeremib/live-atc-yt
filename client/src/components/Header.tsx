import { FaHeadset, FaPlus } from 'react-icons/fa';

interface HeaderProps {
  isConnected: boolean;
  onAddStreamClick: () => void;
}

export function Header({ isConnected, onAddStreamClick }: HeaderProps) {
  return (
    <header className="bg-primary shadow-md">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
        <div className="flex justify-between items-center">
          <div className="flex items-center">
            <div className="flex items-center">
              <FaHeadset className="text-white text-2xl mr-3" />
              <h1 className="text-white text-xl font-semibold">LiveATC Stream Hub</h1>
            </div>
            <div className="ml-6 hidden md:flex items-center text-sm text-white/80">
              <span className={`mr-2 ${isConnected ? 'bg-green-500/20 text-green-500' : 'bg-red-500/20 text-red-500'} px-2 py-1 rounded-full flex items-center`}>
                <span className={`inline-block w-2 h-2 rounded-full mr-2 ${isConnected ? 'bg-green-500' : 'bg-red-500'}`}></span>
                <span>{isConnected ? 'Proxy Server Connected' : 'Proxy Server Disconnected'}</span>
              </span>
            </div>
          </div>
          <div>
            <button 
              onClick={onAddStreamClick}
              className="bg-white/10 hover:bg-white/20 transition text-white px-4 py-2 rounded-md flex items-center"
            >
              <FaPlus className="mr-2" />
              <span>Add Stream</span>
            </button>
          </div>
        </div>
      </div>
    </header>
  );
}
