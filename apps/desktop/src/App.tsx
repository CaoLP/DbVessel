import { useState } from 'react';
import { Sidebar } from './components/Sidebar';
import { ConnectionModal } from './components/ConnectionModal';

function App() {
  const [isModalOpen, setIsModalOpen] = useState(false);

  return (
    <div className="flex h-screen w-screen bg-space-bg text-white">
      <Sidebar onOpenAddModal={() => setIsModalOpen(true)} />
      <div className="flex-1 flex flex-col justify-center items-center">
        <p className="text-gray-400">Chọn hoặc thêm kết nối từ thanh bên để bắt đầu thao tác.</p>
      </div>
      <ConnectionModal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} />
    </div>
  );
}

export default App;
